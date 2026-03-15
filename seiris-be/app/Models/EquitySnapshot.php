<?php

// ============================================================
// app/Models/EquitySnapshot.php
// ============================================================
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquitySnapshot extends Model
{
    use HasUuids;

    protected $fillable = [
        'team_id', 'triggered_by_contribution',
        'total_slices', 'equity_map', 'is_frozen',
    ];

    protected function casts(): array
    {
        return [
            'total_slices' => 'integer',
            'equity_map'   => 'array',
            'is_frozen'    => 'boolean',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function triggerContribution(): BelongsTo
    {
        return $this->belongsTo(Contribution::class, 'triggered_by_contribution');
    }
}