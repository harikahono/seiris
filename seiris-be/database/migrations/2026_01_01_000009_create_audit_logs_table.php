<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignUuid('actor_id')->nullable()
                ->constrained('users')
                ->nullOnDelete()
                ->comment('User who performed the action');
            $table->string('action')->comment('e.g. contribution.created, vote.approved, equity.frozen');
            $table->string('subject_type')->nullable()->comment('Model class name');
            $table->uuid('subject_id')->nullable()->comment('Model UUID');
            $table->jsonb('payload')->nullable()->comment('Snapshot of relevant data at time of action');
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
            // NO updated_at — INSERT ONLY, never update or delete

            $table->index(['team_id', 'created_at']);
            $table->index(['actor_id']);
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
