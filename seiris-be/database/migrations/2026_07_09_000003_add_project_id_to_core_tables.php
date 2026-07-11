<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Tambah project_id nullable ke contributions, revenues, equity_snapshots.
     * null = scope tim (induk); uuid = scope project (anak).
     * restrictOnDelete: project TIDAK bisa dihapus kalau masih punya
     * kontribusi/revenue/snapshot. Cegah double-count (Prinsip 2): kalau project
     * dihapus & project_id jadi NULL, slices bakal masuk 2x (frozen snapshot + tim scope).
     */
    public function up(): void
    {
        Schema::table('contributions', function (Blueprint $table) {
            $table->foreignUuid('project_id')
                ->nullable()
                ->after('member_id')
                ->constrained('projects')
                ->restrictOnDelete();
            $table->index(['project_id', 'status']);
        });

        Schema::table('revenues', function (Blueprint $table) {
            $table->foreignUuid('project_id')
                ->nullable()
                ->after('team_id')
                ->constrained('projects')
                ->restrictOnDelete();
            $table->index('project_id');
        });

        Schema::table('equity_snapshots', function (Blueprint $table) {
            $table->foreignUuid('project_id')
                ->nullable()
                ->after('team_id')
                ->constrained('projects')
                ->restrictOnDelete();
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

