<?php

namespace App\Events;

use App\Models\Team;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TeamUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Team $team
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PresenceChannel('team.' . $this->team->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'team.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'team_id'   => $this->team->id,
            'timestamp' => now()->toISOString(),
        ];
    }
}
