<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EquitySnapshot;
use App\Models\Revenue;
use App\Models\Team;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

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
                'snapshot_id'   => $snapshot->id,
                'total_slices'  => $snapshot->total_slices,
                'equity_map'    => $enriched,
                'is_frozen'     => $snapshot->is_frozen,
                'calculated_at' => $snapshot->created_at?->toISOString(),
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
     * GET /api/teams/{team}/equity/export
     * Export laporan equity + slicing pie sebagai PDF
     */
    public function export(Request $request, Team $team): Response
    {
        $this->authorizeMember($request, $team);

        // Ambil snapshot terbaru
        $snapshot = EquitySnapshot::where('team_id', $team->id)
            ->latest()
            ->first();

        if (!$snapshot) {
            abort(404, 'Belum ada data equity untuk diekspor.');
        }

        // Enrich equity_map dengan data user + FMR
        $members = $team->members()->with('user')->get()->keyBy('id');
        $enrichedMap = [];

        foreach ($snapshot->equity_map as $memberId => $data) {
            $member = $members->get($memberId);
            $enrichedMap[] = [
                'member_id'  => $memberId,
                'name'       => $member?->user?->name ?? 'Unknown',
                'role'       => $member?->role ?? 'member',
                'fmr'        => $member?->fmr ?? 0,
                'slices'     => $data['slices'],
                'equity_pct' => $data['equity_pct'],
            ];
        }

        usort($enrichedMap, fn($a, $b) => $b['equity_pct'] <=> $a['equity_pct']);

        // Ambil semua kontribusi APPROVED dengan data member
        $contributions = $team->contributions()
            ->where('status', 'APPROVED')
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

        // Ambil revenues yang sudah didistribusikan
        $revenues = Revenue::where('team_id', $team->id)
            ->where('is_distributed', true)
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