<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Recovery Framework (Good/Bad Leaver) — Slicing Pie.
     * leaver_type: null (aktif), 'good' (perusahaan salah), 'bad' (dia salah).
     * Saat exit, slices-nya di-level project & team di-penalty/keep sesuai ini.
     */
    public function up(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->string('leaver_type')->nullable()->after('status')
                ->comment('null=active, good=resign with/terminated without cause, bad=fired for/quit without cause');
            $table->text('exit_reason')->nullable()->after('leaver_type');
        });
    }

    public function down(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->dropColumn(['leaver_type', 'exit_reason']);
        });
    }
};

