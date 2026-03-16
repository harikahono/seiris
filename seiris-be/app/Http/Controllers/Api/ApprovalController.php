<?php
// ============================================================
// app/Http/Controllers/Api/ApprovalController.php
// ============================================================
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Contribution\StoreVoteRequest;
use App\Http\Resources\ContributionResource;
use App\Models\Contribution;
use App\Models\ContributionApproval;
use App\Models\TeamMember;
use App\Services\AuditLogService;
use App\Services\SlicingPieService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
                action:      'contribution.voted',
                subjectType: Contribution::class,
                subjectId:   $contribution->id,
                payload:     ['vote' => $request->vote, 'voter_id' => $voter->id],
            );

            // Cek apakah threshold terpenuhi
            $this->checkAndUpdateStatus($contribution, $team);

            return $contribution->fresh()->load(['member.user', 'approvals.member.user']);
        });

        return response()->json([
            'message' => 'Vote berhasil dicatat.',
            'data'    => new ContributionResource($result),
        ]);
    }

    /**
     * Cek apakah vote sudah memenuhi threshold.
     * Jika approve >= threshold → APPROVED → recalculate equity
     * Jika reject >= (100 - threshold) → REJECTED
     */
    private function checkAndUpdateStatus(Contribution $contribution, $team): void
    {
        $contribution->refresh();

        // Total member aktif selain pembuat kontribusi
        $totalVoters = $team->activeMembers()
            ->where('id', '!=', $contribution->member_id)
            ->count();

        if ($totalVoters === 0) {
            // Hanya ada 1 anggota di tim — auto approve
            $contribution->update(['status' => 'APPROVED']);
            $this->slicingPie->recalculate($team, $contribution->id);
            return;
        }

        $approvals = $contribution->approvals;
        $approveCount = $approvals->where('vote', 'APPROVE')->count();
        $rejectCount  = $approvals->where('vote', 'REJECT')->count();

        $threshold = (int) $team->approval_threshold; // 50, 75, atau 100
        $approvePct = ($approveCount / $totalVoters) * 100;
        $rejectPct  = ($rejectCount / $totalVoters) * 100;

        if ($approvePct >= $threshold) {
            $contribution->update(['status' => 'APPROVED']);

            AuditLogService::log(
                teamId:      $team->id,
                action:      'contribution.approved',
                subjectType: Contribution::class,
                subjectId:   $contribution->id,
                payload:     ['approve_count' => $approveCount, 'total_voters' => $totalVoters],
            );

            // Trigger SlicingPie recalculation
            $this->slicingPie->recalculate($team, $contribution->id);

        } elseif ($rejectPct > (100 - $threshold)) {
            $contribution->update(['status' => 'REJECTED']);

            AuditLogService::log(
                teamId:      $team->id,
                action:      'contribution.rejected',
                subjectType: Contribution::class,
                subjectId:   $contribution->id,
                payload:     ['reject_count' => $rejectCount, 'total_voters' => $totalVoters],
            );
        }
    }
}