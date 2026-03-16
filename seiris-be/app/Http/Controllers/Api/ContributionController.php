<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Contribution\StoreContributionRequest;
use App\Http\Resources\ContributionResource;
use App\Models\Contribution;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\AuditLogService;
use App\Services\SlicingPieService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ContributionController extends Controller
{
    public function __construct(private SlicingPieService $slicingPie) {}

    /**
     * GET /api/teams/{team}/contributions
     * List semua kontribusi tim — hanya member aktif
     */
    public function index(Request $request, Team $team): JsonResponse
    {
        $this->authorizeMember($request, $team);

        $contributions = Contribution::where('team_id', $team->id)
            ->with(['member.user'])
            ->orderByDesc('created_at')
            ->paginate(20);

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
     * POST /api/teams/{team}/contributions
     * Log kontribusi baru
     */
    public function store(StoreContributionRequest $request, Team $team): JsonResponse
    {
        $this->authorizeMember($request, $team);

        if ($team->is_frozen) {
            return response()->json([
                'message' => 'Tim sudah di-freeze. Kontribusi baru tidak dapat ditambahkan.',
            ], 403);
        }

        // Ambil team_member record user ini di tim ini
        $member = TeamMember::where('team_id', $team->id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->first();

        // Bug 1 fix — FMR = 0 tidak boleh log TIME/IDEA/NETWORK
        if (in_array($request->type, ['TIME', 'IDEA', 'NETWORK']) && $member->fmr === 0) {
            return response()->json([
                'message' => 'FMR kamu belum diset oleh owner. Minta owner set FMR kamu terlebih dahulu sebelum log kontribusi jenis ' . $request->type . '.',
            ], 422);
        }

        // Hitung value berdasarkan tipe kontribusi
        $value = $this->calculateValue($request, $member);

        // Hitung slices
        $slicesData = SlicingPieService::calculateSlices($request->type, $value);

        // Handle upload invoice untuk REVENUE
        $invoicePath = null;
        if ($request->type === 'REVENUE' && $request->hasFile('invoice')) {
            $invoicePath = $request->file('invoice')->store('invoices', 'public');
        }

        $contribution = DB::transaction(function () use ($request, $team, $member, $value, $slicesData, $invoicePath) {
            $contribution = Contribution::create([
                'team_id'           => $team->id,
                'member_id'         => $member->id,
                'type'              => $request->type,
                'description'       => $request->description,
                'value'             => $value,
                'multiplier'        => $slicesData['multiplier'],
                'total_slices'      => $slicesData['total_slices'],
                'status'            => 'PENDING',
                'contribution_date' => $request->contribution_date,
                'invoice_amount'    => $request->invoice_amount,
                'actual_amount'     => $request->actual_amount,
                'invoice_path'      => $invoicePath,
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
                ],
            );

            return $contribution;
        });

        return response()->json([
            'message' => 'Kontribusi berhasil dicatat. Menunggu approval dari anggota tim.',
            'data'    => new ContributionResource($contribution->load('member.user')),
        ], 201);
    }

    /**
     * GET /api/teams/{team}/contributions/{contribution}
     * Detail satu kontribusi
     */
    public function show(Request $request, Team $team, Contribution $contribution): JsonResponse
    {
        $this->authorizeMember($request, $team);

        if ($contribution->team_id !== $team->id) {
            return response()->json(['message' => 'Kontribusi tidak ditemukan.'], 404);
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
     * REVENUE: selisih actual_amount - invoice_amount
     */
    private function calculateValue(StoreContributionRequest $request, TeamMember $member): int
    {
        return match ($request->type) {
            'TIME', 'IDEA', 'NETWORK' => (int) round($request->hours * $member->fmr),
            'CASH', 'FACILITY'        => (int) $request->amount,
            'REVENUE'                 => (int) max(0, $request->actual_amount - $request->invoice_amount),
            default => 0,
        };
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
}