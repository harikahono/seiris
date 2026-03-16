<?php
// ============================================================
// app/Http/Resources/TeamMemberResource.php
// ============================================================
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'role'       => $this->role,
            'fmr'        => $this->fmr,
            'status'     => $this->status,
            'exited_at'  => $this->exited_at?->toISOString(),
            'user'       => new UserResource($this->whenLoaded('user')),
            'joined_at'  => $this->created_at?->toISOString(),
        ];
    }
}