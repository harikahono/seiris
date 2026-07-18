<?php

namespace Tests\Feature;

use App\Models\Contribution;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Http\Testing\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ContributionProofTest extends TestCase
{
    use WithFaker;

    /** @test */
    public function it_allows_attaching_proof_and_source_url_to_a_pending_contribution()
    {
        // Arrange: user, team, member, contribution (pending)
        $owner = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $member = TeamMember::factory()->create(['team_id' => $team->id, 'user_id' => $owner->id]);
        $this->actingAs($owner, 'sanctum');

        $contribution = Contribution::factory()->create([
            'team_id' => $team->id,
            'member_id' => $member->id,
            'status' => 'PENDING',
        ]);

        Storage::fake('public');
        $file = File::fake()->create('proof.pdf', 100, 'application/pdf');
        $payload = [
            'source_url' => 'https://github.com/example/repo/pull/1',
            'proof' => $file,
        ];

        // Act — pakai post() supaya file terkirim sebagai multipart
        $response = $this->post(
            "/api/teams/{$team->id}/contributions/{$contribution->id}/proof",
            $payload,
            ['Accept' => 'application/json']
        );

        // Assert
        $response->assertOk();
        $response->assertJsonStructure([
            'message',
            'data' => ['id', 'proof_url', 'source_url'],
        ]);
        // file should be stored
        $storedPath = $contribution->fresh()->proof_path;
        $this->assertNotNull($storedPath, 'proof_path should be set');
        $this->assertTrue(Storage::disk('public')->exists($storedPath), "File not found at $storedPath");
    }

    /** @test */
    public function it_rejects_proof_attachment_when_contribution_is_not_pending()
    {
        $owner = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $member = TeamMember::factory()->create(['team_id' => $team->id, 'user_id' => $owner->id]);
        $this->actingAs($owner, 'sanctum');

        $contribution = Contribution::factory()->create([
            'team_id' => $team->id,
            'member_id' => $member->id,
            'status' => 'APPROVED',
        ]);

        $payload = ['source_url' => 'https://github.com/example/repo/pull/1'];
        $response = $this->postJson(
            "/api/teams/{$team->id}/contributions/{$contribution->id}/proof",
            $payload
        );
        $response->assertStatus(422);
    }

    /** @test */
    public function it_rejects_non_github_source_url()
    {
        $owner = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $member = TeamMember::factory()->create(['team_id' => $team->id, 'user_id' => $owner->id]);
        $this->actingAs($owner, 'sanctum');

        $contribution = Contribution::factory()->create([
            'team_id' => $team->id,
            'member_id' => $member->id,
            'status' => 'PENDING',
        ]);

        $payload = ['source_url' => 'https://example.com/not-github'];
        $response = $this->postJson(
            "/api/teams/{$team->id}/contributions/{$contribution->id}/proof",
            $payload
        );
        $response->assertStatus(422);
    }

    /** @test */
    public function it_returns_github_diff_when_source_url_is_valid()
    {
        $owner = User::factory()->create([
            'github_token' => 'fake-token',
        ]);
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $member = TeamMember::factory()->create(['team_id' => $team->id, 'user_id' => $owner->id]);
        $this->actingAs($owner, 'sanctum');

        $contribution = Contribution::factory()->create([
            'team_id' => $team->id,
            'member_id' => $member->id,
            'status' => 'PENDING',
            'source_url' => 'https://github.com/example/repo/pull/42',
        ]);

        // Fake GitHub diff response
        $rawDiff = "diff --git a/file.txt b/file.txt\nindex 111..222 100644\n--- a/file.txt\n+++ b/file.txt\n@@ -1 +1 @@\n-Old\n+New\n";
        Http::fake([
            'https://github.com/example/repo/pull/42.diff' => Http::response($rawDiff, 200),
        ]);

        $response = $this->getJson(
            "/api/teams/{$team->id}/contributions/{$contribution->id}/github-diff"
        );
        $response->assertOk();
        $response->assertJsonStructure(['files' => [['filename', 'patch']]]);
        $this->assertStringContainsString('file.txt', $response->json('files.0.filename'));
    }

    /** @test */
    public function it_returns_422_if_contribution_has_no_source_url()
    {
        $owner = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $member = TeamMember::factory()->create(['team_id' => $team->id, 'user_id' => $owner->id]);
        $this->actingAs($owner, 'sanctum');

        $contribution = Contribution::factory()->create([
            'team_id' => $team->id,
            'member_id' => $member->id,
            'status' => 'PENDING',
            'source_url' => null,
        ]);

        $response = $this->getJson(
            "/api/teams/{$team->id}/contributions/{$contribution->id}/github-diff"
        );
        $response->assertStatus(422);
    }

    /** @test */
    public function it_returns_502_when_github_fetch_fails()
    {
        $owner = User::factory()->create([
            'github_token' => 'token',
        ]);
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $member = TeamMember::factory()->create(['team_id' => $team->id, 'user_id' => $owner->id]);
        $this->actingAs($owner, 'sanctum');

        $contribution = Contribution::factory()->create([
            'team_id' => $team->id,
            'member_id' => $member->id,
            'status' => 'PENDING',
            'source_url' => 'https://github.com/example/repo/pull/99',
        ]);

        Http::fake([
            'https://github.com/example/repo/pull/99.diff' => Http::response(null, 404),
        ]);

        $response = $this->getJson(
            "/api/teams/{$team->id}/contributions/{$contribution->id}/github-diff"
        );
        $response->assertStatus(502);
    }
}
