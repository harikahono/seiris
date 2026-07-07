<?php
// ============================================================
// app/Http/Controllers/Api/ApprovalController.php
// ============================================================
namespace App\Http\Controllers\Api;

use App\Events\EquityUpdated;
use App\Events\TeamUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Contribution\StoreVoteRequest;
use App\Http\Resources\ContributionResource;
use App\Models\Contribution;
use App\Models\ContributionApproval;
use App\Models\EquitySnapshot;
use App\Models\Revenue;
use App\Models\TeamMember;
use App\Services\AuditLogService;
use App\Services\SlicingPieService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ApprovalController extends Controller
{
    public function __construct(private SlicingPieService $slicingPie) {}

    /**
     * POST /api/contributions/{contribution}/vote
     * Vote APPROVE atau REJECT pada kontribusi PENDING
     */
    public function vote(StoreVoteRequest $request, Contribution $contribution): JsonResponse
    {
        // Load team untuk authorization
        $team = $contribution->team;

        // Ambil member record voter
        $voter = TeamMember::where('team_id', $team->id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->first();

        if (!$voter) {
            return response()->json(['message' => 'Kamu bukan anggota tim ini.'], 403);
        }

        // Pembuat kontribusi tidak bisa vote kontribusinya sendiri
        if ($contribution->member_id === $voter->id) {
            return response()->json([
                'message' => 'Kamu tidak bisa vote kontribusimu sendiri.',
            ], 403);
        }

        // Hanya kontribusi PENDING yang bisa di-vote
        if (!$contribution->isPending()) {
            return response()->json([
                'message' => 'Kontribusi ini sudah ' . strtolower($contribution->status) . '.',
            ], 409);
        }

        // Cek sudah vote atau belum
        $alreadyVoted = ContributionApproval::where('contribution_id', $contribution->id)
            ->where('member_id', $voter->id)
            ->exists();

        if ($alreadyVoted) {
            return response()->json(['message' => 'Kamu sudah memberikan vote untuk kontribusi ini.'], 409);
        }

        $result = DB::transaction(function () use ($request, $contribution, $voter, $team) {
            // LOCK: Ambil data tim dengan row-level lock untuk mencegah race condition
            // saat multiple vote masuk bersamaan untuk tim yang sama
            $lockedTeam = DB::table('teams')
                ->where('id', $team->id)
                ->lockForUpdate()
                ->first();
            
            if (!$lockedTeam) {
                throw new \RuntimeException('Tim tidak ditemukan saat proses voting.');
            }

            // Simpan vote
            ContributionApproval::create([
                'contribution_id' => $contribution->id,
                'member_id'       => $voter->id,
                'vote'            => $request->vote,
                'note'            => $request->note,
            ]);

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'vote.cast',
                subjectType: Contribution::class,
                subjectId:   $contribution->id,
                payload:     ['vote' => $request->vote, 'voter_id' => $voter->id],
            );

            // Cek apakah threshold terpenuhi (dengan lock internal)
            $this->checkAndUpdateStatus($contribution, $team, $request);

            return $contribution->fresh()->load(['member.user', 'approvals.member.user']);
        });

        // Broadcast equity update SETELAH transaksi commit — data udah aman di DB
        if ($result->status === 'APPROVED') {
            try {
                $snapshot = EquitySnapshot::where('team_id', $team->id)
                    ->latest()
                    ->first();

                if ($snapshot) {
                    broadcast(new EquityUpdated(
                        $team,
                        $snapshot,
                        approvedByName: $voter->user->name,
                        contributionDescription: $contribution->description,
                    ))->toOthers();
                }
            } catch (\Throwable $e) {
                Log::warning('[ApprovalController] Broadcast failed: ' . $e->getMessage());
            }
        } elseif ($result->status === 'REJECTED') {
            broadcast(new TeamUpdated(
                $team,
                'contribution.rejected',
                $voter->user->name,
                $contribution->description,
            ))->toOthers();
        }

        return response()->json([
            'message' => 'Vote berhasil dicatat.',
            'data'    => new ContributionResource($result),
        ]);
    }

    /**
     * Auto-create Revenue record jika kontribusi type REVENUE disetujui.
     */
    private function autoCreateRevenue(Contribution $contribution): void
    {
        if ($contribution->type !== 'REVENUE') return;

        Revenue::create([
            'team_id'              => $contribution->team_id,
            'recorded_by'          => $contribution->member_id,
            'description'          => $contribution->description,
            'amount'               => $contribution->actual_amount ?? 0,
            'distributable_amount' => $contribution->value,
            'proof_path'           => $contribution->invoice_path,
            'revenue_date'         => $contribution->contribution_date,
            'is_distributed'       => false,
        ]);

        $contributorName = $contribution->member?->user?->name ?? 'Anggota';
        broadcast(new TeamUpdated(
            $contribution->team,
            'revenue.created',
            $contributorName,
        ))->toOthers();
    }

    /**
     * Cek apakah vote sudah memenuhi threshold.
     * Jika approve >= threshold → APPROVED → recalculate equity
     * Jika reject >= (100 - threshold) → REJECTED
     * Jika seri (tie) → gunakan Tie-Breaker mechanism
     * 
     * PENTING: Fungsi ini harus dipanggil dalam transaksi database yang sudah memiliki lock
     */
    private function checkAndUpdateStatus(Contribution $contribution, $team, Request $request): void
    {
        // Refresh data dengan lock untuk memastikan kita membaca data terbaru
        $contribution = Contribution::where('id', $contribution->id)
            ->lockForUpdate()
            ->first();
            
        if (!$contribution) {
            throw new \RuntimeException('Kontribusi tidak ditemukan saat proses update status.');
        }

        // Guard: kalo status udah bukan PENDING, berarti udah diproses transaksi lain
        if ($contribution->status !== 'PENDING') {
            return;
        }

        // Total member aktif selain pembuat kontribusi
        $totalVoters = $team->activeMembers()
            ->where('id', '!=', $contribution->member_id)
            ->count();

        if ($totalVoters === 0) {
            // Hanya ada 1 anggota di tim — auto approve
            $contribution->update(['status' => 'APPROVED']);
            $this->slicingPie->recalculate($team, $contribution->id);
            $this->autoCreateRevenue($contribution);
            return;
        }

        $approvals = $contribution->approvals;
        $approveCount = $approvals->where('vote', 'APPROVE')->count();
        $rejectCount  = $approvals->where('vote', 'REJECT')->count();

        $threshold = (int) $team->approval_threshold; // 50, 75, atau 100
        $approvePct = ($approveCount / $totalVoters) * 100;
        $rejectPct  = ($rejectCount / $totalVoters) * 100;

        // Cek kondisi APPROVED
        if ($approvePct >= $threshold) {
            $contribution->update(['status' => 'APPROVED']);

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'contribution.approved',
                subjectType: Contribution::class,
                subjectId:   $contribution->id,
                payload:     ['approve_count' => $approveCount, 'total_voters' => $totalVoters],
            );

            // Trigger SlicingPie recalculation
            $this->slicingPie->recalculate($team, $contribution->id);

            // Auto-create Revenue record jika type REVENUE
            $this->autoCreateRevenue($contribution);

        // Cek kondisi REJECTED
        } elseif ($rejectPct > (100 - $threshold)) {
            $contribution->update(['status' => 'REJECTED']);

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'contribution.rejected',
                subjectType: Contribution::class,
                subjectId:   $contribution->id,
                payload:     ['reject_count' => $rejectCount, 'total_voters' => $totalVoters],
            );

        // Cek kondisi TIE (Seri) - Tie-Breaker Mechanism
        } elseif ($approveCount === $rejectCount && $approveCount > 0) {
            $this->handleTieBreaker($contribution, $team, $request, $approveCount, $rejectCount);
        }
    }

    /**
     * Handle Tie-Breaker ketika hasil voting seri.
     * Mekanisme: Team Owner memiliki casting vote (suara penentu).
     * 
     * PENTING: Fungsi ini dipanggil dalam transaksi yang sudah memiliki lock
     * 
     * @param Contribution $contribution
     * @param mixed $team
     * @param Request $request
     * @param int $approveCount
     * @param int $rejectCount
     * @return void
     */
    private function handleTieBreaker(Contribution $contribution, $team, Request $request, int $approveCount, int $rejectCount): void
    {
        // Cari team owner
        $ownerMember = TeamMember::where('team_id', $team->id)
            ->where('user_id', $team->owner_id)
            ->first();

        // Jika owner adalah pembuat kontribusi, cari member dengan tenure terlama
        if (!$ownerMember || $ownerMember->id === $contribution->member_id) {
            // Fallback: member dengan created_at paling awal (tenure terlama)
            $tieBreaker = TeamMember::where('team_id', $team->id)
                ->where('id', '!=', $contribution->member_id)
                ->where('status', 'active')
                ->orderBy('created_at', 'asc')
                ->first();
            
            $tieBreakerType = 'senior_member';
        } else {
            $tieBreaker = $ownerMember;
            $tieBreakerType = 'team_owner';
        }

        if (!$tieBreaker) {
            // Tidak ada tie-breaker yang valid, biarkan dalam status PENDING
            return;
        }

        // Cek apakah tie-breaker sudah memberikan vote
        $tieBreakerVote = ContributionApproval::where('contribution_id', $contribution->id)
            ->where('member_id', $tieBreaker->id)
            ->first();

        if ($tieBreakerVote) {
            // Tie-breaker sudah vote, gunakan suaranya sebagai keputusan final
            $finalStatus = $tieBreakerVote->vote === 'APPROVE' ? 'APPROVED' : 'REJECTED';
            $contribution->update(['status' => $finalStatus]);

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'contribution.tie_breaker_resolved',
                subjectType: Contribution::class,
                subjectId:   $contribution->id,
                payload:     [
                    'tie_breaker_type' => $tieBreakerType,
                    'tie_breaker_id'   => $tieBreaker->id,
                    'tie_breaker_user_id' => $tieBreaker->user_id,
                    'approve_count'    => $approveCount,
                    'reject_count'     => $rejectCount,
                    'final_decision'   => $finalStatus,
                    'reason'           => 'Tie-breaker vote digunakan sebagai keputusan final',
                ],
            );

            // Jika approved, trigger recalculation dengan lock
            if ($finalStatus === 'APPROVED') {
                $this->slicingPie->recalculate($team, $contribution->id);
                $this->autoCreateRevenue($contribution);
            }
        } else {
            // Tie-breaker belum vote, catat dalam audit bahwa perlu tie-breaker
            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'contribution.tie_detected',
                subjectType: Contribution::class,
                subjectId:   $contribution->id,
                payload:     [
                    'tie_breaker_type' => $tieBreakerType,
                    'tie_breaker_id'   => $tieBreaker->id,
                    'tie_breaker_user_id' => $tieBreaker->user_id,
                    'approve_count'    => $approveCount,
                    'reject_count'     => $rejectCount,
                    'reason'           => 'Hasil voting seri, menunggu casting vote dari tie-breaker',
                ],
            );
        }
    }
}