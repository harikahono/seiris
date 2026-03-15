<?php

// ============================================================
// app/Models/Contribution.php
// ============================================================
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contribution extends Model
{
    use HasUuids;

    protected $fillable = [
        'team_id', 'member_id', 'type', 'description',
        'value', 'multiplier', 'total_slices', 'status',
        'contribution_date', 'invoice_amount', 'actual_amount', 'invoice_path',
    ];

    protected function casts(): array
    {
        return [
            'value'            => 'integer',
            'multiplier'       => 'decimal:1',
            'total_slices'     => 'integer',
            'invoice_amount'   => 'integer',
            'actual_amount'    => 'integer',
            'contribution_date'=> 'date',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(TeamMember::class, 'member_id');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(ContributionApproval::class);
    }

    public function isPending(): bool
    {
        return $this->status === 'PENDING';
    }

    public function isApproved(): bool
    {
        return $this->status === 'APPROVED';
    }

    // total_slices immutable after creation
    protected static function booted(): void
    {
        static::updating(function (Contribution $contribution) {
            if ($contribution->isDirty('total_slices')) {
                $contribution->total_slices = $contribution->getOriginal('total_slices');
            }
        });
    }
}