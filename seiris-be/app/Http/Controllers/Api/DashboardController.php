<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\Contribution;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    /**
     * Get dashboard summary for the authenticated user.
     * Includes: Profile summary, List of teams with equity %, Pending approvals count.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        // 1. Ambil semua tim yang diikuti user
        $teams = Team::whereHas('members', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->with(['owner', 'members.user'])
            ->get()
            ->map(function ($team) use ($user) {
                // Hitung equity snapshot terbaru untuk tim ini
                // Kita panggil service untuk hitung real-time atau ambil snapshot terakhir
                // Untuk performa dashboard, lebih baik ambil snapshot terakhir jika ada
                $latestSnapshot = $team->equitySnapshots()->latest()->first();
                
                $mySlices = 0;
                $totalSlices = 0;
                $myEquityPercentage = 0;

                if ($latestSnapshot) {
                    $totalSlices = $latestSnapshot->total_slices;
                    // Cari slices user via member_id (equity_map key = TeamMember ID)
                    $myMember = $team->members->firstWhere('user_id', $user->id);
                    $myMemberId = $myMember?->id;
                    $mySlices = ($myMemberId && isset($latestSnapshot->equity_map[$myMemberId]))
                        ? $latestSnapshot->equity_map[$myMemberId]['slices']
                        : 0;
                    $myEquityPercentage = $totalSlices > 0
                        ? round(($mySlices / $totalSlices) * 100, 2)
                        : 0;
                } else {
                    // Tim baru, belum ada snapshot — semua 0
                    $mySlices = 0;
                    $totalSlices = 0;
                    $myEquityPercentage = 0;
                }

                // Hitung kontribusi pending approval milik user di tim ini
                $myMember = $team->members->firstWhere('user_id', $user->id);
                $myMemberId = $myMember?->id;
                $pendingCount = $myMemberId
                    ? Contribution::where('team_id', $team->id)
                        ->where('member_id', $myMemberId)
                        ->where('status', 'PENDING')
                        ->count()
                    : 0;

                return [
                    'id' => $team->id,
                    'name' => $team->name,
                    'description' => $team->description,
                    'role' => $myMember?->role ?? 'member',
                    'status' => $myMember?->status ?? 'active',
                    'is_owner' => $team->owner_id === $user->id,
                    'my_equity_percentage' => $myEquityPercentage,
                    'my_slices' => $mySlices,
                    'total_team_slices' => $totalSlices,
                    'pending_approvals_count' => $pendingCount,
                    'total_members' => $team->members()->count(),
                    'created_at' => $team->created_at->toIso8601String(),
                ];
            });

        // 2. Hitung total kontribusi yang perlu di-approve oleh user (sebagai reviewer)
        // Logika: Jika user adalah member, dia bisa vote. Kita hitung kontribusi PENDING di tim dia yang belum dia vote.
        // Ini agak kompleks, kita sederhanakan: hitung total PENDING di semua tim dia.
        $totalPendingToReview = Contribution::whereIn('team_id', $teams->pluck('id'))
            ->where('status', 'PENDING')
            ->count(); 
        // Catatan: Ini hitungan kasar (total pending di tim), bukan spesifik "belum divote user".
        // Bisa diperbaiki nanti dengan cek tabel votes.

        return response()->json([
            'message' => 'Dashboard data retrieved successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'summary' => [
                    'total_teams' => $teams->count(),
                    'total_pending_to_review' => $totalPendingToReview,
                ],
                'teams' => $teams,
            ]
        ]);
    }
}
