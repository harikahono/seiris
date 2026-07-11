<?php

namespace Tests\Feature;

use App\Models\Contribution;
use App\Models\EquitySnapshot;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContributionFsmTest extends TestCase
{
    use RefreshDatabase;

    private function makeTeamWithMembers(): array
    {
        $owner = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $owner->id, 'approval_threshold' => 50]);

        $ownerMember = TeamMember::factory()->create([
            'team_id' => $team->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'fmr' => 50000,
        ]);

        $contributor = User::factory()->create();
        $contributorMember = TeamMember::factory()->create([
            'team_id' => $team->id,
            'user_id' => $contributor->id,
            'role' => 'member',
            'fmr' => 50000,
        ]);

        $voter = User::factory()->create();
        $voterMember = TeamMember::factory()->create([
            'team_id' => $team->id,
            'user_id' => $voter->id,
            'role' => 'member',
            'fmr' => 50000,
        ]);

        return compact('team', 'owner', 'ownerMember', 'contributor', 'contributorMember', 'voter', 'voterMember');
    }

    /**
     * A.4a tracer: a newly created contribution enters the FSM as PENDING.
     */
    public function test_new_contribution_starts_pending(): void
    {
        $t = $this->makeTeamWithMembers();

        $this->actingAs($t['contributor'], 'sanctum');

        $response = $this->postJson("/api/teams/{$t['team']->id}/contributions", [
            'type' => 'CASH',
            'description' => 'Modal awal buat tim',
            'amount' => 1000000,
            'contribution_date' => now()->toDateString(),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'PENDING');
    }

    /**
     * A.4b tracer: a teammate's APPROVE vote moves the contribution to APPROVED
     * and produces an equity snapshot for the team.
     */
    public function test_approval_by_teammate_creates_snapshot(): void
    {
        $t = $this->makeTeamWithMembers();

        // Contributor logs the CASH contribution
        $this->actingAs($t['contributor'], 'sanctum');
        $create = $this->postJson("/api/teams/{$t['team']->id}/contributions", [
            'type' => 'CASH',
            'description' => 'Modal awal buat tim',
            'amount' => 1000000,
            'contribution_date' => now()->toDateString(),
        ]);
        $contributionId = $create->json('data.id');

        // Teammate votes APPROVE (threshold 50, 1 of 2 eligible voters)
        $this->actingAs($t['voter'], 'sanctum');
        $vote = $this->postJson("/api/contributions/{$contributionId}/vote", [
            'vote' => 'APPROVE',
        ]);

        $vote->assertStatus(200)
            ->assertJsonPath('data.status', 'APPROVED');

        // Equity snapshot for the team now exists, carrying the CASH slices (1000000 * 4)
        $this->assertDatabaseHas('equity_snapshots', [
            'team_id' => $t['team']->id,
            'project_id' => null,
            'total_slices' => 4000000,
        ]);
        $this->assertSame(1, EquitySnapshot::where('team_id', $t['team']->id)->whereNull('project_id')->count());
    }
}
