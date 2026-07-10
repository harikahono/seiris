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
        'team_id', 'project_id', 'triggered_by_contribution',
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

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function triggerContribution(): BelongsTo
    {
        return $this->belongsTo(Contribution::class, 'triggered_by_contribution');
    }

    protected static function boot(): void
    {
        parent::boot();

        // M1: snapshot immutable — hanya kolom is_frozen (freeze) yg boleh berubah.
        // Update kolom lain (equity_map, total_slices, dll) otomatis dibatalkan.
        static::updating(function (self $model) {
            return $model->isDirty('is_frozen') ? null : false;
        });

        // C-A: append-only — snapshot tidak boleh dihapus sama sekali
        static::deleting(fn () => false);
    }
}