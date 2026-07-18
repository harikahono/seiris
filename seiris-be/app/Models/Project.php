<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'team_id', 'name', 'description', 'is_frozen', 'frozen_at',
    ];

    protected function casts(): array
    {
        return [
            'is_frozen' => 'boolean',
            'frozen_at' => 'datetime',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function contributions(): HasMany
    {
        return $this->hasMany(Contribution::class);
    }

    public function revenues(): HasMany
    {
        return $this->hasMany(Revenue::class);
    }

    public function equitySnapshots(): HasMany
    {
        return $this->hasMany(EquitySnapshot::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(TeamMember::class, 'project_members')
            ->using(ProjectMember::class)
            ->withPivot('fmr')
            ->withTimestamps();
    }

    public function isFrozen(): bool
    {
        return $this->is_frozen;
    }
}
