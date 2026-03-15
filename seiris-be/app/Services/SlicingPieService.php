<?php

namespace App\Services;

use App\Models\Team;
use App\Models\EquitySnapshot;
use App\Events\EquityUpdated;
use Illuminate\Support\Facades\DB;

class SlicingPieService
{
    /**
     * Recalculate equity for all active members of a team.
     * Called every time a contribution status changes to APPROVED.
     *
     * @param Team $team
     * @param string|null $triggeredByContributionId UUID of the contribution that triggered this
     */
    public function recalculate(Team $team, ?string $triggeredByContributionId = null): EquitySnapshot
    {
        // Load all APPROVED contributions with their member
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

        // Persist snapshot inside a transaction
        $snapshot = DB::transaction(function () use ($team, $triggeredByContributionId, $totalSlicesTeam, $equityMap) {
            return EquitySnapshot::create([
                'team_id'                    => $team->id,
                'triggered_by_contribution'  => $triggeredByContributionId,
                'total_slices'               => $totalSlicesTeam,
                'equity_map'                 => $equityMap,
                'is_frozen'                  => false,
            ]);
        });

        // Broadcast realtime update to team channel
        broadcast(new EquityUpdated($team, $snapshot))->toOthers();

        return $snapshot;
    }

    /**
     * Calculate slices for a given contribution type, value, and FMR.
     *
     * @param string $type   TIME|CASH|IDEA|NETWORK|FACILITY|REVENUE
     * @param int    $value  Contribution value in IDR
     * @return array ['multiplier' => float, 'total_slices' => int]
     */
    public static function calculateSlices(string $type, int $value): array
    {
        $multiplier = match ($type) {
            'CASH'                              => 4.0,
            'TIME', 'IDEA', 'NETWORK',
            'FACILITY', 'REVENUE'               => 2.0,
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