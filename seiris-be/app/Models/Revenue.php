<?php

// ============================================================
// app/Models/Revenue.php
// ============================================================
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Revenue extends Model
{
    use HasUuids;

    protected $fillable = [
        'team_id', 'recorded_by', 'description',
        'amount', 'distributable_amount', 'proof_path',
        'revenue_date', 'is_distributed', 'distributed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount'               => 'integer',
            'distributable_amount' => 'integer',
            'revenue_date'         => 'date',
            'is_distributed'       => 'boolean',
            'distributed_at'       => 'datetime',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(TeamMember::class, 'recorded_by');
    }

    public function distributions(): HasMany
    {
        return $this->hasMany(ProfitDistribution::class);
    }
}