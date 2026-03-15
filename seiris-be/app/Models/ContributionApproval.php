<?php

// ============================================================
// app/Models/ContributionApproval.php
// ============================================================
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContributionApproval extends Model
{
    use HasUuids;

    protected $fillable = ['contribution_id', 'member_id', 'vote', 'note'];

    public function contribution(): BelongsTo
    {
        return $this->belongsTo(Contribution::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(TeamMember::class, 'member_id');
    }
}