<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * FMR per-project (Prinsip 5: akurasi valuasi).
     * Project anak bisa butuh effort/skill beda → FMR beda per konteks.
     * Pivot project_members menghubungkan project ↔ team_member dengan fmr sendiri.
     * Fallback ke TeamMember.fmr kalau belum ada entry per-project.
     */
    public function up(): void
    {
        Schema::create('project_members', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUuid('team_member_id')->constrained('team_members')->cascadeOnDelete();
            $table->integer('fmr')->default(0); // Fair Market Rate per project, fallback ke TeamMember.fmr
            $table->timestamps();

            $table->unique(['project_id', 'team_member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_members');
    }
};
