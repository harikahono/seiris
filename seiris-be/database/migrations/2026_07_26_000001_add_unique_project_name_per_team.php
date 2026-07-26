<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // B1: cegah duplikat nama project dalam 1 tim — backstop terakhir
        // kalo lock + validasi lolos, DB tetap tolak duplikat.
        Schema::table('projects', function (Blueprint $table) {
            $table->unique(['team_id', 'name'], 'projects_team_id_name_unique');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropUnique('projects_team_id_name_unique');
        });
    }
};
