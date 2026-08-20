<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contribution;
use App\Models\EquitySnapshot;
use App\Models\Team;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EquityController extends Controller
{
    /**
     * GET /api/teams/{team}/equity (atau /projects/{project}/equity)
     * Equity snapshot terbaru — scope tim atau project
     */
    public function current(Request $request, Team $team, ?Project $project = null): JsonResponse
    {
        // authorizeMember di-handle middleware EnsureTeamMember / EnsureProjectMember

        $slicesByType = $this->getSlicesByType($team, $project);

        $snapshotQuery = EquitySnapshot::where('team_id', $team->id);
        if ($project) {
            $snapshotQuery->where('project_id', $project->id);
        } else {
            $snapshotQuery->whereNull('project_id');
        }
        $snapshot = $snapshotQuery->latest()->first();

        if (!$snapshot) {
            $members = $team->activeMembers()->with('user')->get();

            return response()->json([
                'data' => [
                    'total_slices'   => 0,
                    'equity_map'     => $members->map(fn($m) => [
                        'member_id'        => $m->id,
                        'name'             => $m->user->name,
                        'role'             => $m->role,
                        'slices'           => 0,
                        'equity_pct'       => 0,
                        'profile_photo_url' => $m->user->profile_photo_url,
                    ])->values()->toArray(),
                    'slices_by_type' => $slicesByType,
                    'is_frozen'      => $team->is_frozen,
                    'calculated_at'  => null,
                ],
            ]);
        }

        $members = $team->activeMembers()->with('user')->get()->keyBy('id');
        $enriched = [];

        foreach ($snapshot->equity_map as $memberId => $data) {
            $member = $members->get($memberId);
            $enriched[] = [
                'member_id'        => $memberId,
                'name'             => $member?->user?->name ?? 'Unknown',
                'role'             => $member?->role ?? 'member',
                'slices'           => $data['slices'],
                'equity_pct'       => $data['equity_pct'],
                'profile_photo_url' => $member?->user?->profile_photo_url,
            ];
        }

        usort($enriched, fn($a, $b) => $b['equity_pct'] <=> $a['equity_pct']);

        return response()->json([
            'data' => [
                'snapshot_id'    => $snapshot->id,
                'total_slices'   => $snapshot->total_slices,
                'equity_map'     => $enriched,
                'slices_by_type' => $slicesByType,
                'is_frozen'      => $snapshot->is_frozen,
                'calculated_at'  => $snapshot->created_at?->toISOString(),
            ],
        ]);
    }

    /**
     * Aggregasi approved contributions per tipe untuk equity chart.
     */
    private function getSlicesByType(Team $team, ?Project $project = null): array
    {
        $query = Contribution::where('team_id', $team->id)
            ->where('status', 'APPROVED');
        if ($project) {
            $query->where('project_id', $project->id);
        }
        $breakdown = $query->selectRaw('type, SUM(total_slices) as total')
            ->groupBy('type')
            ->pluck('total', 'type')
            ->toArray();

        $allTypes = ['CASH', 'TIME', 'IDEA', 'NETWORK', 'FACILITY', 'SALES'];
        $result = [];
        foreach ($allTypes as $t) {
            $result[$t] = (int) ($breakdown[$t] ?? 0);
        }
        return $result;
    }

    /**
     * GET /api/teams/{team}/equity/history (atau /projects/{project}/equity/history)
     * Riwayat semua snapshot equity
     */
    public function history(Request $request, Team $team, ?Project $project = null): JsonResponse
    {
        // authorizeMember di-handle middleware EnsureTeamMember / EnsureProjectMember

        $snapshotQuery = EquitySnapshot::where('team_id', $team->id);
        if ($project) {
            $snapshotQuery->where('project_id', $project->id);
        } else {
            $snapshotQuery->whereNull('project_id');
        }
        $snapshots = $snapshotQuery->orderByDesc('created_at')->paginate(10);

        return response()->json([
            'data' => $snapshots->map(fn($s) => [
                'snapshot_id'   => $s->id,
                'total_slices'  => $s->total_slices,
                'equity_map'    => $s->equity_map,
                'is_frozen'     => $s->is_frozen,
                'calculated_at' => $s->created_at?->toISOString(),
            ]),
            'meta' => [
                'current_page' => $snapshots->currentPage(),
                'last_page'    => $snapshots->lastPage(),
                'total'        => $snapshots->total(),
            ],
        ]);
    }

}