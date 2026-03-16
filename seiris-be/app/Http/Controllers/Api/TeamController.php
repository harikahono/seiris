<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Team\JoinTeamRequest;
use App\Http\Requests\Team\StoreTeamRequest;
use App\Http\Requests\Team\UpdateFmrRequest;
use App\Http\Resources\TeamMemberResource;
use App\Http\Resources\TeamResource;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\AuditLogService;
use App\Services\SlicingPieService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TeamController extends Controller
{
    public function __construct(private SlicingPieService $slicingPie) {}

    /**
     * GET /api/teams
     * List semua tim yang user ikuti
     */
    public function index(Request $request): JsonResponse
    {
        $teams = Team::whereHas('members', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id)
                  ->where('status', 'active');
            })
            ->with(['members.user', 'owner'])
            ->get();

        return response()->json([
            'data' => TeamResource::collection($teams),
        ]);
    }

    /**
     * POST /api/teams
     * Buat tim baru, user otomatis jadi owner
     */
    public function store(StoreTeamRequest $request): JsonResponse
    {
        $team = DB::transaction(function () use ($request) {
            $team = Team::create([
                'owner_id'           => $request->user()->id,
                'name'               => $request->name,
                'description'        => $request->description,
                'invite_code'        => strtoupper(Str::random(8)),
                'approval_threshold' => $request->approval_threshold ?? '75',
                'is_frozen'          => false,
            ]);

            // Owner otomatis jadi member dengan role owner
            TeamMember::create([
                'team_id' => $team->id,
                'user_id' => $request->user()->id,
                'role'    => 'owner',
                'fmr'     => $request->fmr ?? 0,
                'status'  => 'active',
            ]);

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'team.created',
                subjectType: Team::class,
                subjectId:   $team->id,
                payload:     ['name' => $team->name],
            );

            return $team;
        });

        return response()->json([
            'message' => 'Tim berhasil dibuat.',
            'data'    => new TeamResource($team->load(['members.user', 'owner'])),
        ], 201);
    }

    /**
     * GET /api/teams/{team}
     * Detail tim — hanya member aktif yang bisa akses
     */
    public function show(Request $request, Team $team): JsonResponse
    {
        $this->authorizeMember($request, $team);

        return response()->json([
            'data' => new TeamResource($team->load(['members.user', 'owner'])),
        ]);
    }

    /**
     * PUT /api/teams/{team}
     * Update nama/deskripsi tim — hanya owner
     */
    public function update(StoreTeamRequest $request, Team $team): JsonResponse
    {
        $this->authorizeOwner($request, $team);

        $team->update([
            'name'               => $request->name,
            'description'        => $request->description,
            'approval_threshold' => $request->approval_threshold ?? $team->approval_threshold,
        ]);

        AuditLogService::logFromRequest(
            request:     $request,
            teamId:      $team->id,
            action:      'team.updated',
            subjectType: Team::class,
            subjectId:   $team->id,
            payload:     $request->only(['name', 'description', 'approval_threshold']),
        );

        return response()->json([
            'message' => 'Tim berhasil diperbarui.',
            'data'    => new TeamResource($team->fresh()->load(['members.user', 'owner'])),
        ]);
    }

    /**
     * POST /api/teams/join
     * Join tim via kode undangan 8 karakter
     */
    public function join(JoinTeamRequest $request): JsonResponse
    {
        $team = Team::where('invite_code', strtoupper($request->invite_code))->first();

        if (!$team) {
            return response()->json(['message' => 'Kode undangan tidak valid.'], 404);
        }

        if ($team->is_frozen) {
            return response()->json(['message' => 'Tim sudah di-freeze, tidak bisa menerima anggota baru.'], 403);
        }

        // Cek sudah member atau belum
        $existing = TeamMember::where('team_id', $team->id)
            ->where('user_id', $request->user()->id)
            ->first();

        if ($existing) {
            if ($existing->status === 'active') {
                return response()->json(['message' => 'Kamu sudah tergabung di tim ini.'], 409);
            }
            // Kalau pernah exit, tidak bisa join lagi
            return response()->json(['message' => 'Kamu sudah pernah keluar dari tim ini.'], 403);
        }

        $member = DB::transaction(function () use ($request, $team) {
            $member = TeamMember::create([
                'team_id' => $team->id,
                'user_id' => $request->user()->id,
                'role'    => 'member',
                'fmr'     => 0,
                'status'  => 'active',
            ]);

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'member.joined',
                subjectType: TeamMember::class,
                subjectId:   $member->id,
                payload:     ['user_id' => $request->user()->id],
            );

            return $member;
        });

        return response()->json([
            'message' => 'Berhasil bergabung ke tim.',
            'data'    => new TeamMemberResource($member->load('user')),
        ], 201);
    }

    /**
     * PUT /api/teams/{team}/members/{member}/fmr
     * Set FMR anggota — hanya owner
     */
    public function updateFmr(UpdateFmrRequest $request, Team $team, TeamMember $member): JsonResponse
    {
        $this->authorizeOwner($request, $team);

        // Pastikan member ini memang ada di tim ini
        if ($member->team_id !== $team->id) {
            return response()->json(['message' => 'Anggota tidak ditemukan di tim ini.'], 404);
        }

        if ($member->status !== 'active') {
            return response()->json(['message' => 'Anggota sudah tidak aktif.'], 403);
        }

        $oldFmr = $member->fmr;
        $member->update(['fmr' => $request->fmr]);

        AuditLogService::logFromRequest(
            request:     $request,
            teamId:      $team->id,
            action:      'member.fmr_updated',
            subjectType: TeamMember::class,
            subjectId:   $member->id,
            payload:     ['old_fmr' => $oldFmr, 'new_fmr' => $request->fmr],
        );

        return response()->json([
            'message' => 'FMR berhasil diperbarui.',
            'data'    => new TeamMemberResource($member->fresh()->load('user')),
        ]);
    }

    /**
     * POST /api/teams/{team}/freeze
     * Freeze equity — hanya owner
     */
    public function freeze(Request $request, Team $team): JsonResponse
    {
        $this->authorizeOwner($request, $team);

        if ($team->is_frozen) {
            return response()->json(['message' => 'Tim sudah di-freeze sebelumnya.'], 409);
        }

        try {
            $snapshot = $this->slicingPie->freeze($team);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        AuditLogService::logFromRequest(
            request:     $request,
            teamId:      $team->id,
            action:      'equity.frozen',
            subjectType: Team::class,
            subjectId:   $team->id,
            payload:     ['snapshot_id' => $snapshot->id],
        );

        return response()->json([
            'message' => 'Equity tim berhasil di-freeze.',
            'data'    => new TeamResource($team->fresh()->load(['members.user', 'owner'])),
        ]);
    }

    /**
     * POST /api/teams/{team}/members/{member}/exit
     * Keluarkan anggota — hanya owner
     */
    public function exitMember(Request $request, Team $team, TeamMember $member): JsonResponse
    {
        $this->authorizeOwner($request, $team);

        if ($member->team_id !== $team->id) {
            return response()->json(['message' => 'Anggota tidak ditemukan di tim ini.'], 404);
        }

        if ($member->role === 'owner') {
            return response()->json(['message' => 'Owner tidak bisa dikeluarkan dari tim.'], 403);
        }

        if ($member->status === 'exited') {
            return response()->json(['message' => 'Anggota sudah keluar sebelumnya.'], 409);
        }

        DB::transaction(function () use ($request, $team, $member) {
            $member->update([
                'status'    => 'exited',
                'exited_at' => now(),
            ]);

            // Bug 3 fix — auto-reject semua kontribusi PENDING milik member yang exit
            $pendingCount = $member->contributions()
                ->where('status', 'PENDING')
                ->count();

            if ($pendingCount > 0) {
                $member->contributions()
                    ->where('status', 'PENDING')
                    ->update(['status' => 'REJECTED']);

                AuditLogService::logFromRequest(
                    request:     $request,
                    teamId:      $team->id,
                    action:      'contribution.auto_rejected',
                    subjectType: TeamMember::class,
                    subjectId:   $member->id,
                    payload:     [
                        'reason'         => 'member_exited',
                        'rejected_count' => $pendingCount,
                    ],
                );
            }

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'member.exited',
                subjectType: TeamMember::class,
                subjectId:   $member->id,
                payload:     ['user_id' => $member->user_id],
            );
        });

        return response()->json([
            'message' => 'Anggota berhasil dikeluarkan dari tim.',
        ]);
    }

    // ── Private Helpers ───────────────────────────────────────

    private function authorizeMember(Request $request, Team $team): void
    {
        $isMember = $team->members()
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->exists();

        if (!$isMember) {
            abort(403, 'Kamu bukan anggota tim ini.');
        }
    }

    private function authorizeOwner(Request $request, Team $team): void
    {
        $isOwner = $team->members()
            ->where('user_id', $request->user()->id)
            ->where('role', 'owner')
            ->where('status', 'active')
            ->exists();

        if (!$isOwner) {
            abort(403, 'Hanya owner yang bisa melakukan aksi ini.');
        }
    }
}