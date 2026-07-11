<?php

namespace Tests\Unit;

use App\Models\AuditLog;
use App\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A.8 — AuditLog immutability (public seam: model).
 * INSERT ONLY: update & delete blocked.
 */
class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    private function makeLog(): AuditLog
    {
        $team = Team::factory()->create();

        return AuditLog::create([
            'team_id'      => $team->id,
            'actor_id'     => null,
            'action'       => 'team.created',
            'subject_type' => Team::class,
            'subject_id'   => $team->id,
            'payload'      => ['x' => 1],
            'created_at'   => now(),
        ]);
    }

    public function test_update_is_blocked(): void
    {
        $log = $this->makeLog();
        $log->action = 'hacked';
        $saved = $log->save();

        $this->assertFalse($saved);
        $this->assertSame('team.created', AuditLog::find($log->id)->action);
    }

    public function test_delete_is_blocked(): void
    {
        $log = $this->makeLog();
        $deleted = $log->delete();

        $this->assertFalse($deleted);
        $this->assertDatabaseHas('audit_logs', ['id' => $log->id]);
    }
}
