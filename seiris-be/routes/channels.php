<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\TeamMember;

// Presence channel auth — verify user is active member of the team
// Return value = user info sent to other subscribers
Broadcast::channel('team.{teamId}', function ($user, $teamId) {
    $member = TeamMember::where('team_id', $teamId)
        ->where('user_id', $user->id)
        ->where('status', 'active')
        ->first();

    if (!$member) return false;

    return [
        'id'        => $user->id,
        'name'      => $user->name,
        'member_id' => $member->id,
        'role'      => $member->role,
    ];
});
