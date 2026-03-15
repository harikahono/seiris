<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equity_snapshots', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignUuid('triggered_by_contribution')->nullable()
                ->constrained('contributions')
                ->nullOnDelete()
                ->comment('Contribution that triggered this recalculation');
            $table->unsignedBigInteger('total_slices')->comment('Total slices of the team at this snapshot');
            // JSON map: { "member_id": { "slices": 123, "equity_pct": 45.67 } }
            $table->jsonb('equity_map')->comment('Equity breakdown per member');
            $table->boolean('is_frozen')->default(false);
            $table->timestamps();

            $table->index(['team_id', 'created_at']);
            $table->index(['team_id', 'is_frozen']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equity_snapshots');
    }
};
