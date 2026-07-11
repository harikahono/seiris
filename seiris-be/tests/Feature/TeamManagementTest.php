<?php

namespace Tests\Feature;

use App\Models\Contribution;
use App\Models\EquitySnapshot;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamManagementTest extends TestCase
{
    use RefreshDatabase;

    /** Helper: team with owner + 1 regular member + 1 other user (voter for approval). */
    private function makeTeam(): array
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $voter  = User::factory()->create();
        $team   = Team::factory()->create(['owner_id' => $owner->id]);

        $ownerMember = TeamMember::factory()->create([
            'team_id' => $team->id, 'user_id' => $owner->id,
            'role' => 'owner', 'fmr' => 50000,
        ]);
        $regular = TeamMember::factory()->create([
            'team_id' => $team->id, 'user_id' => $member->id,
            'role' => 'member', 'fmr' => 50000,
        ]);
        $voterMember = TeamMember::factory()->create([
            'team_id' => $team->id, 'user_id' => $voter->id,
            'role' => 'member', 'fmr' => 50000,
        ]);

        return compact('team', 'owner', 'ownerMember', 'member', 'regular', 'voter');
    }

    /** Seed a team-level equity snapshot so freeze works. */
    private function seedApprovedContribution(Team $team, User $owner, User $voter): void
    {
        $this->actingAs($owner, 'sanctum');
        $r = $this->postJson("/api/teams/{$team->id}/contributions", [
            'type' => 'CASH', 'description' => 'Seeded snapshot test',
            'amount' => 100000, 'contribution_date' => now()->toDateString(),
        ]);
        $contribution = Contribution::find($r->json('data.id'));

        $this->actingAs($voter, 'sanctum');
        $this->postJson("/api/contributions/{$contribution->id}/vote", ['vote' => 'APPROVE']);
    }

    /** Owner freeze succeeds. */
    public function test_owner_can_freeze(): void
    {
        $t = $this->makeTeam();
        $this->seedApprovedContribution($t['team'], $t['owner'], $t['voter']);

        $this->actingAs($t['owner'], 'sanctum');
        $r = $this->postJson("/api/teams/{$t['team']->id}/freeze");

        $r->assertOk();
        $t['team']->refresh();
        $this->assertTrue($t['team']->is_frozen);
    }

    /** Non-owner cannot freeze. */
    public function test_non_owner_cannot_freeze(): void
    {
        $t = $this->makeTeam();
        $this->seedApprovedContribution($t['team'], $t['owner'], $t['voter']);

        $this->actingAs($t['member'], 'sanctum');
        $r = $this->postJson("/api/teams/{$t['team']->id}/freeze");

        $r->assertStatus(403);
    }

    /** Owner can set member FMR. */
    public function test_owner_can_set_fmr(): void
    {
        $t = $this->makeTeam();

        $this->actingAs($t['owner'], 'sanctum');
        $r = $this->putJson("/api/teams/{$t['team']->id}/members/{$t['regular']->id}/fmr", [
            'fmr' => 75000,
        ]);

        $r->assertOk();
        $t['regular']->refresh();
        $this->assertEquals(75000, $t['regular']->fmr);
    }

    /** Non-owner cannot set FMR. */
    public function test_non_owner_cannot_set_fmr(): void
    {
        $t = $this->makeTeam();

        $this->actingAs($t['member'], 'sanctum');
        $r = $this->putJson("/api/teams/{$t['team']->id}/members/{$t['regular']->id}/fmr", [
            'fmr' => 75000,
        ]);

        $r->assertStatus(403);
    }

    /** Owner can exit a regular member. */
    public function test_owner_can_exit_member(): void
    {
        $t = $this->makeTeam();

        $this->actingAs($t['owner'], 'sanctum');
        $r = $this->postJson("/api/teams/{$t['team']->id}/members/{$t['regular']->id}/exit");

        $r->assertOk();
        $t['regular']->refresh();
        $this->assertEquals('exited', $t['regular']->status);
    }

    /** Owner cannot exit themselves. */
    public function test_owner_cannot_exit_self(): void
    {
        $t = $this->makeTeam();

        $this->actingAs($t['owner'], 'sanctum');
        $r = $this->postJson("/api/teams/{$t['team']->id}/members/{$t['ownerMember']->id}/exit");

        $r->assertStatus(403);
    }
}
