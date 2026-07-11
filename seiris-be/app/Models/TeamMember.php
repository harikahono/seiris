<?php

// ============================================================
// app/Models/TeamMember.php
// ============================================================
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeamMember extends Model
{
    use HasUuids;

    protected $fillable = [
        'team_id', 'user_id', 'role',
        'fmr', 'status', 'exited_at', 'leaver_type', 'exit_reason',
    ];

    protected function casts(): array
    {
        return [
            'fmr'       => 'integer',
            'exited_at' => 'datetime',
        ];
    }

    /**
     * Good leaver = perusahaan yang salah (fired no cause / resign good cause).
     * Slices tetap (perusahaan harus buyback). Bad leaver = dia salah,
     * slices non-cash hilang.
     */
    public function isGoodLeaver(): bool
    {
        return $this->leaver_type === 'good';
    }

    public function isBadLeaver(): bool
    {
        return $this->leaver_type === 'bad';
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contributions(): HasMany
    {
        return $this->hasMany(Contribution::class, 'member_id');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(ContributionApproval::class, 'member_id');
    }

    public function profitDistributions(): HasMany
    {
        return $this->hasMany(ProfitDistribution::class, 'member_id');
    }

    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}