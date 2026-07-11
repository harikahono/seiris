<?php

namespace App\Http\Controllers\Api;

use App\Events\ContributionCreated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Contribution\StoreContributionRequest;
use App\Http\Resources\ContributionResource;
use App\Models\Contribution;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Project;
use App\Services\AuditLogService;
use App\Services\SlicingPieService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;


class ContributionController extends Controller
{


    /**
     * GET /api/teams/{team}/contributions  (atau /projects/{project}/contributions)
     * List kontribusi — scope tim atau project
     */
    public function index(Request $request, Team $team, ?Project $project = null): JsonResponse
    {
        // authorizeMember di-handle middleware EnsureTeamMember / EnsureProjectMember

        $query = Contribution::where('team_id', $team->id)
            ->with(['member.user']);

        if ($project) {
            $query->where('project_id', $project->id);
        }

        // Server-side filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $contributions = $query->orderByDesc('created_at')
            ->paginate(6);

        return response()->json([
            'data' => ContributionResource::collection($contributions),
            'meta' => [
                'current_page' => $contributions->currentPage(),
                'last_page'    => $contributions->lastPage(),
                'total'        => $contributions->total(),
            ],
        ]);
    }

    /**
     * POST /api/teams/{team}/contributions  (atau /projects/{project}/contributions)
     * Log kontribusi baru
     */
    public function store(StoreContributionRequest $request, Team $team, ?Project $project = null): JsonResponse
    {
        // authorizeMember di-handle middleware EnsureTeamMember / EnsureProjectMember

        // Freeze guard: tim ATAU project (jika ada) tidak boleh frozen
        if ($team->is_frozen || ($project && $project->is_frozen)) {
            return response()->json([
                'message' => 'Tim/project sudah di-freeze. Kontribusi baru tidak dapat ditambahkan.',
            ], 403);
        }

        // TeamMember sudah di-attach oleh middleware EnsureTeamMember
        $member = $request->teamMember;

        // Gate: hanya project_members yang bisa kontribusi di project
        if ($project) {
            $inProject = DB::table('project_members')
                ->where('project_id', $project->id)
                ->where('team_member_id', $member->id)->exists();
            if (!$inProject) {
                return response()->json([
                    'message' => 'Kamu bukan member project ini. Minta owner untuk menambahkanmu ke project.',
                ], 403);
            }
        }

        // Resolve FMR: per-project dulu, fallback ke global TeamMember.fmr
        $fmr = $member->fmr;
        if ($project) {
            $pivot = DB::table('project_members')
                ->where('project_id', $project->id)
                ->where('team_member_id', $member->id)
                ->first();
            if ($pivot) {
                $fmr = $pivot->fmr;
            }
        }

        // Bug 1 fix — FMR = 0 tidak boleh log TIME/IDEA/NETWORK
        if (in_array($request->type, ['TIME', 'IDEA', 'NETWORK']) && $fmr === 0) {
            return response()->json([
                'message' => 'FMR kamu belum diset oleh owner untuk ' . ($project ? 'project ini' : 'tim') . '. Minta owner set FMR kamu terlebih dahulu.',
            ], 422);
        }

        // H-A: service-level FMR cap enforcement — guards against direct DB bypass
        $maxFmr = (int) config('seiris.max_student_fmr');
        if ($fmr > $maxFmr) {
            return response()->json([
                'message' => "FMR melebihi batas maksimum mahasiswa (Rp {$maxFmr}/jam).",
            ], 422);
        }

        // Hitung value berdasarkan tipe kontribusi + FMR (per-project atau global)
        $value = $this->calculateValue($request, $member, $fmr);

        // Hitung slices
        $slicesData = SlicingPieService::calculateSlices($request->type, $value);

            $contribution = DB::transaction(function () use ($request, $team, $member, $value, $slicesData, $project) {
            // LOCK: Ambil data tim dengan row-level lock untuk mencegah race condition
            // saat multiple kontribusi dibuat/diproses bersamaan untuk tim yang sama
            $lockedTeam = DB::table('teams')
                ->where('id', $team->id)
                ->lockForUpdate()
                ->first();
            
            if (!$lockedTeam) {
                throw new \RuntimeException('Tim tidak ditemukan saat proses kontribusi.');
            }

            $contribution = Contribution::create([
                'team_id'           => $team->id,
                'project_id'        => $project?->id,
                'member_id'         => $member->id,
                'type'              => $request->type,
                'description'       => $request->description,
                'value'             => $value,
                'multiplier'        => $slicesData['multiplier'],
                'total_slices'      => $slicesData['total_slices'],
                'status'            => 'PENDING',
                'contribution_date' => $request->contribution_date,
                'deal_value'        => $request->deal_value,
                'estimated_value'   => $request->estimated_value,
                'commission_rate'   => $request->commission_rate,
            ]);

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'contribution.created',
                subjectType: Contribution::class,
                subjectId:   $contribution->id,
                payload:     [
                    'type'         => $contribution->type,
                    'value'        => $contribution->value,
                    'total_slices' => $contribution->total_slices,
                    'description'  => $contribution->description,
                ],
                projectId: $project?->id,
            );

            return $contribution;
        });

        // Broadcast ke anggota lain biar实时
        try {
            broadcast(new ContributionCreated($team, $contribution->load('member.user')))->toOthers();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('[Contribution] Broadcast failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Kontribusi berhasil dicatat. Menunggu approval dari anggota tim.',
            'data'    => new ContributionResource($contribution->load('member.user')),
        ], 201);
    }

    /**
     * GET /api/teams/{team}/contributions/{contribution}
     * (atau /projects/{project}/contributions/{contribution})
     * Detail satu kontribusi
     */
    public function show(Request $request, Team $team, Contribution $contribution, ?Project $project = null): JsonResponse
    {
        // authorizeMember di-handle middleware EnsureTeamMember / EnsureProjectMember

        if ($contribution->team_id !== $team->id) {
            return response()->json(['message' => 'Kontribusi tidak ditemukan.'], 404);
        }

        if ($project && $contribution->project_id !== $project->id) {
            return response()->json(['message' => 'Kontribusi tidak ditemukan di project ini.'], 404);
        }

        return response()->json([
            'data' => new ContributionResource(
                $contribution->load(['member.user', 'approvals.member.user'])
            ),
        ]);
    }

    // ── Private Helpers ───────────────────────────────────────

    /**
     * Hitung nilai kontribusi berdasarkan tipe.
     * TIME: hours * fmr
     * CASH/FACILITY: langsung dari amount
     * IDEA/NETWORK: hours * fmr (nilai setara jam kerja)
     * SALES: (deal - estimasi) × rate%
     */
    private function calculateValue(StoreContributionRequest $request, TeamMember $member, ?int $fmrOverride = null): int
    {
        $fmr = $fmrOverride ?? $member->fmr;
        return match ($request->type) {
            'TIME', 'IDEA', 'NETWORK' => (int) round($request->hours * $fmr),
            'CASH', 'FACILITY'        => (int) $request->amount,
            'SALES'                   => (int) round(
                max(0, $request->deal_value - $request->estimated_value)
                * $request->commission_rate / 100
            ),
            default => 0,
        };
    }

}