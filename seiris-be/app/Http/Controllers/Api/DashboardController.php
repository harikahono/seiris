<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\Contribution;
use App\Services\SlicingPieService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    protected $slicingPieService;

    public function __construct(SlicingPieService $slicingPieService)
    {
        $this->slicingPieService = $slicingPieService;
    }

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
                    // Cari slices user di detail snapshot
                    $memberDetail = collect($latestSnapshot->member_details)->firstWhere('user_id', $user->id);
                    $mySlices = $memberDetail ? ($memberDetail['total_slices'] ?? 0) : 0;
                    
                    if ($totalSlices > 0) {
                        $myEquityPercentage = round(($mySlices / $totalSlices) * 100, 2);
                    }
                } else {
                    // Fallback: Hitung manual jika belum ada snapshot (tim baru)
                    // Ini bisa berat jika tim besar, tapi aman untuk tim kecil
                    $calculation = $this->slicingPieService->calculateEquity($team->id);
                    $mySlices = $calculation['members'][$user->id]['total_slices'] ?? 0;
                    $totalSlices = $calculation['total_slices'];
                    if ($totalSlices > 0) {
                        $myEquityPercentage = round(($mySlices / $totalSlices) * 100, 2);
                    }
                }

                // Hitung kontribusi pending approval di tim ini milik user
                $pendingCount = Contribution::where('team_id', $team->id)
                    ->where('created_by', $user->id)
                    ->where('status', 'PENDING')
                    ->count();

                return [
                    'id' => $team->id,
                    'name' => $team->name,
                    'description' => $team->description,
                    'role' => $team->members()->where('user_id', $user->id)->first()?->role ?? 'member',
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
