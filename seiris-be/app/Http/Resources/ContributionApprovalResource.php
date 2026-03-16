<?php
// ============================================================
// app/Http/Resources/ContributionApprovalResource.php
// ============================================================
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContributionApprovalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'     => $this->id,
            'vote'   => $this->vote,
            'note'   => $this->note,
            'member' => new TeamMemberResource($this->whenLoaded('member')),
            'voted_at' => $this->created_at?->toISOString(),
        ];
    }
}