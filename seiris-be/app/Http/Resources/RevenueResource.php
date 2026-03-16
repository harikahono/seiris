<?php
// ============================================================
// app/Http/Resources/RevenueResource.php
// ============================================================
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RevenueResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'description'          => $this->description,
            'amount'               => $this->amount,
            'distributable_amount' => $this->distributable_amount,
            'proof_url'            => $this->proof_path
                ? asset('storage/' . $this->proof_path)
                : null,
            'revenue_date'         => $this->revenue_date?->toDateString(),
            'is_distributed'       => $this->is_distributed,
            'distributed_at'       => $this->distributed_at?->toISOString(),
            'recorded_by'          => new TeamMemberResource($this->whenLoaded('recordedBy')),
            'distributions'        => $this->whenLoaded('distributions',
                fn() => $this->distributions->map(fn($d) => [
                    'member'            => new TeamMemberResource($d->member),
                    'equity_pct'        => $d->equity_pct_snapshot,
                    'amount'            => $d->amount,
                ])
            ),
            'created_at'           => $this->created_at?->toISOString(),
        ];
    }
}