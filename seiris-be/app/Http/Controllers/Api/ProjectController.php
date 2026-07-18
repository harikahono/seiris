<?php

namespace App\Http\Controllers\Api;

use App\Events\TeamUpdated;
use App\Events\EquityUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Project\StoreProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\EquitySnapshot;
use App\Models\ProjectMember;
use App\Services\AuditLogService;
use App\Services\SlicingPieService;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class ProjectController extends Controller
{
    public function __construct(private SlicingPieService $slicingPie) {}

    /**
     * GET /api/teams/{team}/projects
     */
    public function index(Request $request, Team $team): JsonResponse
    {
        $projects = $team->projects()->orderByDesc('created_at')->get();

        return response()->json([
            'data' => ProjectResource::collection($projects),
        ]);
    }

    /**
     * POST /api/teams/{team}/projects
     * Buat project baru (anak dari tim) — owner atau member aktif.
     */
    public function store(StoreProjectRequest $request, Team $team): JsonResponse
    {
        // H-C: project creation is owner-only
        Gate::authorize('update', $team);

        $project = DB::transaction(function () use ($request, $team) {
            $project = Project::create([
                'team_id'     => $team->id,
                'name'        => $request->name,
                'description' => $request->description,
                'is_frozen'   => false,
            ]);

            // Auto-add team owner ke roster project (owner perlu bisa vote/oversight)
            $ownerMember = $team->members()->where('user_id', $team->owner_id)->first();
            if ($ownerMember) {
                ProjectMember::updateOrCreate(
                    ['project_id' => $project->id, 'team_member_id' => $ownerMember->id],
                    ['fmr' => $ownerMember->fmr],
                );
            }

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'project.created',
                subjectType: Project::class,
                subjectId:   $project->id,
                payload:     ['name' => $project->name],
            );

            return $project;
        });

        broadcast(new TeamUpdated(
            $team,
            'project.created',
            $request->user()->name ?? '',
            projectName: $project->name,
        ))->toOthers();

        return response()->json([
            'message' => 'Project berhasil dibuat.',
            'data'    => new ProjectResource($project),
        ], 201);
    }

    /**
     * GET /api/teams/{team}/projects/{project}
     */
    public function show(Request $request, Team $team, Project $project): JsonResponse
    {
        return response()->json([
            'data' => new ProjectResource($project->load('contributions', 'revenues')),
        ]);
    }

    /**
     * POST /api/teams/{team}/projects/{project}/members
     * Tambah anggota tim ke roster project — owner only.
     */
    public function addMember(Request $request, Team $team, Project $project): JsonResponse
    {
        Gate::authorize('update', $team);

        if ($project->is_frozen) {
            return response()->json(['message' => 'Project sudah di-freeze.'], 409);
        }

        $request->validate([
            'member_id' => ['required', 'uuid', 'exists:team_members,id'],
        ]);

        $member = TeamMember::findOrFail($request->member_id);

        if ($member->team_id !== $team->id) {
            return response()->json(['message' => 'Anggota tidak ditemukan di tim ini.'], 404);
        }

        if ($member->status !== 'active') {
            return response()->json(['message' => 'Anggota sudah tidak aktif.'], 403);
        }

        ProjectMember::updateOrCreate(
            ['project_id' => $project->id, 'team_member_id' => $member->id],
            ['fmr' => $member->fmr],
        );

        AuditLogService::logFromRequest(
            request: $request,
            teamId: $team->id,
            action: 'member.added_to_project',
            subjectType: Project::class,
            subjectId: $project->id,
            payload: ['member_id' => $member->id, 'fmr' => $member->fmr],
        );

        broadcast(new TeamUpdated(
            $team, 'member.added_to_project', $request->user()->name ?? '',
            memberName: $member->user?->name ?? 'Anggota',
        ))->toOthers();

        return response()->json(['message' => 'Anggota berhasil ditambahkan ke project.']);
    }

    /**
     * DELETE /api/teams/{team}/projects/{project}/members/{member}
     * Keluarkan anggota dari roster project — owner only.
     */
    public function removeMember(Request $request, Team $team, Project $project, TeamMember $member): JsonResponse
    {
        Gate::authorize('update', $team);

        if ($member->team_id !== $team->id) {
            return response()->json(['message' => 'Anggota tidak ditemukan di tim ini.'], 404);
        }

        if ($project->is_frozen) {
            return response()->json(['message' => 'Project sudah di-freeze.'], 409);
        }

        $deleted = DB::table('project_members')
            ->where('project_id', $project->id)
            ->where('team_member_id', $member->id)
            ->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Anggota tidak terdaftar di project ini.'], 404);
        }

        // H6: hapus pending votes milik member di project ini
        DB::table('contribution_approvals')
            ->where('member_id', $member->id)
            ->whereIn('contribution_id', function ($q) use ($project) {
                $q->select('id')
                  ->from('contributions')
                  ->where('project_id', $project->id)
                  ->where('status', 'PENDING');
            })
            ->delete();

        AuditLogService::logFromRequest(
            request: $request,
            teamId: $team->id,
            action: 'member.removed_from_project',
            subjectType: Project::class,
            subjectId: $project->id,
            payload: ['member_id' => $member->id],
        );

        broadcast(new TeamUpdated(
            $team, 'member.removed_from_project', $request->user()->name ?? '',
            memberName: $member->user?->name ?? 'Anggota',
        ))->toOthers();

        return response()->json(['message' => 'Anggota berhasil dikeluarkan dari project.']);
    }

    /**
     * POST /api/teams/{team}/projects/{project}/freeze
     * Freeze Pie project (project kelar) — owner only.
     */
    public function freeze(Request $request, Team $team, Project $project): JsonResponse
    {
        Gate::authorize('update', $team);

        if ($project->is_frozen) {
            return response()->json(['message' => 'Project sudah di-freeze.'], 409);
        }

        try {
            $snapshot = $this->slicingPie->freeze($team, $project);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        AuditLogService::logFromRequest(
            request:     $request,
            teamId:      $team->id,
            action:      'project.frozen',
            subjectType: Project::class,
            subjectId:   $project->id,
            payload:     ['snapshot_id' => $snapshot->id],
        );

        broadcast(new TeamUpdated(
            $team,
            'project.frozen',
            $request->user()->name ?? '',
            projectName: $project->name,
        ))->toOthers();

        // Broadcast equity update (Pie project + agregasi induk) supaya viewer lain
        // dapat toast pie ter-update secara realtime.
        try {
            if ($snapshot instanceof EquitySnapshot) {
                broadcast(new EquityUpdated($team, $snapshot, approvedByName: $request->user()->name ?? ''))->toOthers();
            }
        } catch (\Throwable $e) {
            Log::warning('[ProjectController] EquityUpdated broadcast failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Project berhasil di-freeze.',
            'data'    => new ProjectResource($project->fresh()),
        ]);
    }
}
