<?php

// ============================================================
// app/Http/Controllers/Api/AuditLogController.php
// ============================================================
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Project;
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
        // authorizeMember di-handle middleware EnsureTeamMember

        $query = AuditLog::where('team_id', $team->id);

        // H-I: filter by project_id — for project-scoped audit views
        // ponytail: whereRaw because Laravel doesn't support ->> operator in where()
        if ($request->filled('project_id')) {
            $query->whereRaw("payload->>'project_id' = ?", [$request->project_id]);
        }

        if ($request->filled('filter')) {
            $query->where('action', 'like', $request->filter . '.%');
        }

        // A2: search di action + payload description
        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('action', 'ilike', $search)
                  ->orWhereRaw("payload->>'description' ilike ?", [$search])
                  ->orWhereRaw("payload->>'name' ilike ?", [$search])
                  ->orWhereRaw("payload->>'type' ilike ?", [$search]);
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = min((int) $request->input('per_page', 6), 50);
        $logs = $query->with('actor')
            ->orderByDesc('created_at')
            ->paginate($perPage);

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
                'per_page'     => $logs->perPage(),
            ],
        ]);
    }

}