<?php

// ============================================================
// app/Models/ProfitDistribution.php
// ============================================================
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfitDistribution extends Model
{
    use HasUuids;

    protected $fillable = [
        'revenue_id', 'member_id',
        'equity_pct_snapshot', 'amount',
    ];

    protected function casts(): array
    {
        return [
            'equity_pct_snapshot' => 'decimal:4',
            'amount'              => 'integer',
        ];
    }

    public function revenue(): BelongsTo
    {
        return $this->belongsTo(Revenue::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(TeamMember::class, 'member_id');
    }
}