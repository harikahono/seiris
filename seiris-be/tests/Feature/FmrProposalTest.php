<?php

namespace Tests\Feature;

use App\Models\FmrProposal;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * A.6 — FMR proposal flow (public seam: HTTP + TeamMember.fmr).
 * Tracer: member proposes -> owner approve -> TeamMember.fmr updated.
 * Slice: reject keeps fmr; non-owner cannot approve (403).
 */
class FmrProposalTest extends TestCase
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
            'fmr'     => 50000,
        ]);

        $memberUser = User::factory()->create(['password' => Hash::make('secret123')]);
        $member = TeamMember::factory()->create([
            'team_id' => $team->id,
            'user_id' => $memberUser->id,
            'role'    => 'member',
            'fmr'     => 50000,
        ]);

        return [$ownerUser, $ownerMember, $team, $memberUser, $member];
    }

    public function test_member_proposes_and_owner_approve_updates_fmr(): void
    {
        [$ownerUser, $ownerMember, $team, $memberUser, $member] = $this->makeOwnerAndMember();

        $propose = $this->actingAs($memberUser, 'sanctum')
            ->postJson("/api/teams/{$team->id}/fmr-proposals", ['proposed_fmr' => 75000]);
        $propose->assertStatus(201);
        $proposalId = $propose->json('data.id');

        $this->actingAs($ownerUser, 'sanctum')
            ->postJson("/api/fmr-proposals/{$proposalId}/approve")
            ->assertStatus(200);

        $this->assertSame('APPROVED', FmrProposal::find($proposalId)->status);
        $this->assertSame(75000, TeamMember::find($member->id)->fmr);
    }

    public function test_owner_reject_keeps_original_fmr(): void
    {
        [$ownerUser, $ownerMember, $team, $memberUser, $member] = $this->makeOwnerAndMember();

        $propose = $this->actingAs($memberUser, 'sanctum')
            ->postJson("/api/teams/{$team->id}/fmr-proposals", ['proposed_fmr' => 75000]);
        $proposalId = $propose->json('data.id');

        $this->actingAs($ownerUser, 'sanctum')
            ->postJson("/api/fmr-proposals/{$proposalId}/reject")
            ->assertStatus(200);

        $this->assertSame('REJECTED', FmrProposal::find($proposalId)->status);
        $this->assertSame(50000, TeamMember::find($member->id)->fmr);
    }

    public function test_non_owner_cannot_approve(): void
    {
        [$ownerUser, $ownerMember, $team, $memberUser, $member] = $this->makeOwnerAndMember();

        // anggota kedua (bukan owner)
        $otherUser = User::factory()->create(['password' => Hash::make('secret123')]);
        TeamMember::factory()->create([
            'team_id' => $team->id,
            'user_id' => $otherUser->id,
            'role'    => 'member',
            'fmr'     => 50000,
        ]);

        $propose = $this->actingAs($memberUser, 'sanctum')
            ->postJson("/api/teams/{$team->id}/fmr-proposals", ['proposed_fmr' => 75000]);
        $proposalId = $propose->json('data.id');

        // anggota biasa mencoba approve -> 403 (Gate owner-only)
        $this->actingAs($otherUser, 'sanctum')
            ->postJson("/api/fmr-proposals/{$proposalId}/approve")
            ->assertStatus(403);

        $this->assertSame('PENDING', FmrProposal::find($proposalId)->status);
    }
}
