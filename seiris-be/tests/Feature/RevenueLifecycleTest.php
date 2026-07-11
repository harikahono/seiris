<?php

namespace Tests\Feature;

use App\Models\Contribution;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RevenueLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function makeTeam(): array
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $voter  = User::factory()->create();
        $team   = Team::factory()->create(['owner_id' => $owner->id]);

        TeamMember::factory()->create([
            'team_id' => $team->id, 'user_id' => $owner->id, 'role' => 'owner', 'fmr' => 50000,
        ]);
        TeamMember::factory()->create([
            'team_id' => $team->id, 'user_id' => $member->id, 'role' => 'member', 'fmr' => 50000,
        ]);
        TeamMember::factory()->create([
            'team_id' => $team->id, 'user_id' => $voter->id, 'role' => 'member', 'fmr' => 50000,
        ]);

        return compact('team', 'owner', 'member', 'voter');
    }

    public function test_owner_can_create_revenue(): void
    {
        $t = $this->makeTeam();

        $this->actingAs($t['owner'], 'sanctum');
        $r = $this->postJson("/api/teams/{$t['team']->id}/revenues", [
            'description'  => 'Client payment',
            'amount'       => 1_000_000,
            'revenue_date' => now()->toDateString(),
        ]);

        $r->assertStatus(201);
        $r->assertJsonPath('data.description', 'Client payment');
    }

    public function test_non_owner_cannot_create_revenue(): void
    {
        $t = $this->makeTeam();

        $this->actingAs($t['member'], 'sanctum');
        $r = $this->postJson("/api/teams/{$t['team']->id}/revenues", [
            'description'  => 'Member attempt',
            'amount'       => 1_000_000,
            'revenue_date' => now()->toDateString(),
        ]);

        $r->assertStatus(403);
    }

    public function test_member_can_request_distribution(): void
    {
        $t = $this->makeTeam();

        // Owner creates revenue
        $this->actingAs($t['owner'], 'sanctum');
        $create = $this->postJson("/api/teams/{$t['team']->id}/revenues", [
            'description'  => 'Shared revenue',
            'amount'       => 1_000_000,
            'revenue_date' => now()->toDateString(),
        ]);
        $revenueId = $create->json('data.id');

        // Member requests distribution
        $this->actingAs($t['member'], 'sanctum');
        $r = $this->postJson("/api/revenues/{$revenueId}/request-distribute");

        $r->assertOk();
        $r->assertJsonPath('data.status', 'distribute_requested');
    }
}
