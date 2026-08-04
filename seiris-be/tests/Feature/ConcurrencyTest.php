<?php

namespace Tests\Feature;

use App\Models\Contribution;
use App\Models\EquitySnapshot;
use App\Models\ProfitDistribution;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Services\SlicingPieService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * C-01..C-05 — Concurrency-safety invariance criterion (BAB IV 4.4).
 *
 * SQLite tidak mendukung SELECT ... FOR UPDATE (Laravel jadikan no-op untuk
 * driver tsb), jadi bilobu lewat invariant yang justru PST guard lindungi —
 * kondisi yang bakal software bahasa bila dua proses race tanpa kunci.
 * Semua skenario ditulis deterministik (single-threaded) dan mencerminkan
 * jalur yang eksisti bermasalah dalam transaksi real-time.
 */
class ConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    /** Owner + contributor + N extra voters, semua active. */
    private function makeTeam(int $extraVoters, int $threshold): array
    {
        $owner   = User::factory()->create();
        $team    = Team::factory()->create([
            'owner_id'           => $owner->id,
            'approval_threshold' => $threshold,
        ]);
        TeamMember::factory()->create([
            'team_id' => $team->id, 'user_id' => $owner->id, 'role' => 'owner', 'fmr' => 50000,
        ]);
        $contributor = User::factory()->create();
        TeamMember::factory()->create([
            'team_id' => $team->id, 'user_id' => $contributor->id, 'role' => 'member', 'fmr' => 50000,
        ]);
        $voters = collect();
        for ($i = 0; $i < $extraVoters; $i++) {
            $u = User::factory()->create();
            TeamMember::factory()->create([
                'team_id' => $team->id, 'user_id' => $u->id, 'role' => 'member', 'fmr' => 50000,
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
            'description'       => 'Kontribusi concurrency',
            'amount'            => 100_000,
            'contribution_date' => now()->toDateString(),
        ]);
        return Contribution::find($r->json('data.id'));
    }

    private function makeOwnerAndMember(): array
    {
        $ownerUser = User::factory()->create(['password' => Hash::make('secret123')]);
        $team = Team::factory()->create(['owner_id' => $ownerUser->id, 'approval_threshold' => 50]);
        $ownerMember = TeamMember::factory()->create([
            'team_id' => $team->id, 'user_id' => $ownerUser->id, 'role' => 'owner',
        ]);
        $memberUser = User::factory()->create();
        $member = TeamMember::factory()->create([
            'team_id' => $team->id, 'user_id' => $memberUser->id, 'role' => 'member',
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

    private function createRevenue(Team $team, User $ownerUser): string
    {
        $store = $this->actingAs($ownerUser, 'sanctum')->postJson("/api/teams/{$team->id}/revenues", [
            'description'          => 'Pendapatan concurrency',
            'amount'               => 1000000,
            'distributable_amount' => 1000000,
            'revenue_date'         => now()->toDateString(),
        ]);
        $store->assertStatus(201);
        return $store->json('data.id');
    }

    /**
     * C-01 — Redistribusi tidak boleh menggandakan payout.
     * Guard: Revenue::lockForUpdate() -> is_distributed -> tolak.
     */
    public function test_c01_double_distribute_never_doubles_payout(): void
    {
        [$ownerUser, $ownerMember, $team, , $member] = $this->makeOwnerAndMember();
        $this->seedSnapshot($team, $ownerMember, $member);

        $revenueId = $this->createRevenue($team, $ownerUser);

        $this->actingAs($ownerUser, 'sanctum')
            ->postJson("/api/revenues/{$revenueId}/distribute")
            ->assertStatus(200);

        // Kirim ulang distribusi (simulasi dua proses nyasar ke endpoint yg sama)
        $resp = $this->actingAs($ownerUser, 'sanctum')
            ->postJson("/api/revenues/{$revenueId}/distribute");
        $this->assertTrue($resp->status() >= 400, 'Redistribusi harus ditolak');

        // payout TIDAK dobel: tetap 2 profit share, total == distributable_amount
        $this->assertDatabaseCount('profit_distributions', 2);
        $this->assertSame(
            1000000,
            ProfitDistribution::where('revenue_id', $revenueId)->sum('amount')
        );
    }

    /**
     * C-02 — Double-vote ditolak & snapshot tidak terduplikasi.
     * Guard ApprovalController::lockForUpdate().
     */
    public function test_c02_duplicate_vote_rejected_and_single_snapshot(): void
    {
        $t = $this->makeTeam(2, 100);
        $c = $this->createPendingContribution($t['team'], $t['contributor']);

        // 3/3 APPROVE (owner + 2 voters) -> APPROVED + 1 snapshot
        foreach ($t['voters'] as $voter) {
            $this->actingAs($voter, 'sanctum')
                ->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE']);
        }
        $this->actingAs($t['owner'], 'sanctum')
            ->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE'])->assertOk();

        $c->refresh();
        $this->assertEquals('APPROVED', $c->status);
        $this->assertSame(1, EquitySnapshot::where('team_id', $t['team']->id)->count());

        // Vote duplikat -> 409, dan SNAPSHOT tetap satu
        $this->actingAs($t['voters'][0], 'sanctum')
            ->postJson("/api/contributions/{$c->id}/vote", ['vote' => 'APPROVE'])
            ->assertStatus(409);
        $this->assertSame(1, EquitySnapshot::where('team_id', $t['team']->id)->count());
    }

    /**
     * C-03 — Zero-loss: total_slices agregat = jumlah slice kontribusi approved.
     * Race perhitungan yg gagal akan menghasilkan total meleset.
     */
    public function test_c03_recalc_total_slices_is_lossless_sum(): void
    {
        $team = Team::factory()->create();
        $m1 = TeamMember::factory()->create(['team_id' => $team->id]);
        $m2 = TeamMember::factory()->create(['team_id' => $team->id]);

        Contribution::create([
            'team_id' => $team->id, 'member_id' => $m1->id, 'project_id' => null,
            'type' => 'CASH', 'description' => 'a', 'value' => 6000,
            'multiplier' => 1.0, 'total_slices' => 6000, 'status' => 'APPROVED',
            'contribution_date' => now(),
        ]);
        Contribution::create([
            'team_id' => $team->id, 'member_id' => $m2->id, 'project_id' => null,
            'type' => 'TIME', 'description' => 'b', 'value' => 4000,
            'multiplier' => 1.0, 'total_slices' => 4000, 'status' => 'APPROVED',
            'contribution_date' => now(),
        ]);

        $snapshot = (new SlicingPieService())->recalculate($team);

        $this->assertSame(10000, $snapshot->total_slices);
        $sum = collect($snapshot->equity_map)->sum('equity_pct');
        $this->assertEqualsWithDelta(100.0, $sum, 0.01);
    }

    /**
     * C-04 — EquitySnapshot append-only: update non-{is_frozen} & delete diblokir.
     */
    public function test_c04_snapshot_is_append_only(): void
    {
        $snap = EquitySnapshot::create([
            'team_id' => Team::factory()->create()->id, 'project_id' => null,
            'total_slices' => 10000, 'equity_map' => [], 'is_frozen' => false,
        ]);

        // Update kolom sensitif ditolak (M1)
        $snap->total_slices = 999999;
        $snap->equity_map   = ['member' => ['slices' => 1, 'equity_pct' => 100.0]];
        $this->assertFalse($snap->save());
        $snap->refresh();
        $this->assertSame(10000, $snap->total_slices);

        // Satu-satunya field mutable: is_frozen (freeze)
        $snap->is_frozen = true;
        $this->assertTrue($snap->save());

        // Delete selalu diblokir (C-A)
        $this->assertFalse($snap->delete());
        $this->assertDatabaseHas('equity_snapshots', ['id' => $snap->id]);
    }

    /**
     * C-05 — Alokasi keuntungan = 100% distributable_amount (tanpa kebocoran/race).
     */
    public function test_c05_profit_shares_fully_allocate_distributable_amount(): void
    {
        [$ownerUser, $ownerMember, $team, , $member] = $this->makeOwnerAndMember();
        $this->seedSnapshot($team, $ownerMember, $member);

        $revenueId = $this->createRevenue($team, $ownerUser);
        $this->actingAs($ownerUser, 'sanctum')
            ->postJson("/api/revenues/{$revenueId}/distribute")
            ->assertStatus(200);

        $this->assertSame(
            600000,
            ProfitDistribution::where('revenue_id', $revenueId)
                ->where('member_id', $ownerMember->id)->value('amount')
        );
        $this->assertSame(
            400000,
            ProfitDistribution::where('revenue_id', $revenueId)
                ->where('member_id', $member->id)->value('amount')
        );
        $this->assertSame(
            1000000,
            ProfitDistribution::where('revenue_id', $revenueId)->sum('amount')
        );
    }
}