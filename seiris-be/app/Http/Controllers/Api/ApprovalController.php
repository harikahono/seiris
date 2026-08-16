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
use App\Models\Project;
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

        // Gate: hanya project_members yang bisa vote kontribusi di project
        if ($contribution->project_id) {
            $inProject = DB::table('project_members')
                ->where('project_id', $contribution->project_id)
                ->where('team_member_id', $voter->id)->exists();
            if (!$inProject) {
                return response()->json([
                    'message' => 'Kamu bukan member project ini. Hanya anggota project yang bisa vote kontribusi di project ini.',
                ], 403);
            }
        }

        // Hanya kontribusi PENDING yang bisa di-vote
        if (!$contribution->isPending()) {
            return response()->json([
                'message' => 'Kontribusi ini sudah ' . strtolower($contribution->status) . '.',
            ], 409);
        }

        // C2: pie beku (tim atau project) gak bisa di-vote lagi
        if ($team->is_frozen) {
            return response()->json([
                'message' => 'Equity tim sudah dibekukan (frozen), tidak bisa vote.',
            ], 409);
        }
        if ($contribution->project_id) {
            $project = Project::find($contribution->project_id);
            if ($project && $project->is_frozen) {
                return response()->json([
                    'message' => 'Equity project sudah dibekukan (frozen), tidak bisa vote.',
                ], 409);
            }
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
                projectId:   $contribution->project_id,
            );

            // Cek apakah threshold terpenuhi (dengan lock internal)
            $this->checkAndUpdateStatus($contribution, $team, $request);

            return $contribution->fresh()->load(['member.user', 'approvals.member.user']);
        });

        // Broadcast per-vote (real-time vote count update di detail page)
        // Fire-and-forget: kalau Pusher down, API tetep return sukses
        try {
            broadcast(new TeamUpdated(
                team: $team,
                action: 'vote.cast',
                userName: $request->user()->name ?? '',
                contributionDesc: $result->description ?? '',
                contributionOwnerName: $result->member->user->name ?? '',
            ))->toOthers();
        } catch (\Throwable $e) {
            Log::warning('[ApprovalController] Per-vote broadcast failed: ' . $e->getMessage());
        }

        // Broadcast equity update SETELAH transaksi commit — data udah aman di DB
        if ($result->status === 'APPROVED') {
            try {
                $snapshot = EquitySnapshot::where('team_id', $team->id)
                    ->when($contribution->project_id, fn($q) => $q->where('project_id', $contribution->project_id))
                    ->when(!$contribution->project_id, fn($q) => $q->whereNull('project_id'))
                    ->latest()
                    ->first();

                if ($snapshot) {
                    broadcast(new EquityUpdated(
                        $team,
                        $snapshot,
                        approvedByName: $voter->user->name ?? '',
                        contributionDescription: $contribution->description ?? '',
                        contributionOwnerName: $contribution->member->user->name ?? '',
                    ))->toOthers();
                }
            } catch (\Throwable $e) {
                Log::warning('[ApprovalController] Broadcast failed: ' . $e->getMessage());
            }
        } elseif ($result->status === 'REJECTED') {
            broadcast(new TeamUpdated(
                $team,
                'contribution.rejected',
                $voter->user->name ?? '',
                $contribution->description ?? '',
                contributionOwnerName: $contribution->member->user->name ?? '',
            ))->toOthers();
        }

        return response()->json([
            'message' => 'Vote berhasil dicatat.',
            'data'    => new ContributionResource($result),
        ]);
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

        // Tentukan scope: project atau tim (untuk recalculate)
        $project = $contribution->project_id ? Project::find($contribution->project_id) : null;

        // Total voter: project-scoped (project_members) atau team-wide (activeMembers)
        $totalVoters = $project
            ? DB::table('project_members')
                ->where('project_id', $project->id)
                ->where('team_member_id', '!=', $contribution->member_id)
                ->count()
            : $team->activeMembers()
                ->where('id', '!=', $contribution->member_id)
                ->count();

        $approvals = $contribution->approvals;
        $approveCount = $approvals->where('vote', 'APPROVE')->count();
        $rejectCount  = $approvals->where('vote', 'REJECT')->count();

        $threshold = (int) $team->approval_threshold; // 50 (50+1), 75 (deprecated), atau 100 (bulat)
        $approvePct = ($approveCount / $totalVoters) * 100;
        $rejectPct  = ($rejectCount / $totalVoters) * 100;

        // 50+1 = strict majority (>50%). ≥75/100 = supermajority/unanimous (≥threshold)
        $approved = $threshold === 50 ? $approvePct > 50 : $approvePct >= $threshold;
        $rejected = $threshold === 50 ? $rejectPct > 50 : $rejectPct > (100 - $threshold);

        // Cek kondisi APPROVED
        if ($approved) {
            $contribution->update(['status' => 'APPROVED']);

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'contribution.approved',
                subjectType: Contribution::class,
                subjectId:   $contribution->id,
                payload:     ['approve_count' => $approveCount, 'total_voters' => $totalVoters],
                projectId:   $contribution->project_id,
            );

            // Trigger SlicingPie recalculation (scope: project atau tim)
            $this->slicingPie->recalculate($team, $contribution->id, $project);

        // Cek kondisi REJECTED
        } elseif ($rejected) {
            $contribution->update(['status' => 'REJECTED']);

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'contribution.rejected',
                subjectType: Contribution::class,
                subjectId:   $contribution->id,
                payload:     ['reject_count' => $rejectCount, 'total_voters' => $totalVoters],
                projectId:   $contribution->project_id,
            );

        // Cek kondisi TIE (Seri) - Tie-Breaker Mechanism
        // H2: hanya selesaikan seri kalau SUDAH SEMUA eligible voter vote,
        //     biar voter tersisa gak ke-lock dari break tie-nya.
        } elseif ($approveCount === $rejectCount && $approveCount > 0
            && ($approveCount + $rejectCount) === $totalVoters) {
            $this->handleTieBreaker($contribution, $team, $request, $approveCount, $rejectCount, $project);
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
    private function handleTieBreaker(Contribution $contribution, $team, Request $request, int $approveCount, int $rejectCount, $project = null): void
    {
        // Scope tie-breaker: project-scoped → cuma dari project_members
        $scope = $project
            ? DB::table('project_members')->where('project_id', $project->id)->pluck('team_member_id')
            : null;
        $pmIds = $scope ? $scope->toArray() : null;

        // Cari team owner (dalam scope kalau project-scoped)
        $ownerMember = TeamMember::where('team_id', $team->id)
            ->where('user_id', $team->owner_id)
            ->when($pmIds, fn($q) => $q->whereIn('id', $pmIds))
            ->first();

        // Jika owner adalah pembuat kontribusi, cari member dengan tenure terlama
        if (!$ownerMember || $ownerMember->id === $contribution->member_id) {
            // Fallback: member dengan created_at paling awal (tenure terlama) — dalam scope
            $tieBreaker = TeamMember::where('team_id', $team->id)
                ->where('id', '!=', $contribution->member_id)
                ->where('status', 'active')
                ->when($pmIds, fn($q) => $q->whereIn('id', $pmIds))
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

            // Jika approved, trigger recalculation dengan lock (scope: project atau tim)
            if ($finalStatus === 'APPROVED') {
                $this->slicingPie->recalculate($team, $contribution->id, $project);
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