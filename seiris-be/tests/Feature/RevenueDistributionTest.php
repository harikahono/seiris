<?php

namespace Tests\Feature;

use App\Models\EquitySnapshot;
use App\Models\ProfitDistribution;
use App\Models\Revenue;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * A.5 — Revenue distribution (public seam: HTTP + ProfitDistribution rows).
 * Tracer: owner catat revenue (pending) -> member request-distribute ->
 * owner distribute -> ProfitDistribution per member dgn share = pct dari
 * distributable_amount (literal). Plus guard M2 (distribute sebelum request = 409).
 */
class RevenueDistributionTest extends TestCase
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
        EquitySnapshot::create([
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

    public function test_full_distribution_creates_profit_shares_per_equity_pct(): void
    {
        [$ownerUser, $ownerMember, $team, $memberUser, $member] = $this->makeOwnerAndMember();
        $this->seedSnapshot($team, $ownerMember, $member);

        // 1) Owner catat revenue (pending)
        $store = $this->actingAs($ownerUser, 'sanctum')->postJson("/api/teams/{$team->id}/revenues", [
            'description'          => 'Pendapatan Juni 2026',
            'amount'               => 1000000,
            'distributable_amount' => 1000000,
            'revenue_date'         => now()->format('Y-m-d'),
        ]);
        $store->assertStatus(201);
        $revenueId = $store->json('data.id');

        // 2) Member ajukan distribusi
        $this->actingAs($memberUser, 'sanctum')
            ->postJson("/api/revenues/{$revenueId}/request-distribute")
            ->assertStatus(200);

        $this->assertDatabaseHas('revenues', ['id' => $revenueId, 'status' => 'distribute_requested']);

        // 3) Owner distribusikan
        $this->actingAs($ownerUser, 'sanctum')
            ->postJson("/api/revenues/{$revenueId}/distribute")
            ->assertStatus(200);

        // 4) Assert state + profit split (literal)
        $revenue = Revenue::find($revenueId);
        $this->assertSame('distributed', $revenue->status);
        $this->assertTrue($revenue->is_distributed);

        $this->assertDatabaseCount('profit_distributions', 2);

        $ownerShare = ProfitDistribution::where('revenue_id', $revenueId)
            ->where('member_id', $ownerMember->id)->first();
        $memberShare = ProfitDistribution::where('revenue_id', $revenueId)
            ->where('member_id', $member->id)->first();

        $this->assertNotNull($ownerShare);
        $this->assertNotNull($memberShare);
        $this->assertSame(600000, $ownerShare->amount);   // 60% dari 1.000.000
        $this->assertSame(400000, $memberShare->amount);  // 40% dari 1.000.000
        $this->assertEqualsWithDelta(60.0, $ownerShare->equity_pct_snapshot, 0.0001);
        $this->assertEqualsWithDelta(40.0, $memberShare->equity_pct_snapshot, 0.0001);
    }

    public function test_owner_can_distribute_directly_without_member_request(): void
    {
        [$ownerUser, $ownerMember, $team, $memberUser, $member] = $this->makeOwnerAndMember();
        $this->seedSnapshot($team, $ownerMember, $member);

        $store = $this->actingAs($ownerUser, 'sanctum')->postJson("/api/teams/{$team->id}/revenues", [
            'description'          => 'Pendapatan Juli 2026',
            'amount'               => 500000,
            'distributable_amount' => 500000,
            'revenue_date'         => now()->format('Y-m-d'),
        ]);
        $store->assertStatus(201);
        $revenueId = $store->json('data.id');

        // Langsung distribute dari pending tanpa ajuan member -> 200
        $this->actingAs($ownerUser, 'sanctum')
            ->postJson("/api/revenues/{$revenueId}/distribute")
            ->assertStatus(200);

        $revenue = Revenue::find($revenueId);
        $this->assertSame('distributed', $revenue->status);
        $this->assertTrue($revenue->is_distributed);
            $this->assertDatabaseCount('profit_distributions', 2);
    }

    public function test_distribute_uses_latest_snapshot_not_oldest(): void
    {
        [$ownerUser, $ownerMember, $team, $memberUser, $member] = $this->makeOwnerAndMember();

        // Snapshot LAMA (60/40) — harusnya diabaikan
        $old = EquitySnapshot::create([
            'team_id'      => $team->id,
            'project_id'   => null,
            'total_slices' => 10000,
            'equity_map'   => [
                $ownerMember->id => ['slices' => 6000, 'equity_pct' => 60.0],
                $member->id      => ['slices' => 4000, 'equity_pct' => 40.0],
            ],
            'is_frozen'    => false,
        ]);
        $old->forceFill(['created_at' => now()->subHour()])->save();

        // Snapshot BARU (70/30) — ini yang dipakai
        EquitySnapshot::create([
            'team_id'      => $team->id,
            'project_id'   => null,
            'total_slices' => 10000,
            'equity_map'   => [
                $ownerMember->id => ['slices' => 7000, 'equity_pct' => 70.0],
                $member->id      => ['slices' => 3000, 'equity_pct' => 30.0],
            ],
            'is_frozen'    => false,
        ]);

        $store = $this->actingAs($ownerUser, 'sanctum')->postJson("/api/teams/{$team->id}/revenues", [
            'description'          => 'Revenue bug-1',
            'amount'               => 1000000,
            'distributable_amount' => 1000000,
            'revenue_date'         => now()->format('Y-m-d'),
        ]);
        $store->assertStatus(201);
        $revenueId = $store->json('data.id');

        $this->actingAs($ownerUser, 'sanctum')
            ->postJson("/api/revenues/{$revenueId}/distribute")
            ->assertStatus(200);

        $ownerShare = ProfitDistribution::where('revenue_id', $revenueId)
            ->where('member_id', $ownerMember->id)->first();
        $memberShare = ProfitDistribution::where('revenue_id', $revenueId)
            ->where('member_id', $member->id)->first();

        $this->assertSame(700000, $ownerShare->amount);  // 70% (latest), bukan 60%
        $this->assertSame(300000, $memberShare->amount);
    }
}
