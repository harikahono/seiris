<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add project_id FK to core tables / after projects table exists.
     * Can't be inlined into create_* because projects table doesn't exist yet.
     */
    public function up(): void
    {
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
    }
};
