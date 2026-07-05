<?php

namespace App\Policies;

use App\Models\Team;
use App\Models\User;

class TeamPolicy
{
    /**
     * Owner-only: semua operasi owner.
     */
    public function update(User $user, Team $team): bool
    {
        return $team->members()
            ->where('user_id', $user->id)
            ->where('role', 'owner')
            ->where('status', 'active')
            ->exists();
    }
}
