<?php
// ============================================================
// app/Http/Resources/ContributionResource.php
// ============================================================
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContributionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'type'              => $this->type,
            'description'       => $this->description,
            'value'             => $this->value,
            'multiplier'        => $this->multiplier,
            'total_slices'      => $this->total_slices,
            'status'            => $this->status,
            'contribution_date' => $this->contribution_date?->toDateString(),
            // Proof & source
            'proof_url'        => $this->proof_url,
            'source_url'       => $this->source_url,

            // SALES specific
            'deal_value'        => $this->when($this->type === 'SALES', $this->deal_value),
            'estimated_value'   => $this->when($this->type === 'SALES', $this->estimated_value),
            'commission_rate'   => $this->when($this->type === 'SALES', $this->commission_rate),

            // Relations
            'member'            => new TeamMemberResource($this->whenLoaded('member')),
            'approvals'         => ContributionApprovalResource::collection(
                $this->whenLoaded('approvals')
            ),
            'approvals_count'   => $this->whenLoaded('approvals',
                fn() => $this->approvals->count()
            ),

            'created_at'        => $this->created_at?->toISOString(),

            // Jam kerja (TIME/IDEA/NETWORK)
            'hours'             => $this->when(
                in_array($this->type, ['TIME', 'IDEA', 'NETWORK']),
                fn() => $this->hours !== null ? (float) $this->hours : null
            ),
        ];
    }
}