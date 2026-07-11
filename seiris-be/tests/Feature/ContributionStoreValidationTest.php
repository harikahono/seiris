<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContributionStoreValidationTest extends TestCase
{
    use RefreshDatabase;

    private function makeTeam(): array
    {
        $owner = User::factory()->create();
        $team  = Team::factory()->create(['owner_id' => $owner->id]);
        TeamMember::factory()->create([
            'team_id' => $team->id,
            'user_id' => $owner->id,
            'role'    => 'owner',
            'fmr'     => 50000,
        ]);
        return compact('team', 'owner');
    }

    /** CASH without amount → 422. */
    public function test_cash_requires_amount(): void
    {
        $t = $this->makeTeam();
        $this->actingAs($t['owner'], 'sanctum');

        $r = $this->postJson("/api/teams/{$t['team']->id}/contributions", [
            'type'              => 'CASH',
            'description'       => 'Test CASH amount required',
            'contribution_date' => now()->toDateString(),
        ]);

        $r->assertStatus(422);
        $r->assertJsonValidationErrors(['amount']);
    }

    /** TIME with FMR=0 member → 422 from controller guard. */
    public function test_time_with_fmr_zero_is_blocked(): void
    {
        $user = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $user->id]);
        // Member with zero FMR
        TeamMember::factory()->create([
            'team_id' => $team->id,
            'user_id' => $user->id,
            'role'    => 'member',
            'fmr'     => 0,
        ]);

        $this->actingAs($user, 'sanctum');
        $r = $this->postJson("/api/teams/{$team->id}/contributions", [
            'type'              => 'TIME',
            'description'       => 'Test TIME with FMR 0',
            'hours'             => 5,
            'contribution_date' => now()->toDateString(),
        ]);

        $r->assertStatus(422);
        $r->assertJsonPath('message', 'FMR kamu belum diset oleh owner untuk tim. Minta owner set FMR kamu terlebih dahulu.');
    }

    /** Unknown type → 422. */
    public function test_invalid_type_returns_422(): void
    {
        $t = $this->makeTeam();
        $this->actingAs($t['owner'], 'sanctum');

        $r = $this->postJson("/api/teams/{$t['team']->id}/contributions", [
            'type'              => 'BONUS',
            'description'       => 'Invalid type test',
            'contribution_date' => now()->toDateString(),
        ]);

        $r->assertStatus(422);
        $r->assertJsonValidationErrors(['type']);
    }

    /** Non-member (user not on team) → 403. */
    public function test_non_member_gets_403(): void
    {
        $t    = $this->makeTeam();
        $outsider = User::factory()->create();

        $this->actingAs($outsider, 'sanctum');
        $r = $this->postJson("/api/teams/{$t['team']->id}/contributions", [
            'type'              => 'CASH',
            'description'       => 'Outsider attempt',
            'amount'            => 100_000,
            'contribution_date' => now()->toDateString(),
        ]);

        $r->assertStatus(403);
        $r->assertJsonPath('message', 'Kamu bukan anggota tim ini.');
    }

    /** Frozen team → 403. */
    public function test_frozen_team_blocks_creation(): void
    {
        $t = $this->makeTeam();
        $t['team']->update(['is_frozen' => true, 'frozen_at' => now()]);

        $this->actingAs($t['owner'], 'sanctum');
        $r = $this->postJson("/api/teams/{$t['team']->id}/contributions", [
            'type'              => 'CASH',
            'description'       => 'Frozen team attempt',
            'amount'            => 100_000,
            'contribution_date' => now()->toDateString(),
        ]);

        $r->assertStatus(403);
    }
}
