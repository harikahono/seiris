<?php

namespace Tests\Unit;

use App\Models\Contribution;
use App\Models\Team;
use App\Models\TeamMember;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A.2 — Contribution model immutability (public seam: model).
 * Tracer: status accessors. Slice: total_slices immutable, delete blocked.
 */
class ContributionModelTest extends TestCase
{
    use RefreshDatabase;

    private function makeContribution(string $status = 'PENDING', int $slices = 4000): Contribution
    {
        $team = Team::factory()->create();
        $member = TeamMember::factory()->create(['team_id' => $team->id]);

        return Contribution::create([
            'team_id'           => $team->id,
            'member_id'         => $member->id,
            'project_id'        => null,
            'type'              => 'CASH',
            'description'       => 'seed',
            'value'             => $slices,
            'multiplier'        => 1.0,
            'total_slices'      => $slices,
            'status'            => $status,
            'contribution_date' => now(),
        ]);
    }

    public function test_status_accessors_reflect_fsm_state(): void
    {
        $c = $this->makeContribution('PENDING');
        $this->assertTrue($c->isPending());
        $this->assertFalse($c->isApproved());

        $c->status = 'APPROVED';
        $c->save();

        $this->assertTrue($c->fresh()->isApproved());
    }

    public function test_total_slices_is_immutable_after_creation(): void
    {
        $c = $this->makeContribution('APPROVED', 4000);
        $c->total_slices = 9999;
        $c->save();

        $this->assertSame(4000, $c->fresh()->total_slices);
    }

    public function test_delete_is_blocked(): void
    {
        $c = $this->makeContribution('PENDING');
        $deleted = $c->delete();

        $this->assertFalse($deleted);
        $this->assertDatabaseHas('contributions', ['id' => $c->id]);
    }
}
