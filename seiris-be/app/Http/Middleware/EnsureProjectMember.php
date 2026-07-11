<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureProjectMember
{
    /**
     * Cek: project milik team yang di-akses DAN user adalah member aktif tim tsb.
     * Attach $request->project biar controller gak query ulang.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $team = $request->route('team');
        $project = $request->route('project');

        if (!$team || !$project) {
            abort(403, 'Tim atau project tidak ditemukan.');
        }

        if ($project->team_id !== $team->id) {
            abort(403, 'Project tidak belong ke tim ini.');
        }

        $member = $team->members()
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->first();

        abort_if(!$member, 403, 'Kamu bukan anggota tim ini.');

        // C-B: verify user is in this project's roster
        $inProject = DB::table('project_members')
            ->where('project_id', $project->id)
            ->where('team_member_id', $member->id)
            ->exists();
        abort_if(!$inProject, 403, 'Kamu bukan anggota project ini.');

        $request->merge(['teamMember' => $member]);

        return $next($request);
    }
}
