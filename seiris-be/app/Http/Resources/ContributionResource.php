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

            // REVENUE specific
            'invoice_amount'    => $this->invoice_amount,
            'actual_amount'     => $this->actual_amount,
            'invoice_url'       => $this->invoice_path
                ? asset('storage/' . $this->invoice_path)
                : null,

            // Relations
            'member'            => new TeamMemberResource($this->whenLoaded('member')),
            'approvals'         => ContributionApprovalResource::collection(
                $this->whenLoaded('approvals')
            ),
            'approvals_count'   => $this->whenLoaded('approvals',
                fn() => $this->approvals->count()
            ),

            'created_at'        => $this->created_at?->toISOString(),
        ];
    }
}