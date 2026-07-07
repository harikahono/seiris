<?php

namespace App\Services;

use App\Models\Team;
use App\Models\EquitySnapshot;
use Illuminate\Support\Facades\DB;

class SlicingPieService
{
    /**
     * Recalculate equity for all active members of a team.
     * Called every time a contribution status changes to APPROVED.
     * 
     * PENTING: Fungsi ini harus dipanggil dalam transaksi database yang sudah memiliki lock
     * untuk mencegah race condition saat multiple approvals terjadi bersamaan.
     *
     * @param Team $team
     * @param string|null $triggeredByContributionId UUID of the contribution that triggered this
     */
    public function recalculate(Team $team, ?string $triggeredByContributionId = null): EquitySnapshot
    {
        // Load all APPROVED contributions with their member (dengan lock implisit dari transaction caller)
        $approvedContributions = $team->contributions()
            ->with('member')
            ->where('status', 'APPROVED')
            ->get();

        // Aggregate slices per member
        $slicesPerMember = [];
        foreach ($approvedContributions as $contribution) {
            $memberId = $contribution->member_id;
            if (!isset($slicesPerMember[$memberId])) {
                $slicesPerMember[$memberId] = 0;
            }
            $slicesPerMember[$memberId] += $contribution->total_slices;
        }

        $totalSlicesTeam = array_sum($slicesPerMember);

        // Build equity map
        $equityMap = [];
        if ($totalSlicesTeam > 0) {
            foreach ($slicesPerMember as $memberId => $slices) {
                $equityMap[$memberId] = [
                    'slices'      => $slices,
                    'equity_pct'  => round(($slices / $totalSlicesTeam) * 100, 4),
                ];
            }
        }

        // Persist snapshot — caller sudah handle outer transaction dengan lockForUpdate di teams table
        // Lock equity_snapshots untuk cegah concurrent writes antar sesama recalculate()
        DB::table('equity_snapshots')
            ->where('team_id', $team->id)
            ->lockForUpdate()
            ->get();

        $snapshot = EquitySnapshot::create([
            'team_id'                    => $team->id,
            'triggered_by_contribution'  => $triggeredByContributionId,
            'total_slices'               => $totalSlicesTeam,
            'equity_map'                 => $equityMap,
            'is_frozen'                  => false,
        ]);

        // Log equity recalculation
        AuditLogService::log(
            teamId:      $team->id,
            action:      'equity.recalculated',
            actorId:     null, // system-triggered
            subjectType: 'equity_snapshot',
            subjectId:   $snapshot->id,
            payload:     [
                'total_slices'  => $totalSlicesTeam,
                'members_count' => count($equityMap),
            ],
        );

        return $snapshot;
    }

    /**
     * Calculate slices for a given contribution type, value, and FMR.
     *
     * @param string $type   TIME|CASH|IDEA|NETWORK|FACILITY|SALES
     * @param int    $value  Contribution value in IDR
     * @return array ['multiplier' => float, 'total_slices' => int]
     */
    public static function calculateSlices(string $type, int $value): array
    {
        $multiplier = match ($type) {
            'CASH'                              => 4.0,
            'TIME', 'IDEA', 'NETWORK',
            'FACILITY', 'SALES'                 => 2.0,
            default => throw new \InvalidArgumentException("Unknown contribution type: {$type}"),
        };

        return [
            'multiplier'   => $multiplier,
            'total_slices' => (int) round($value * $multiplier),
        ];
    }

    /**
     * Freeze equity — called when owner triggers freeze.
     * Marks the latest snapshot as frozen.
        */
    public function freeze(Team $team): EquitySnapshot
    {
        /** @var EquitySnapshot|null $latestSnapshot */
        $latestSnapshot = EquitySnapshot::where('team_id', $team->id)
            ->latest()
            ->first();

        if (!$latestSnapshot) {
            throw new \RuntimeException('No equity snapshot to freeze.');
        }

        DB::transaction(function () use ($team, $latestSnapshot) {
            $latestSnapshot->update(['is_frozen' => true]);
            $team->update([
                'is_frozen' => true,
                'frozen_at' => now(),
            ]);
        });

        return $latestSnapshot->fresh();
    }
}