<?php

namespace Tests\Feature;

use App\Models\Contribution;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * T1.1 — ApprovalController vote edge cases.
 *
 * ════════════════════════════════════════════════════════════════════
 * NOTE: Tie-breaker dead-code finding
 * ════════════════════════════════════════════════════════════════════
 * handleTieBreaker() in ApprovalController is mathematically unreachable
 * given current branch order + threshold formulas:
 *
 *   approvePct >= T          → APPROVED
 *   rejectPct > (100-T)      → REJECTED
 *   approve==reject && allVoted → tie-breaker (3rd branch)
 *
 * For tie + all voted: approvePct = rejectPct = 50% (even split).
 * = 50 < T requires T > 50.
 * = rejectPct <= 100-T requires 50 <= 100-T → T <= 50.
 * Contradiction (T > 50 AND T <= 50) → tie branch dead.
 *
 * If tie-breaker needed, fix: swap tie-branch before reject-branch
 * AND change reject condition to use > (>=) to avoid overlap.
 * ────────────────────────────────────────────────────────────────
 */
class VoteEdgeCasesTest extends TestCase
{
    use RefreshDatabase;

    /** Create team with owner + contributor + N extra voters (all active). */
    private function makeTeam(int $extraVoters, int $threshold): array
    {
        $owner   = User::factory()->create();
        $team    = Team::factory()->create([
            'owner_id'           => $owner->id,
            'approval_threshold' => $threshold,
        ]);
        TeamMember::factory()->create([
            'team_id' => $team->id,
            'user_id' => $owner->id,
            'role'    => 'owner',
            'fmr'     => 50000,
        ]);
        $contributor = User::factory()->create();
        TeamMember::factory()->create([
            'team_id' => $team->id,
            'user_id' => $contributor->id,
            'role'    => 'member',
            'fmr'     => 50000,
        ]);
        $voters = collect();
        for ($i = 0; $i < $extraVoters; $i++) {
            $u = User::factory()->create();
            TeamMember::factory()->create([
                'team_id' => $team->id,
                'user_id' => $u->id,
                'role'    => 'member',
                'fmr'     => 50000,
            ]);
            $voters->push($u);
        }
        return compact('team', 'owner', 'contributor', 'voters');
    }

    private function createPendingContribution(Team $team, User $contributor): Contribution
    {
        $this->actingAs($contributor, 'sanctum');
        $r = $this->postJson("/api/teams/{$team->id}/contributions", [
            'type'              => 'CASH',
            'description'       => 'Test contribution',
            'amount'            => 100_000,
            'contribution_date' => now()->toDateString(),
        ]);
        return Contribution::find($r->json('data.id'));
    }

    /** 3/4 APPROVE with T=75 → APPROVED + equity snapshot. */
    public function test_threshold75_supermajority_approves(): void
    {
        $t = $this->makeTeam(3, 75);
        $c = $this->createPendingContribution($t['team'], $t['contributor']);

        $this->actingAs($t['voters'][0], 'sanctum');
        $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE']);

        $this->actingAs($t['voters'][1], 'sanctum');
        $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE']);

        $this->actingAs($t['voters'][2], 'sanctum');
        $r = $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE']);

        $r->assertOk();
        $c->refresh();
        $this->assertEquals('APPROVED', $c->status);
        $this->assertDatabaseHas('equity_snapshots', [
            'team_id'     => $t['team']->id,
            'total_slices' => 400_000,
        ]);
    }

    /** 2/4 APPROVE (only 2 voted) with T=75 → stays PENDING. */
    public function test_threshold75_insufficient_stays_pending(): void
    {
        $t = $this->makeTeam(3, 75);
        $c = $this->createPendingContribution($t['team'], $t['contributor']);

        $this->actingAs($t['voters'][0], 'sanctum');
        $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE']);

        $this->actingAs($t['voters'][1], 'sanctum');
        $r = $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE']);

        $r->assertOk();
        $c->refresh();
        $this->assertEquals('PENDING', $c->status);
    }

    /** 3/3 APPROVE with T=100 (unanimous) → APPROVED. */
    public function test_threshold100_unanimous_approves(): void
    {
        $t = $this->makeTeam(2, 100);
        $c = $this->createPendingContribution($t['team'], $t['contributor']);

        $this->actingAs($t['voters'][0], 'sanctum');
        $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE']);

        $this->actingAs($t['voters'][1], 'sanctum');
        $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE']);

        $this->actingAs($t['owner'], 'sanctum');
        $r = $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE']);

        $r->assertOk();
        $c->refresh();
        $this->assertEquals('APPROVED', $c->status);
        $this->assertDatabaseHas('equity_snapshots', [
            'team_id' => $t['team']->id,
            'total_slices' => 400_000,
        ]);
    }

    /** T=100: first reject triggers REJECTED (100-100=0, any reject >0). */
    public function test_threshold100_reject_vetoes(): void
    {
        $t = $this->makeTeam(2, 100);
        $c = $this->createPendingContribution($t['team'], $t['contributor']);

        $this->actingAs($t['voters'][0], 'sanctum');
        $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE']);

        $this->actingAs($t['voters'][1], 'sanctum');
        $r = $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'REJECT']);

        $r->assertOk();
        $c->refresh();
        $this->assertEquals('REJECTED', $c->status);
    }

    /** Self-vote blocked: contributor votes own → 403. */
    public function test_self_vote_forbidden(): void
    {
        $t = $this->makeTeam(1, 50);
        $c = $this->createPendingContribution($t['team'], $t['contributor']);

        $this->actingAs($t['contributor'], 'sanctum');
        $r = $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE']);

        $r->assertStatus(403);
        $c->refresh();
        $this->assertEquals('PENDING', $c->status);
    }

    /** Double-vote blocked: same member votes twice → second 409. */
    public function test_duplicate_vote_conflict(): void
    {
        $t = $this->makeTeam(1, 50);
        $c = $this->createPendingContribution($t['team'], $t['contributor']);

        $this->actingAs($t['voters'][0], 'sanctum');
        $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE']);

        $r = $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE']);
        $r->assertStatus(409);
    }

    /** Frozen team blocks voting → 409. */
    public function test_frozen_team_rejects_vote(): void
    {
        $t = $this->makeTeam(1, 50);
        $c = $this->createPendingContribution($t['team'], $t['contributor']);

        $t['team']->update(['is_frozen' => true, 'frozen_at' => now()]);

        $this->actingAs($t['voters'][0], 'sanctum');
        $r = $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE']);

        $r->assertStatus(409);
    }

    /** Majority REJECT → REJECTED, no equity snapshot created. */
    public function test_reject_path_no_snapshot(): void
    {
        $t = $this->makeTeam(2, 50); // 3 eligible (owner + 2 voters)
        $c = $this->createPendingContribution($t['team'], $t['contributor']);

        $this->actingAs($t['voters'][0], 'sanctum');
        $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'REJECT']);

        $this->actingAs($t['voters'][1], 'sanctum');
        $r = $this->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'REJECT']);

        $r->assertOk();
        $c->refresh();
        $this->assertEquals('REJECTED', $c->status);
        // No equity snapshot for rejected contribution
        $this->assertDatabaseMissing('equity_snapshots', ['team_id' => $t['team']->id]);
    }
}
