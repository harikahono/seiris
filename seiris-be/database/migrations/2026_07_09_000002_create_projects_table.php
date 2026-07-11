<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Slicing Pie Beranak: Team (induk) memiliki banyak Project (anak).
     * Tiap project punya Pie sendiri, freeze saat kelar, lalu slices
     * di-aggregate ke equity induk.
     */
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('team_id')->constrained('teams')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_frozen')->default(false);
            $table->timestamp('frozen_at')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'is_frozen']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
