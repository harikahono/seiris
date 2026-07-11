<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamMembershipMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_member_gets_403(): void
    {
        $team = Team::factory()->create();
        $outsider = User::factory()->create();

        $this->actingAs($outsider, 'sanctum');
        $r = $this->getJson("/api/teams/{$team->id}/contributions");

        $r->assertStatus(403);
    }

    public function test_member_gets_200(): void
    {
        $owner = User::factory()->create();
        $team  = Team::factory()->create(['owner_id' => $owner->id]);
        TeamMember::factory()->create([
            'team_id' => $team->id, 'user_id' => $owner->id, 'role' => 'owner',
        ]);

        $this->actingAs($owner, 'sanctum');
        $r = $this->getJson("/api/teams/{$team->id}/contributions");

        $r->assertOk();
    }
}
