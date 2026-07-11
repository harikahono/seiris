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
            'id'          => $this->id,
            'team_id'     => $this->team_id,
            'role'        => $this->role,
            'fmr'         => $this->fmr,
            'project_fmr' => $this->resource->project_fmr ?? null,
            'status'      => $this->status,
            'exited_at'   => $this->exited_at?->toISOString(),
            'user'        => new UserResource($this->whenLoaded('user')),
            'joined_at'   => $this->created_at?->toISOString(),
        ];
    }
}