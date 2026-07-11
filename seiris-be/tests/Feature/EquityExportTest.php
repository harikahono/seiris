<?php

namespace Tests\Feature;

use App\Models\Contribution;
use App\Models\EquitySnapshot;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EquityExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_returns_pdf_with_snapshot(): void
    {
        $owner  = User::factory()->create();
        $voter  = User::factory()->create();
        $team   = Team::factory()->create(['owner_id' => $owner->id]);

        TeamMember::factory()->create([
            'team_id' => $team->id, 'user_id' => $owner->id, 'role' => 'owner', 'fmr' => 50000,
        ]);
        TeamMember::factory()->create([
            'team_id' => $team->id, 'user_id' => $voter->id, 'role' => 'member', 'fmr' => 50000,
        ]);

        // Seed approved contribution → creates team-level equity snapshot
        $this->actingAs($owner, 'sanctum');
        $r = $this->postJson("/api/teams/{$team->id}/contributions", [
            'type' => 'CASH', 'description' => 'Export seed',
            'amount' => 100000, 'contribution_date' => now()->toDateString(),
        ]);
        $contribution = Contribution::find($r->json('data.id'));

        $this->actingAs($voter, 'sanctum');
        $this->postJson("/api/contributions/{$contribution->id}/vote", ['vote' => 'APPROVE']);

        // Export
        $this->actingAs($owner, 'sanctum');
        $r = $this->getJson("/api/teams/{$team->id}/equity/export");

        $r->assertOk();
        $r->assertHeader('content-type', 'application/pdf');
    }

    public function test_export_404_without_snapshot(): void
    {
        $owner = User::factory()->create();
        $team  = Team::factory()->create(['owner_id' => $owner->id]);
        TeamMember::factory()->create([
            'team_id' => $team->id, 'user_id' => $owner->id, 'role' => 'owner',
        ]);

        $this->actingAs($owner, 'sanctum');
        $r = $this->getJson("/api/teams/{$team->id}/equity/export");

        $r->assertStatus(404);
    }
}
