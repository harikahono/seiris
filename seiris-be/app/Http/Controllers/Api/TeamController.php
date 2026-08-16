<?php

namespace App\Http\Controllers\Api;

use App\Events\TeamUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Team\JoinTeamRequest;
use App\Http\Requests\Team\StoreTeamRequest;
use App\Http\Requests\Team\UpdateFmrRequest;
use App\Http\Resources\TeamMemberResource;
use App\Http\Resources\TeamResource;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\ProjectMember;
use App\Services\AuditLogService;
use App\Services\SlicingPieService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
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
                'approval_threshold' => $request->approval_threshold ?? '50',
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
                payload:     ['name' => $team->name, 'commission_rate' => $team->commission_rate],
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
        // authorizeMember sudah di-handle oleh middleware EnsureTeamMember

        $team->load(['members.user', 'owner']);

        // Optional: include per-project FMR untuk setiap member
        if ($request->project_id) {
            $project = $team->projects()->findOrFail($request->project_id);
            $projectFmrs = DB::table('project_members')
                ->where('project_id', $project->id)
                ->get(['team_member_id', 'fmr'])
                ->keyBy('team_member_id');

            $team->members->each(function ($member) use ($projectFmrs) {
                $member->project_fmr = $projectFmrs->get($member->id)?->fmr;
            });
        }

        return response()->json([
            'data' => new TeamResource($team),
        ]);
    }

    /**
     * PUT /api/teams/{team}
     * Update nama/deskripsi tim — hanya owner
     */
    public function update(StoreTeamRequest $request, Team $team): JsonResponse
    {
        Gate::authorize('update', $team);

        $team->update([
            'name'               => $request->name,
            'description'        => $request->description,
            'approval_threshold' => $request->approval_threshold ?? $team->approval_threshold,
            'commission_rate'    => $request->commission_rate ?? $team->commission_rate,
        ]);

        AuditLogService::logFromRequest(
            request:     $request,
            teamId:      $team->id,
            action:      'team.updated',
            subjectType: Team::class,
            subjectId:   $team->id,
            payload:     $request->only(['name', 'description', 'approval_threshold', 'commission_rate']),
        );

        broadcast(new TeamUpdated($team, 'team.updated', $request->user()->name ?? ''))->toOthers();

        return response()->json([
            'message' => 'Tim berhasil diperbarui.',
            'data'    => new TeamResource($team->fresh()->load(['members.user', 'owner'])),
        ]);
    }

    /**
     * POST /api/teams/{team}/logo
     * Upload/foto profil tim — hanya owner
     */
    public function uploadLogo(Request $request, Team $team): JsonResponse
    {
        Gate::authorize('update', $team);

        $request->validate([
            'logo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        // Hapus logo lama kalo ada
        if ($team->logo_path) {
            Storage::disk('public')->delete($team->logo_path);
        }

        $path = $request->file('logo')->store('team-logos', 'public');

        $team->update(['logo_path' => $path]);

        AuditLogService::logFromRequest(
            request:     $request,
            teamId:      $team->id,
            action:      'team.logo_updated',
            subjectType: Team::class,
            subjectId:   $team->id,
            payload:     [],
        );

        broadcast(new TeamUpdated($team, 'team.logo_updated', $request->user()->name ?? ''))->toOthers();

        return response()->json([
            'message' => 'Logo tim berhasil diperbarui.',
            'data'    => new TeamResource($team->fresh()->load(['members.user', 'owner'])),
        ]);
    }

    /**
     * DELETE /api/teams/{team}/logo
     * Hapus logo tim — hanya owner
     */
    public function deleteLogo(Request $request, Team $team): JsonResponse
    {
        Gate::authorize('update', $team);

        if ($team->logo_path) {
            Storage::disk('public')->delete($team->logo_path);
        }

        $team->update(['logo_path' => null]);

        AuditLogService::logFromRequest(
            request:     $request,
            teamId:      $team->id,
            action:      'team.logo_deleted',
            subjectType: Team::class,
            subjectId:   $team->id,
            payload:     [],
        );

        broadcast(new TeamUpdated($team, 'team.logo_deleted', $request->user()->name ?? ''))->toOthers();

        return response()->json([
            'message' => 'Logo tim berhasil dihapus.',
            'data'    => new TeamResource($team->fresh()->load(['members.user', 'owner'])),
        ]);
    }

    /**
     * GET /api/teams/invite/{inviteCode}
     * Public preview tim — ngga perlu auth, informasinya terbatas
     */
    public function previewInvite(string $inviteCode): JsonResponse
    {
        $team = Team::where('invite_code', strtoupper($inviteCode))->first();

        if (!$team) {
            return response()->json(['message' => 'Undangan tidak valid atau sudah kadaluwarsa.'], 404);
        }

        $user = auth('sanctum')->user();
        $isMember = $user
            ? TeamMember::where('team_id', $team->id)
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->exists()
            : false;

        return response()->json([
            'data' => [
                'team_id'       => (string) $team->id,
                'name'          => $team->name,
                'description'   => $team->description,
                'members_count' => $team->activeMembers()->count(),
                'owner_name'    => $team->owner?->name ?? '—',
                'created_at'    => $team->created_at?->toISOString(),
                'is_member'     => $isMember,
            ],
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

        broadcast(new TeamUpdated($team, 'member.joined', $request->user()->name ?? ''))->toOthers();

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
        Gate::authorize('update', $team);

        // Pastikan member ini memang ada di tim ini
        if ($member->team_id !== $team->id) {
            return response()->json(['message' => 'Anggota tidak ditemukan di tim ini.'], 404);
        }

        if ($member->status !== 'active') {
            return response()->json(['message' => 'Anggota sudah tidak aktif.'], 403);
        }

        // H-B: service-level FMR cap — guards against direct controller call bypass
        $maxFmr = (int) config('seiris.max_student_fmr');
        if ($request->fmr > $maxFmr) {
            return response()->json([
                'message' => "FMR tidak boleh melebihi batas maksimum mahasiswa (Rp {$maxFmr}/jam).",
            ], 422);
        }

        $oldFmr = $member->fmr;
        $projectId = $request->project_id;

        if ($projectId) {
            // Per-project FMR: upsert pivot project_members
            $project = $team->projects()->findOrFail($projectId);
            if ($project->is_frozen) {
                return response()->json(['message' => 'Project sudah di-freeze. FMR project tidak bisa diubah.'], 409);
            }
            ProjectMember::updateOrCreate(
                ['project_id' => $project->id, 'team_member_id' => $member->id],
                ['fmr' => $request->fmr],
            );
        } else {
            $member->update(['fmr' => $request->fmr]);
        }

        AuditLogService::logFromRequest(
            request:     $request,
            teamId:      $team->id,
            action:      'member.fmr_updated',
            subjectType: TeamMember::class,
            subjectId:   $member->id,
            payload:     ['old_fmr' => $oldFmr, 'new_fmr' => $request->fmr, 'project_id' => $projectId],
        );

        broadcast(new TeamUpdated($team, 'member.fmr_updated', $member->user?->name ?? ''))->toOthers();

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
        Gate::authorize('update', $team);

        if ($team->is_frozen) {
            return response()->json(['message' => 'Tim sudah di-freeze sebelumnya.'], 409);
        }

        // Prinsip 3: freeze tim HANYA boleh kalau SEMUA project sudah di-freeze.
        // Project aktif punya slices yang belum masuk cap table induk — freeze tim
        // sebelum itu = slices hilang permanen (melanggar Prinsip 2: zero-loss).
        $activeProjects = $team->projects()->where('is_frozen', false)->count();
        if ($activeProjects > 0) {
            return response()->json([
                'message' => "Semua project harus di-freeze dulu sebelum freeze tim. Masih ada {$activeProjects} project yang belum di-freeze.",
            ], 409);
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

        broadcast(new TeamUpdated($team, 'team.frozen', $request->user()->name ?? ''))->toOthers();

        return response()->json([
            'message' => 'Equity tim berhasil di-freeze.',
            'data'    => new TeamResource($team->fresh()->load(['members.user', 'owner'])),
        ]);
    }

    /**
     * POST /api/teams/{team}/members/{member}/exit
     * Keluarkan anggota — hanya owner.
     * leaver_type: 'good' (perusahaan salah) -> slices tetap;
     *               'bad'  (dia salah)        -> slices non-cash hilang.
     * Recovery dijalankan 2 level: per-project (jika ada) lalu agregasi tim.
     */
    public function exitMember(Request $request, Team $team, TeamMember $member): JsonResponse
    {
        Gate::authorize('update', $team);

        // LOW: validasi input exit
        $request->validate([
            'exit_reason' => 'nullable|string|max:500',
        ]);

        if ($member->team_id !== $team->id) {
            return response()->json(['message' => 'Anggota tidak ditemukan di tim ini.'], 404);
        }

        if ($member->role === 'owner') {
            return response()->json(['message' => 'Owner tidak bisa dikeluarkan dari tim.'], 403);
        }

        $leaverType = in_array($request->leaver_type, ['good', 'bad']) ? $request->leaver_type : null;

        try {
            DB::transaction(function () use ($request, $team, $member, $leaverType) {
                // F-4: LOCK row member + re-check status di DALEM transaction
                // cegah TOCTOU race — 2 request exit bareng bisa "exited" 2x
                $locked = TeamMember::where('id', $member->id)
                    ->lockForUpdate()
                    ->first();

                if ($locked->status === 'exited') {
                    throw new \RuntimeException('ALREADY_EXITED');
                }

                $locked->update([
                    'status'      => 'exited',
                    'exited_at'   => now(),
                    'leaver_type' => $leaverType,
                    'exit_reason' => $request->exit_reason,
                ]);

                // Hapus semua project_members row (cegah ghost member di roster project)
                DB::table('project_members')
                    ->where('team_member_id', $member->id)
                    ->delete();

                // Auto-reject semua kontribusi PENDING milik member yang exit
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
                    payload:     [
                        'user_id'     => $member->user_id,
                        'leaver_type' => $leaverType,
                    ],
                );

                // Recovery 2-level: recalc semua project agar bad-leaver penalty
                // tercermin di tiap Pie anak, lalu agregasi tim ikut ter-update.
                foreach ($team->projects as $project) {
                    if ($project->contributions()->where('status', 'APPROVED')->exists()) {
                        $this->slicingPie->recalculate($team, null, $project);
                    }
                }
                $this->slicingPie->recalculate($team);
            });
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'ALREADY_EXITED') {
                return response()->json([
                    'message' => 'Anggota sudah keluar sebelumnya.',
                ], 409);
            }
            throw $e;
        }

        broadcast(new TeamUpdated($team, 'member.exited', $member->user?->name ?? ''))->toOthers();

        return response()->json([
            'message' => 'Anggota berhasil dikeluarkan dari tim.',
        ]);
    }

}