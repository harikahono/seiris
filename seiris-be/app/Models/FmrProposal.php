<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FmrProposal extends Model
{
    use HasUuids;

    protected $fillable = [
        'team_id', 'member_id', 'proposed_fmr',
        'status', 'reviewed_by', 'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'proposed_fmr' => 'integer',
            'reviewed_at'  => 'datetime',
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

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function isPending(): bool
    {
        return $this->status === 'PENDING';
    }
}
