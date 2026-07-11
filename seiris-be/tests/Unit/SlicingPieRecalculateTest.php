<?php

namespace Tests\Unit;

use App\Models\Contribution;
use App\Models\EquitySnapshot;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\SlicingPieService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A.3 — SlicingPieService::recalculate correctness (public seam, team scope).
 * Karakterisasi: memastikan agregasi slice lintas member benar dan
 * kontribusi PENDING tidak ikut dihitung.
 */
class SlicingPieRecalculateTest extends TestCase
{
    use RefreshDatabase;

    private function makeTeamWithMembers(int $count): array
    {
        $team = Team::factory()->create();
        $members = [];
        for ($i = 0; $i < $count; $i++) {
            $members[] = TeamMember::factory()->create(['team_id' => $team->id]);
        }

        return [$team, $members];
    }

    private function approved(Team $team, TeamMember $member, int $slices, string $type = 'CASH'): void
    {
        Contribution::create([
            'team_id'           => $team->id,
            'member_id'         => $member->id,
            'project_id'        => null,
            'type'              => $type,
            'description'       => 'seed',
            'value'             => $slices,
            'multiplier'        => 1.0,
            'total_slices'      => $slices,
            'status'            => 'APPROVED',
            'contribution_date' => now(),
        ]);
    }

    public function test_recalculate_sums_approved_slices_across_members(): void
    {
        [$team, $members] = $this->makeTeamWithMembers(2);
        $this->approved($team, $members[0], 6000, 'CASH');
        $this->approved($team, $members[1], 4000, 'TIME');

        $snapshot = (new SlicingPieService())->recalculate($team);

        $this->assertSame(10000, $snapshot->total_slices);
        $this->assertSame(6000, $snapshot->equity_map[$members[0]->id]['slices']);
        $this->assertEqualsWithDelta(60.0, $snapshot->equity_map[$members[0]->id]['equity_pct'], 0.0001);
        $this->assertSame(4000, $snapshot->equity_map[$members[1]->id]['slices']);
        $this->assertEqualsWithDelta(40.0, $snapshot->equity_map[$members[1]->id]['equity_pct'], 0.0001);
    }

    public function test_recalculate_ignores_pending_contributions(): void
    {
        [$team, $members] = $this->makeTeamWithMembers(2);
        $this->approved($team, $members[0], 6000, 'CASH');
        $this->approved($team, $members[1], 4000, 'TIME');

        // PENDING tidak boleh masuk agregat.
        Contribution::create([
            'team_id'           => $team->id,
            'member_id'         => $members[0]->id,
            'project_id'        => null,
            'type'              => 'CASH',
            'description'       => 'pending',
            'value'             => 9000,
            'multiplier'        => 1.0,
            'total_slices'      => 9000,
            'status'            => 'PENDING',
            'contribution_date' => now(),
        ]);

        $snapshot = (new SlicingPieService())->recalculate($team);

        $this->assertSame(10000, $snapshot->total_slices);
        $this->assertSame(6000, $snapshot->equity_map[$members[0]->id]['slices']);
    }
}
