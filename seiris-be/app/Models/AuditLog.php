<?php

// ============================================================
// app/Models/AuditLog.php
// ============================================================
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasUuids;

    // INSERT ONLY — disable all update/delete operations
    public $timestamps = false;

    protected $fillable = [
        'team_id', 'actor_id', 'action',
        'subject_type', 'subject_id',
        'payload', 'ip_address', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'payload'    => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    // Block update and delete — INSERT ONLY
    protected static function booted(): void
    {
        static::updating(fn() => false);
        static::deleting(fn() => false);
    }
}