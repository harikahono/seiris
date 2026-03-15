<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogService
{
    /**
     * Record an action to the audit log.
     * INSERT ONLY — never update or delete.
     */
    public static function log(
        string $teamId,
        string $action,
        ?string $actorId = null,
        ?string $subjectType = null,
        ?string $subjectId = null,
        array $payload = [],
        ?string $ipAddress = null,
    ): AuditLog {
        return AuditLog::create([
            'team_id'      => $teamId,
            'actor_id'     => $actorId,
            'action'       => $action,
            'subject_type' => $subjectType,
            'subject_id'   => $subjectId,
            'payload'      => $payload,
            'ip_address'   => $ipAddress,
            'created_at'   => now(),
        ]);
    }

    /**
     * Convenience method using current request context.
     */
    public static function logFromRequest(
        Request $request,
        string $teamId,
        string $action,
        ?string $subjectType = null,
        ?string $subjectId = null,
        array $payload = [],
    ): AuditLog {
        return self::log(
            teamId:      $teamId,
            action:      $action,
            actorId:     $request->user()?->id,
            subjectType: $subjectType,
            subjectId:   $subjectId,
            payload:     $payload,
            ipAddress:   $request->ip(),
        );
    }
}