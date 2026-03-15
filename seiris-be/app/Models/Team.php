<?php

// ============================================================
// app/Models/Team.php
// ============================================================
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    use HasUuids;

    protected $fillable = [
        'owner_id', 'name', 'description',
        'invite_code', 'approval_threshold',
        'is_frozen', 'frozen_at',
    ];

    protected function casts(): array
    {
        return [
            'is_frozen' => 'boolean',
            'frozen_at' => 'datetime',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(TeamMember::class);
    }

    public function activeMembers(): HasMany
    {
        return $this->hasMany(TeamMember::class)->where('status', 'active');
    }

    public function contributions(): HasMany
    {
        return $this->hasMany(Contribution::class);
    }

    public function equitySnapshots(): HasMany
    {
        return $this->hasMany(EquitySnapshot::class)->orderByDesc('created_at');
    }

    public function latestSnapshot(): HasMany
    {
        return $this->hasMany(EquitySnapshot::class)->latest()->limit(1);
    }

    public function revenues(): HasMany
    {
        return $this->hasMany(Revenue::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }
}