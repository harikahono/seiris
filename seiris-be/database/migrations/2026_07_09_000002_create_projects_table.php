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
            $table->uuid('id')->primary();
            $table->foreignUuid('team_id')->constrained('teams')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_frozen')->default(false);
            $table->timestamp('frozen_at')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'is_frozen']);
            $table->unique(['team_id', 'name'], 'projects_team_id_name_unique');
        });

        // project_id FK — can't be inlined in create_* tables because
        // projects table must exist first for the constraint to work.
        Schema::table('contributions', function (Blueprint $table) {
            $table->foreignUuid('project_id')->nullable()->after('member_id')
                ->constrained('projects')->restrictOnDelete();
            $table->index(['project_id', 'status']);
        });

        Schema::table('revenues', function (Blueprint $table) {
            $table->foreignUuid('project_id')->nullable()->after('team_id')
                ->constrained('projects')->restrictOnDelete();
            $table->index('project_id');
        });

        Schema::table('equity_snapshots', function (Blueprint $table) {
            $table->foreignUuid('project_id')->nullable()->after('team_id')
                ->constrained('projects')->restrictOnDelete();
            $table->index(['team_id', 'project_id']);
        });
    }

    public function down(): void
    {
        Schema::table('equity_snapshots', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_id');
        });
        Schema::table('revenues', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_id');
        });
        Schema::table('contributions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_id');
        });

        Schema::dropIfExists('projects');
    }
};

