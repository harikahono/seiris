<?php

namespace App\Policies;

use App\Models\Team;
use App\Models\User;

class TeamPolicy
{
    /**
     * Owner-only: update team detail.
     */
    public function update(User $user, Team $team): bool
    {
        return $team->members()
            ->where('user_id', $user->id)
            ->where('role', 'owner')
            ->where('status', 'active')
            ->exists();
    }

    /**
     * Owner-only: manage members (set FMR, exit).
     */
    public function manageMembers(User $user, Team $team): bool
    {
        return $this->update($user, $team);
    }

    /**
     * Owner-only: freeze equity.
     */
    public function freeze(User $user, Team $team): bool
    {
        return $this->update($user, $team);
    }

    /**
     * Owner-only: create & distribute revenue.
     */
    public function manageRevenues(User $user, Team $team): bool
    {
        return $this->update($user, $team);
    }
}
