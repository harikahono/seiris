<?php

namespace App\Events;

use App\Models\Team;
use App\Models\EquitySnapshot;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EquityUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Team $team,
        public EquitySnapshot $snapshot
    ) {}

    /**
     * Broadcast to private team channel.
     * Only authenticated team members can listen.
     */
    public function broadcastOn(): array
    {
        return [
            new PresenceChannel('team.' . $this->team->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'equity.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'snapshot_id'  => $this->snapshot->id,
            'total_slices' => $this->snapshot->total_slices,
            'equity_map'   => $this->snapshot->equity_map,
            'is_frozen'    => $this->snapshot->is_frozen,
            'updated_at'   => $this->snapshot->created_at->toISOString(),
        ];
    }
}