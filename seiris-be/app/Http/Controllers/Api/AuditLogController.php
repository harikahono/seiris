<?php

// ============================================================
// app/Http/Controllers/Api/AuditLogController.php
// ============================================================
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * GET /api/teams/{team}/audit-logs
     * Riwayat semua aksi di tim — semua member bisa lihat
     */
    public function index(Request $request, Team $team): JsonResponse
    {
        $this->authorizeMember($request, $team);

        $logs = AuditLog::where('team_id', $team->id)
            ->with('actor')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'data' => $logs->map(fn($log) => [
                'id'           => $log->id,
                'action'       => $log->action,
                'actor'        => $log->actor ? [
                    'id'   => $log->actor->id,
                    'name' => $log->actor->name,
                ] : null,
                'subject_type' => $log->subject_type,
                'subject_id'   => $log->subject_id,
                'payload'      => $log->payload,
                'ip_address'   => $log->ip_address,
                'created_at'   => $log->created_at?->toISOString(),
            ]),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'total'        => $logs->total(),
            ],
        ]);
    }

    private function authorizeMember(Request $request, Team $team): void
    {
        $isMember = $team->members()
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->exists();

        if (!$isMember) {
            abort(403, 'Kamu bukan anggota tim ini.');
        }
    }
}