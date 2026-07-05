<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use App\Models\TeamMember;

// Presence channel auth — verify user is active member of the team
// Return value = user info sent to other subscribers
Broadcast::channel('team.{teamId}', function ($user, $teamId) {
    Log::info('[broadcast/channel] CALLBACK ENTERED', [
        'user_id' => $user?->id,
        'team_id' => $teamId,
        'channel_pattern' => 'team.{teamId}',
    ]);

    $member = TeamMember::where('team_id', $teamId)
        ->where('user_id', $user->id)
        ->where('status', 'active')
        ->first();

    if (!$member) {
        Log::warning('[broadcast/channel] MEMBER NOT FOUND', [
            'user_id' => $user?->id,
            'team_id' => $teamId,
        ]);
        return false;
    }

    Log::info('[broadcast/channel] MEMBER FOUND, AUTHORIZED', [
        'member_id' => $member->id,
        'role' => $member->role,
    ]);

    return [
        'id'        => $user->id,
        'name'      => $user->name,
        'member_id' => $member->id,
        'role'      => $member->role,
    ];
});
