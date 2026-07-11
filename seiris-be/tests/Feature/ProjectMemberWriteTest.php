<?php

namespace Tests\Feature;

use App\Models\ProjectMember;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectMemberWriteTest extends TestCase
{
    use RefreshDatabase;

    /** Helper: team with owner + 1 member + 1 voter. */
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

    /** POST create project auto-adds owner to project_members roster. */
    public function test_create_project_adds_owner_to_project_members(): void
    {
        $t = $this->makeTeam();

        $this->actingAs($t['owner'], 'sanctum');
        $r = $this->postJson("/api/teams/{$t['team']->id}/projects", [
            'name' => 'Project Alpha',
            'description' => 'Test project',
        ]);

        $r->assertStatus(201);
        $projectId = $r->json('data.id');

        $this->assertDatabaseHas('project_members', [
            'project_id'      => $projectId,
            'team_member_id'  => $t['ownerMember']->id,
        ]);
    }

    /** Owner can add member to project roster. */
    public function test_owner_adds_member_to_project(): void
    {
        $t = $this->makeTeam();

        // Create project first (auto-adds owner)
        $this->actingAs($t['owner'], 'sanctum');
        $r = $this->postJson("/api/teams/{$t['team']->id}/projects", [
            'name' => 'Project Beta',
            'description' => 'Another project',
        ]);
        $projectId = $r->json('data.id');

        // Seed a contribution so owner is in project scope (middleware check)
        // Actually owner was auto-added at store — directly try addMember.
        $r2 = $this->postJson("/api/teams/{$t['team']->id}/projects/{$projectId}/members", [
            'member_id' => $t['regular']->id,
        ]);
        $r2->assertStatus(200);

        $this->assertDatabaseHas('project_members', [
            'project_id'      => $projectId,
            'team_member_id'  => $t['regular']->id,
        ]);
    }

    /** PUT set per-project FMR creates project_members row with correct fmr. */
    public function test_set_per_project_fmr_creates_project_member(): void
    {
        $t = $this->makeTeam();

        // Create project first
        $this->actingAs($t['owner'], 'sanctum');
        $r = $this->postJson("/api/teams/{$t['team']->id}/projects", [
            'name' => 'Project Gamma',
            'description' => 'FMR test',
        ]);
        $projectId = $r->json('data.id');

        // Set per-project FMR for regular member
        $r2 = $this->putJson("/api/teams/{$t['team']->id}/members/{$t['regular']->id}/fmr", [
            'fmr'        => 75000,
            'project_id' => $projectId,
        ]);
        $r2->assertOk();

        $this->assertDatabaseHas('project_members', [
            'project_id'      => $projectId,
            'team_member_id'  => $t['regular']->id,
            'fmr'             => 75000,
        ]);
    }
}
