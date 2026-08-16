<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Team;
use App\Models\TeamMember;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContributionSalesRateTest extends TestCase
{
    use RefreshDatabase;

    private function makeTeam(float $commissionRate = 50): array
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $team = Team::factory()->create([
            'owner_id'        => $owner->id,
            'commission_rate' => $commissionRate,
        ]);

        TeamMember::factory()->owner()->create([
            'team_id' => $team->id,
            'user_id' => $owner->id,
            'fmr'     => 0,
        ]);

        TeamMember::factory()->create([
            'team_id' => $team->id,
            'user_id' => $member->id,
            'fmr'     => 0,
        ]);

        return compact('team', 'owner', 'member');
    }

    /** SALES: backend paksa pakai rate dari tim, ignore rate dari client */
    public function test_sales_uses_team_commission_rate(): void
    {
        $t = $this->makeTeam(50);
        $this->actingAs($t['member'], 'sanctum');

        $r = $this->postJson("/api/teams/{$t['team']->id}/contributions", [
            'type'              => 'SALES',
            'description'       => 'Penjualan produk ke klien A',
            'contribution_date' => now()->toDateString(),
            'deal_value'        => 1000000,
            'estimated_value'   => 600000,
            'commission_rate'   => 100, // client kirim 100% — harus diabaikan
        ]);

        $r->assertStatus(201);

        // markup = 1000000 - 600000 = 400000, rate = 50%, value = 200000
        $r->assertJsonPath('data.value', 200000);
        $r->assertJsonPath('data.commission_rate', '50.00');
    }

    /** SALES tanpa kirim commission_rate juga jalan — pakai default tim */
    public function test_sales_without_rate_uses_team_default(): void
    {
        $t = $this->makeTeam(30);
        $this->actingAs($t['member'], 'sanctum');

        $r = $this->postJson("/api/teams/{$t['team']->id}/contributions", [
            'type'              => 'SALES',
            'description'       => 'Penjualan jasa konsultasi',
            'contribution_date' => now()->toDateString(),
            'deal_value'        => 500000,
            'estimated_value'   => 200000,
        ]);

        $r->assertStatus(201);

        // markup = 300000, rate = 30%, value = 90000
        $r->assertJsonPath('data.value', 90000);
    }

    /** Default team rate 50% dipakai saat team gak set rate */
    public function test_default_rate_is_50_percent(): void
    {
        $t = $this->makeTeam(50);
        $this->actingAs($t['member'], 'sanctum');

        $r = $this->postJson("/api/teams/{$t['team']->id}/contributions", [
            'type'              => 'SALES',
            'description'       => 'Deal produk digital',
            'contribution_date' => now()->toDateString(),
            'deal_value'        => 200000,
            'estimated_value'   => 100000,
        ]);

        $r->assertStatus(201);

        // markup = 100000, rate = 50%, value = 50000
        $r->assertJsonPath('data.value', 50000);
    }
}
