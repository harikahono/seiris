<?php
// ============================================================
// app/Http/Controllers/Api/EquityController.php
// ============================================================
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EquitySnapshot;
use App\Models\Team;
use App\Models\TeamMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EquityController extends Controller
{
    /**
     * GET /api/teams/{team}/equity
     * Equity snapshot terbaru tim
     */
    public function current(Request $request, Team $team): JsonResponse
    {
        $this->authorizeMember($request, $team);

        $snapshot = EquitySnapshot::where('team_id', $team->id)
            ->latest()
            ->first();

        if (!$snapshot) {
            return response()->json([
                'message' => 'Belum ada kontribusi yang diapprove.',
                'data'    => [
                    'total_slices' => 0,
                    'equity_map'   => [],
                    'is_frozen'    => false,
                    'members'      => [],
                ],
            ]);
        }

        // Enrich equity_map dengan data user
        $members = $team->activeMembers()->with('user')->get()->keyBy('id');
        $enriched = [];

        foreach ($snapshot->equity_map as $memberId => $data) {
            $member = $members->get($memberId);
            $enriched[] = [
                'member_id'  => $memberId,
                'name'       => $member?->user?->name ?? 'Unknown',
                'role'       => $member?->role ?? 'member',
                'slices'     => $data['slices'],
                'equity_pct' => $data['equity_pct'],
            ];
        }

        // Sort by equity_pct descending
        usort($enriched, fn($a, $b) => $b['equity_pct'] <=> $a['equity_pct']);

        return response()->json([
            'data' => [
                'snapshot_id'  => $snapshot->id,
                'total_slices' => $snapshot->total_slices,
                'equity_map'   => $enriched,
                'is_frozen'    => $snapshot->is_frozen,
                'calculated_at'=> $snapshot->created_at?->toISOString(),
            ],
        ]);
    }

    /**
     * GET /api/teams/{team}/equity/history
     * Riwayat semua snapshot equity
     */
    public function history(Request $request, Team $team): JsonResponse
    {
        $this->authorizeMember($request, $team);

        $snapshots = EquitySnapshot::where('team_id', $team->id)
            ->orderByDesc('created_at')
            ->paginate(10);

        return response()->json([
            'data' => $snapshots->map(fn($s) => [
                'snapshot_id'  => $s->id,
                'total_slices' => $s->total_slices,
                'equity_map'   => $s->equity_map,
                'is_frozen'    => $s->is_frozen,
                'calculated_at'=> $s->created_at?->toISOString(),
            ]),
            'meta' => [
                'current_page' => $snapshots->currentPage(),
                'last_page'    => $snapshots->lastPage(),
                'total'        => $snapshots->total(),
            ],
        ]);
    }

    /**
     * GET /api/teams/{team}/equity/export
     * Export ringkasan equity sebagai JSON
     * (PDF export akan dihandle di Sprint 4)
     */
    public function export(Request $request, Team $team): JsonResponse
    {
        $this->authorizeMember($request, $team);

        $snapshot = EquitySnapshot::where('team_id', $team->id)
            ->latest()
            ->first();

        if (!$snapshot) {
            return response()->json(['message' => 'Belum ada data equity.'], 404);
        }

        $members = $team->members()->with('user')->get()->keyBy('id');

        $contributions = $team->contributions()
            ->where('status', 'APPROVED')
            ->with('member.user')
            ->get()
            ->groupBy('member_id');

        $report = [];
        foreach ($snapshot->equity_map as $memberId => $data) {
            $member = $members->get($memberId);
            $memberContribs = $contributions->get($memberId, collect());

            $report[] = [
                'member'       => [
                    'id'   => $memberId,
                    'name' => $member?->user?->name ?? 'Unknown',
                    'role' => $member?->role ?? 'member',
                    'fmr'  => $member?->fmr ?? 0,
                ],
                'slices'       => $data['slices'],
                'equity_pct'   => $data['equity_pct'],
                'contributions'=> $memberContribs->map(fn($c) => [
                    'type'         => $c->type,
                    'description'  => $c->description,
                    'total_slices' => $c->total_slices,
                    'date'         => $c->contribution_date?->toDateString(),
                ])->values(),
            ];
        }

        usort($report, fn($a, $b) => $b['equity_pct'] <=> $a['equity_pct']);

        return response()->json([
            'data' => [
                'team'         => [
                    'id'   => $team->id,
                    'name' => $team->name,
                ],
                'snapshot_id'  => $snapshot->id,
                'total_slices' => $snapshot->total_slices,
                'is_frozen'    => $snapshot->is_frozen,
                'generated_at' => now()->toISOString(),
                'members'      => $report,
            ],
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
}