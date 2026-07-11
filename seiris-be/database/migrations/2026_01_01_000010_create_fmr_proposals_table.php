<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fmr_proposals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignUuid('member_id')->constrained('team_members')->cascadeOnDelete();
            $table->unsignedInteger('proposed_fmr');
            $table->enum('status', ['PENDING', 'APPROVED', 'REJECTED'])->default('PENDING');
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'status']);
            $table->index('member_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fmr_proposals');
    }
};

