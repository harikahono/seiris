<?php
// ============================================================
// app/Http/Resources/TeamResource.php
// ============================================================
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'name'               => $this->name,
            'description'        => $this->description,
            'invite_code'        => $this->invite_code,
            'approval_threshold' => $this->approval_threshold,
            'is_frozen'          => $this->is_frozen,
            'frozen_at'          => $this->frozen_at?->toISOString(),
            'owner'              => new UserResource($this->whenLoaded('owner')),
            'members'            => TeamMemberResource::collection($this->whenLoaded('members')),
            'members_count'      => $this->whenLoaded('members', fn() =>
                $this->members->where('status', 'active')->count()
            ),
            'created_at'         => $this->created_at?->toISOString(),
        ];
    }
}