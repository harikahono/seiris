<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contribution_approvals', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('contribution_id')->constrained('contributions')->cascadeOnDelete();
            $table->foreignUuid('member_id')->constrained('team_members')->cascadeOnDelete();
            $table->enum('vote', ['APPROVE', 'REJECT']);
            $table->text('note')->nullable();
            $table->timestamps();

            // Satu member hanya bisa vote satu kali per kontribusi
            $table->unique(['contribution_id', 'member_id']);
            $table->index('contribution_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contribution_approvals');
    }
};
