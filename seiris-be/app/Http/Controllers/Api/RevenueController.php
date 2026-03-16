<?php
// ============================================================
// app/Http/Controllers/Api/RevenueController.php
// ============================================================
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Revenue\StoreRevenueRequest;
use App\Http\Resources\RevenueResource;
use App\Models\ProfitDistribution;
use App\Models\Revenue;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RevenueController extends Controller
{
    /**
     * GET /api/teams/{team}/revenues
     * List semua revenue tim
     */
    public function index(Request $request, Team $team): JsonResponse
    {
        $this->authorizeMember($request, $team);

        $revenues = Revenue::where('team_id', $team->id)
            ->with(['recordedBy.user', 'distributions.member.user'])
            ->orderByDesc('revenue_date')
            ->paginate(15);

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
     * POST /api/teams/{team}/revenues
     * Catat revenue baru — hanya owner
     */
    public function store(StoreRevenueRequest $request, Team $team): JsonResponse
    {
        $this->authorizeOwner($request, $team);

        $member = TeamMember::where('team_id', $team->id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->first();

        // Handle upload bukti pembayaran
        $proofPath = null;
        if ($request->hasFile('proof')) {
            $proofPath = $request->file('proof')->store('revenues', 'public');
        }

        $revenue = DB::transaction(function () use ($request, $team, $member, $proofPath) {
            $revenue = Revenue::create([
                'team_id'              => $team->id,
                'recorded_by'          => $member->id,
                'description'          => $request->description,
                'amount'               => $request->amount,
                'distributable_amount' => $request->distributable_amount,
                'proof_path'           => $proofPath,
                'revenue_date'         => $request->revenue_date,
                'is_distributed'       => false,
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

        return response()->json([
            'message' => 'Revenue berhasil dicatat.',
            'data'    => new RevenueResource($revenue->load(['recordedBy.user'])),
        ], 201);
    }

    /**
     * POST /api/revenues/{revenue}/distribute
     * Distribusikan profit ke semua anggota aktif — hanya owner
     */
    public function distribute(Request $request, Revenue $revenue): JsonResponse
    {
        $team = $revenue->team;
        $this->authorizeOwner($request, $team);

        if ($revenue->is_distributed) {
            return response()->json([
                'message' => 'Revenue ini sudah didistribusikan sebelumnya.',
            ], 409);
        }

        // Ambil snapshot equity terbaru
        $snapshot = $team->equitySnapshots()->first();

        if (!$snapshot || empty($snapshot->equity_map)) {
            return response()->json([
                'message' => 'Belum ada equity snapshot. Pastikan ada kontribusi yang sudah diapprove.',
            ], 422);
        }

        $distributions = DB::transaction(function () use ($request, $revenue, $team, $snapshot) {
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

        return response()->json([
            'message' => 'Profit berhasil didistribusikan.',
            'data'    => new RevenueResource($revenue->fresh()->load([
                'recordedBy.user',
                'distributions.member.user',
            ])),
        ]);
    }

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