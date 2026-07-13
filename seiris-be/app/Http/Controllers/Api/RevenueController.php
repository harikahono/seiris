<?php
// ============================================================
// app/Http/Controllers/Api/RevenueController.php
// ============================================================
namespace App\Http\Controllers\Api;

use App\Events\TeamUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Revenue\StoreRevenueRequest;
use App\Http\Resources\RevenueResource;
use App\Models\ProfitDistribution;
use App\Models\Revenue;
use App\Models\Team;
use App\Models\Project;
use App\Models\TeamMember;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

class RevenueController extends Controller
{
    /**
     * GET /api/teams/{team}/revenues (atau /projects/{project}/revenues)
     * List revenue — scope tim atau project
     */
    public function index(Request $request, Team $team, ?Project $project = null): JsonResponse
    {
        // authorizeMember di-handle middleware EnsureTeamMember / EnsureProjectMember

        $query = Revenue::where('team_id', $team->id)
            ->with(['recordedBy.user', 'distributions.member.user']);

        if ($project) {
            $query->where('project_id', $project->id);
        }

        $revenues = $query->orderByDesc('revenue_date')->paginate(6);

        return response()->json([
            'data' => RevenueResource::collection($revenues),
            'meta' => [
                'current_page' => $revenues->currentPage(),
                'last_page'    => $revenues->lastPage(),
                'total'        => $revenues->total(),
            ],
        ]);
    }

    /**
     * POST /api/teams/{team}/revenues (atau /projects/{project}/revenues)
     * Catat revenue baru — hanya owner
     */
    public function store(StoreRevenueRequest $request, Team $team, ?Project $project = null): JsonResponse
    {
        Gate::authorize('update', $team);

        // TeamMember sudah di-attach oleh middleware EnsureTeamMember / EnsureProjectMember
        $member = $request->teamMember;

        // Handle upload bukti pembayaran
        $proofPath = null;
        if ($request->hasFile('proof')) {
            $proofPath = $request->file('proof')->store('revenues', 'public');
        }

        $revenue = DB::transaction(function () use ($request, $team, $member, $proofPath, $project) {
            $deductions = $request->deductions ?? [];
            $totalDeductions = collect($deductions)->sum('amount');
            $distributable = $request->distributable_amount ?? ($request->amount - $totalDeductions);

            $revenue = Revenue::create([
                'team_id'              => $team->id,
                'project_id'           => $project?->id,
                'recorded_by'          => $member->id,
                'description'          => $request->description,
                'amount'               => $request->amount,
                'distributable_amount' => max(0, $distributable),
                'deductions'           => $deductions,
                'proof_path'           => $proofPath,
                'revenue_date'         => $request->revenue_date,
                'is_distributed'       => false,
                'status'               => 'pending',
            ]);

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'revenue.created',
                subjectType: Revenue::class,
                subjectId:   $revenue->id,
                payload:     [
                    'amount'               => $revenue->amount,
                    'distributable_amount' => $revenue->distributable_amount,
                ],
            );

            return $revenue;
        });

        broadcast(new TeamUpdated($team, 'revenue.created', $request->user()->name))->toOthers();

