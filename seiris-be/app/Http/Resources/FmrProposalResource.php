<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FmrProposalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'proposed_fmr' => $this->proposed_fmr,
            'status'       => $this->status,
            'member'       => new TeamMemberResource($this->whenLoaded('member')),
            'reviewer'     => $this->when($this->reviewed_by, fn() => [
                'id'   => $this->reviewer?->id,
                'name' => $this->reviewer?->name,
            ], null),
            'created_at'   => $this->created_at?->toISOString(),
            'reviewed_at'  => $this->reviewed_at?->toISOString(),
        ];
    }
}
