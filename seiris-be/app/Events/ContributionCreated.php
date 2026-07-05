<?php

namespace App\Events;

use App\Models\Team;
use App\Models\Contribution;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ContributionCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Team $team,
        public Contribution $contribution
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PresenceChannel('team.' . $this->team->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'contribution.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id'          => $this->contribution->id,
            'type'        => $this->contribution->type,
            'description' => $this->contribution->description,
            'value'       => $this->contribution->value,
            'member_name' => $this->contribution->member?->user?->name ?? 'Anggota',
            'status'      => $this->contribution->status,
        ];
    }
}
