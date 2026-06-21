<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTeamMember
{
    /**
     * Handle an incoming request.
     * Mengecek apakah user adalah member aktif dari tim yang diakses.
     * Juga attach TeamMember record ke request untuk reuse.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $team = $request->route('team');

        if (!$team) {
            abort(403, 'Tim tidak ditemukan.');
        }

        $member = $team->members()
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->first();

        abort_if(!$member, 403, 'Kamu bukan anggota tim ini.');

        // Attach member biar gak perlu query ulang di controller
        $request->merge(['teamMember' => $member]);

        return $next($request);
    }
}
