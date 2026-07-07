<?php

namespace App\Http\Controllers\Api;

use App\Events\TeamUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\FmrProposal\StoreFmrProposalRequest;
use App\Http\Resources\FmrProposalResource;
use App\Models\FmrProposal;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class FmrProposalController extends Controller
{
    /**
     * POST /api/teams/{team}/fmr-proposals
     * Member mengusulkan FMR untuk dirinya sendiri.
     */
    public function store(StoreFmrProposalRequest $request, Team $team): JsonResponse
    {
        // Cek team tidak frozen
        if ($team->is_frozen) {
            return response()->json([
                'message' => 'Tim sudah di-freeze, tidak bisa mengajukan proposal FMR.',
            ], 403);
        }

        $member = $request->teamMember;

        // Cek apakah member sudah punya proposal PENDING
        $pendingExists = FmrProposal::where('team_id', $team->id)
            ->where('member_id', $member->id)
            ->where('status', 'PENDING')
            ->exists();

        if ($pendingExists) {
            return response()->json([
                'message' => 'Kamu sudah memiliki proposal FMR yang menunggu persetujuan owner.',
            ], 409);
        }

        $proposal = DB::transaction(function () use ($request, $team, $member) {
            $proposal = FmrProposal::create([
                'team_id'      => $team->id,
                'member_id'    => $member->id,
                'proposed_fmr' => $request->proposed_fmr,
                'status'       => 'PENDING',
            ]);

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'fmr.proposed',
                subjectType: FmrProposal::class,
                subjectId:   $proposal->id,
                payload:     [
                    'proposed_fmr' => $request->proposed_fmr,
                    'member_id'    => $member->id,
                ],
            );

            return $proposal;
        });

        broadcast(new TeamUpdated($team, 'fmr.proposed', $request->user()->name))->toOthers();

        return response()->json([
            'message' => 'Proposal FMR berhasil diajukan. Menunggu persetujuan owner.',
            'data'    => new FmrProposalResource($proposal->load(['member.user'])),
        ], 201);
    }

    /**
     * GET /api/teams/{team}/fmr-proposals
     * Lihat daftar proposal FMR.
     * Owner lihat semua, member lihat proposal miliknya sendiri.
     */
    public function index(Request $request, Team $team): JsonResponse
    {
        $query = FmrProposal::where('team_id', $team->id)
            ->with(['member.user', 'reviewer']);

        // Filter berdasarkan status
        if ($request->filled('filter')) {
            $query->where('status', strtoupper($request->filter));
        }

        // Member biasa hanya lihat proposal sendiri
        $member = $request->teamMember;
        if ($member->role !== 'owner') {
            $query->where('member_id', $member->id);
        }

        $proposals = $query->orderByDesc('created_at')->paginate(6);

        return response()->json([
            'data' => FmrProposalResource::collection($proposals),
            'meta' => [
                'current_page' => $proposals->currentPage(),
                'last_page'    => $proposals->lastPage(),
                'total'        => $proposals->total(),
            ],
        ]);
    }

    /**
     * POST /api/fmr-proposals/{proposal}/approve
     * Owner menyetujui proposal FMR.
     */
    public function approve(Request $request, FmrProposal $proposal): JsonResponse
    {
        $team = $proposal->team;
        Gate::authorize('update', $team);

        if (!$proposal->isPending()) {
            return response()->json([
                'message' => 'Proposal ini sudah ' . strtolower($proposal->status) . '.',
            ], 409);
        }

        $result = DB::transaction(function () use ($request, $proposal, $team) {
            // Lock proposal row
            $locked = FmrProposal::where('id', $proposal->id)
                ->lockForUpdate()
                ->first();

            // Lock member row untuk update FMR
            $member = TeamMember::where('id', $locked->member_id)
                ->lockForUpdate()
                ->first();

            $oldFmr = $member->fmr;

            // Update proposal
            $locked->update([
                'status'      => 'APPROVED',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            // Update FMR member
            $member->update(['fmr' => $locked->proposed_fmr]);

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'fmr.approved',
                subjectType: FmrProposal::class,
                subjectId:   $locked->id,
                payload:     [
                    'proposed_fmr' => $locked->proposed_fmr,
                    'old_fmr'      => $oldFmr,
                    'new_fmr'      => $member->fmr,
                    'member_id'    => $member->id,
                ],
            );

            return $locked->fresh()->load(['member.user', 'reviewer']);
        });

        broadcast(new TeamUpdated($team, 'fmr.approved', $request->user()->name))->toOthers();

        return response()->json([
            'message' => 'Proposal FMR disetujui. FMR anggota berhasil diperbarui.',
            'data'    => new FmrProposalResource($result),
        ]);
    }

    /**
     * POST /api/fmr-proposals/{proposal}/reject
     * Owner menolak proposal FMR.
     */
    public function reject(Request $request, FmrProposal $proposal): JsonResponse
    {
        $team = $proposal->team;
        Gate::authorize('update', $team);

        if (!$proposal->isPending()) {
            return response()->json([
                'message' => 'Proposal ini sudah ' . strtolower($proposal->status) . '.',
            ], 409);
        }

        DB::transaction(function () use ($request, $proposal, $team) {
            $proposal->update([
                'status'      => 'REJECTED',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'fmr.rejected',
                subjectType: FmrProposal::class,
                subjectId:   $proposal->id,
                payload:     [
                    'proposed_fmr' => $proposal->proposed_fmr,
                    'member_id'    => $proposal->member_id,
                ],
            );
        });

        broadcast(new TeamUpdated($team, 'fmr.rejected', $request->user()->name))->toOthers();

        return response()->json([
            'message' => 'Proposal FMR ditolak.',
            'data'    => new FmrProposalResource($proposal->fresh()->load(['member.user', 'reviewer'])),
        ]);
    }
}
