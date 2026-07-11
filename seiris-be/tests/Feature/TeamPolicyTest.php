<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * A.7 — Team policy (public seam: HTTP).
 * Tracer: owner-only freeze; join via invite_code.
 */
class TeamPolicyTest extends TestCase
{
    use RefreshDatabase;

    private function makeOwnerAndMember(): array
    {
        $ownerUser = User::factory()->create(['password' => Hash::make('secret123')]);
        $team = Team::factory()->create(['owner_id' => $ownerUser->id]);
        $ownerMember = TeamMember::factory()->create([
            'team_id' => $team->id,
            'user_id' => $ownerUser->id,
            'role'    => 'owner',
        ]);

        $memberUser = User::factory()->create(['password' => Hash::make('secret123')]);
        $member = TeamMember::factory()->create([
            'team_id' => $team->id,
            'user_id' => $memberUser->id,
            'role'    => 'member',
        ]);

        return [$ownerUser, $ownerMember, $team, $memberUser, $member];
    }

    private function seedSnapshot(Team $team, TeamMember $a, TeamMember $b): void
    {
        \App\Models\EquitySnapshot::create([
            'team_id'      => $team->id,
            'project_id'   => null,
            'total_slices' => 10000,
            'equity_map'   => [
                $a->id => ['slices' => 6000, 'equity_pct' => 60.0],
                $b->id => ['slices' => 4000, 'equity_pct' => 40.0],
            ],
            'is_frozen'    => false,
        ]);
    }

    public function test_owner_can_freeze_team(): void
    {
        [$ownerUser, $ownerMember, $team, $memberUser, $member] = $this->makeOwnerAndMember();
        $this->seedSnapshot($team, $ownerMember, $member);

        $this->actingAs($ownerUser, 'sanctum')
            ->postJson("/api/teams/{$team->id}/freeze")
            ->assertStatus(200);

        $this->assertTrue(Team::find($team->id)->is_frozen);
    }

    public function test_non_owner_cannot_freeze_team(): void
    {
        [$ownerUser, $ownerMember, $team, $memberUser] = $this->makeOwnerAndMember();

        $this->actingAs($memberUser, 'sanctum')
            ->postJson("/api/teams/{$team->id}/freeze")
            ->assertStatus(403);

        $this->assertFalse(Team::find($team->id)->is_frozen);
    }

    public function test_user_can_join_via_invite_code(): void
    {
        [, , $team] = $this->makeOwnerAndMember();
        $inviteCode = Team::find($team->id)->invite_code;

        $joiner = User::factory()->create(['password' => Hash::make('secret123')]);

        $this->actingAs($joiner, 'sanctum')
            ->postJson('/api/teams/join', ['invite_code' => $inviteCode])
            ->assertStatus(201);

        $this->assertDatabaseHas('team_members', [
            'team_id' => $team->id,
            'user_id' => $joiner->id,
            'status'  => 'active',
        ]);
    }
}