        return response()->json([
            'message' => 'Revenue berhasil dicatat.',
            'data'    => new RevenueResource($revenue->load(['recordedBy.user'])),
        ], 201);
    }

    /**
     * POST /api/revenues/{revenue}/request-distribute
     * Ajukan distribusi revenue â€” semua active member bisa
     */
    public function requestDistribute(Request $request, Revenue $revenue): JsonResponse
    {
        $team = $revenue->team;

        // H1: route ini di luar middleware team.member → cek membership manual
        $member = TeamMember::where('team_id', $team->id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->first();
        if (!$member) {
            return response()->json(['message' => 'Kamu bukan anggota tim ini.'], 403);
        }
        // Kalau revenue punya project → wajib roster project
        if ($revenue->project_id) {
            $inProject = DB::table('project_members')
                ->where('project_id', $revenue->project_id)
                ->where('team_member_id', $member->id)
                ->exists();
            if (!$inProject) {
                return response()->json(['message' => 'Kamu bukan member project ini.'], 403);
            }
        }

        if ($revenue->is_distributed) {
            return response()->json([
                'message' => 'Revenue ini sudah didistribusikan.',
            ], 409);
        }

        if ($revenue->status !== 'pending') {
            return response()->json([
                'message' => 'Distribusi sudah diajukan sebelumnya. Tunggu persetujuan owner.',
            ], 409);
        }

        $revenue->update(['status' => 'distribute_requested']);

        AuditLogService::logFromRequest(
            request:     $request,
            teamId:      $team->id,
            action:      'profit.requested',
            subjectType: Revenue::class,
            subjectId:   $revenue->id,
            payload:     [
                'distributable_amount' => $revenue->distributable_amount,
            ],
        );

        broadcast(new TeamUpdated($team, 'profit.requested', $request->user()->name))->toOthers();

        return response()->json([
            'message' => 'Permintaan distribusi diajukan. Menunggu persetujuan owner.',
            'data'    => new RevenueResource($revenue->fresh()->load(['recordedBy.user'])),
        ]);
    }

    /**
     * POST /api/revenues/{revenue}/distribute
     * Setujui dan distribusikan profit ke semua anggota aktif â€” hanya owner
     */
    public function distribute(Request $request, Revenue $revenue): JsonResponse
    {
        $team = $revenue->team;
        Gate::authorize('update', $team);

        if ($revenue->is_distributed) {
            return response()->json([
                'message' => 'Revenue ini sudah didistribusikan sebelumnya.',
            ], 409);
        }

        // ponytail: owner boleh distribute langsung dari pending; request member (toast) opsional
        // Ambil snapshot equity terbaru — scope project kalau revenue punya project_id
        $snapshotQuery = $team->equitySnapshots();
        if ($revenue->project_id) {
            $snapshotQuery->where('project_id', $revenue->project_id);
        } else {
            $snapshotQuery->whereNull('project_id');
        }
        $snapshot = $snapshotQuery->first();

        if (!$snapshot || empty($snapshot->equity_map)) {
            return response()->json([
                'message' => 'Belum ada equity snapshot. Pastikan ada kontribusi yang sudah diapprove.',
            ], 422);
        }

        $distributions = DB::transaction(function () use ($request, $revenue, $team, $snapshot) {
            // M2: lock row supaya concurrent distribute aman (hindari 500 dari unique constraint)
            $locked = Revenue::where('id', $revenue->id)->lockForUpdate()->first();
            if ($locked->is_distributed) {
                throw new \RuntimeException('Revenue sudah didistribusikan oleh proses lain.');
            }

            $distributions = [];

            foreach ($snapshot->equity_map as $memberId => $data) {
                $amount = (int) round(
                    $revenue->distributable_amount * ($data['equity_pct'] / 100)
                );

                $dist = ProfitDistribution::create([
                    'revenue_id'          => $revenue->id,
                    'member_id'           => $memberId,
                    'equity_pct_snapshot' => $data['equity_pct'],
                    'amount'              => $amount,
                ]);

                $distributions[] = $dist;
            }

            // Tandai revenue sudah didistribusikan
            $revenue->update([
                'is_distributed' => true,
                'status'         => 'distributed',
                'distributed_at' => now(),
            ]);

            AuditLogService::logFromRequest(
                request:     $request,
                teamId:      $team->id,
                action:      'profit.distributed',
                subjectType: Revenue::class,
                subjectId:   $revenue->id,
                payload:     [
                    'distributable_amount' => $revenue->distributable_amount,
                    'snapshot_id'          => $snapshot->id,
                    'distributions_count'  => count($distributions),
                ],
            );

            return $distributions;
        });

        try {
            broadcast(new TeamUpdated($team, 'profit.distributed', $request->user()->name))->toOthers();
        } catch (\Throwable $e) {
            Log::warning('[Distribute] Broadcast failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Profit berhasil didistribusikan.',
            'data'    => new RevenueResource($revenue->fresh()->load([
                'recordedBy.user',
                'distributions.member.user',
            ])),
        ]);
    }

}