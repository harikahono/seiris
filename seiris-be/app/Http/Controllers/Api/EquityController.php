<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contribution;
use App\Models\EquitySnapshot;
use App\Models\Revenue;
use App\Models\Team;
use App\Models\Project;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

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
                        'member_id'  => $m->id,
                        'name'       => $m->user->name,
                        'role'       => $m->role,
                        'slices'     => 0,
                        'equity_pct' => 0,
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
                'member_id'  => $memberId,
                'name'       => $member?->user?->name ?? 'Unknown',
                'role'       => $member?->role ?? 'member',
                'slices'     => $data['slices'],
                'equity_pct' => $data['equity_pct'],
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

    /**
     * GET /api/teams/{team}/equity/export (atau /projects/{project}/equity/export)
     * Export laporan equity + slicing pie sebagai PDF
     */
    public function export(Request $request, Team $team, ?Project $project = null): Response
    {
        // authorizeMember di-handle middleware EnsureTeamMember / EnsureProjectMember

        // Ambil snapshot terbaru — scope project atau tim
        $snapshotQuery = EquitySnapshot::where('team_id', $team->id);
        if ($project) {
            $snapshotQuery->where('project_id', $project->id);
        } else {
            $snapshotQuery->whereNull('project_id');
        }
        $snapshot = $snapshotQuery->latest()->first();

        if (!$snapshot) {
            abort(404, 'Belum ada data equity untuk diekspor.');
        }

        // Enrich equity_map dengan data user + FMR
        $members = $team->members()->with('user')->get()->keyBy('id');

        // Kalau scope project, prioritaskan per-project FMR dari pivot (GAP 2 fix)
        $projectFmrs = collect();
        if ($project) {
            $projectFmrs = DB::table('project_members')
                ->where('project_id', $project->id)
                ->pluck('fmr', 'team_member_id');
        }

        $enrichedMap = [];

        foreach ($snapshot->equity_map as $memberId => $data) {
            $member = $members->get($memberId);
            $fmr = $projectFmrs->get($memberId) ?? $member?->fmr ?? 0;
            $enrichedMap[] = [
                'member_id'  => $memberId,
                'name'       => $member?->user?->name ?? 'Unknown',
                'role'       => $member?->role ?? 'member',
                'fmr'        => $fmr,
                'slices'     => $data['slices'],
                'equity_pct' => $data['equity_pct'],
            ];
        }

        usort($enrichedMap, fn($a, $b) => $b['equity_pct'] <=> $a['equity_pct']);

        // Ambil semua kontribusi APPROVED dengan data member (scope project/tim)
        $contribQuery = $team->contributions()->where('status', 'APPROVED');
        if ($project) {
            $contribQuery->where('project_id', $project->id);
        }
        $contributions = $contribQuery
            ->with('member.user')
            ->orderBy('contribution_date')
            ->get()
            ->map(fn($c) => [
                'member_id'    => $c->member_id,
                'type'         => $c->type,
                'description'  => $c->description,
                'value'        => $c->value,
                'multiplier'   => $c->multiplier,
                'total_slices' => $c->total_slices,
                'date'         => $c->contribution_date?->toDateString(),
            ])
            ->toArray();

        // Ambil revenues yang sudah didistribusikan (scope project/tim)
        $revQuery = Revenue::where('team_id', $team->id)->where('is_distributed', true);
        if ($project) {
            $revQuery->where('project_id', $project->id);
        }
        $revenues = $revQuery
            ->with(['distributions.member.user'])
            ->orderBy('revenue_date')
            ->get()
            ->map(fn($r) => [
                'description'          => $r->description,
                'amount'               => $r->amount,
                'distributable_amount' => $r->distributable_amount,
                'revenue_date'         => $r->revenue_date?->toDateString(),
                'distributions'        => $r->distributions->map(fn($d) => [
                    'member_name' => $d->member?->user?->name ?? 'Unknown',
                    'equity_pct'  => $d->equity_pct_snapshot,
                    'amount'      => $d->amount,
                ])->toArray(),
            ])
            ->toArray();

        // Info project scope untuk cap table clarity
        $projectInfo = null;
        if (!$project) {
            $allProjects = $team->projects()->get(['id', 'name', 'is_frozen', 'frozen_at']);
            $frozenCount = $allProjects->where('is_frozen', true)->count();
            $activeCount = $allProjects->where('is_frozen', false)->count();
            $projectInfo = [
                'total'       => $allProjects->count(),
                'frozen'      => $frozenCount,
                'active'      => $activeCount,
                'all_frozen'  => $activeCount === 0 && $allProjects->isNotEmpty(),
                'project_list' => $allProjects->map(fn($p) => [
                    'name'      => $p->name,
                    'is_frozen' => $p->is_frozen,
                    'frozen_at' => $p->frozen_at?->toDateString(),
                ])->toArray(),
            ];
        }

        // Build view data
        $data = [
            'team'         => [
                'id'   => $team->id,
                'name' => $team->name,
            ],
            'snapshot'     => [
                'snapshot_id'  => $snapshot->id,
                'total_slices' => $snapshot->total_slices,
                'equity_map'   => $enrichedMap,
                'is_frozen'    => $snapshot->is_frozen,
            ],
            'contributions' => $contributions,
            'revenues'      => $revenues,
            'project_info'  => $projectInfo,
            'generated_at'  => now()->setTimezone('Asia/Jakarta')->format('d M Y, H:i') . ' WIB',
        ];

        $pdf = Pdf::loadView('pdf.equity-report', $data)
            ->setPaper('a4', 'portrait')
            ->setOptions([
                'defaultFont'     => 'DejaVu Sans',
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => false,
                'dpi'             => 150,
            ]);

        $filename = 'SEIRIS_' . str_replace(' ', '_', $team->name) . '_' . now()->format('Ymd') . '.pdf';

        return $pdf->download($filename);
    }

}