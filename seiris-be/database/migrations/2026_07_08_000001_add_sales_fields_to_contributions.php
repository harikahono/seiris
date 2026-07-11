<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop enum CHECK constraint (Postgres) — $table->string()->change() gak otomatis drop ini.
        // SQLite doesn't support DROP CONSTRAINT; the type check is enforced by app validation, so skip on sqlite.
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE contributions DROP CONSTRAINT IF EXISTS contributions_type_check');
        }

        // Ganti jadi string biasa biar gampang maintain
        Schema::table('contributions', function (Blueprint $table) {
            $table->string('type', 20)->change();
        });

        // Update data existing REVENUE → SALES
        DB::table('contributions')->where('type', 'REVENUE')->update(['type' => 'SALES']);

        // Tambah kolom baru untuk SALES commission
        Schema::table('contributions', function (Blueprint $table) {
            $table->unsignedBigInteger('deal_value')->nullable()->after('contribution_date');
            $table->unsignedBigInteger('estimated_value')->nullable()->after('deal_value');
            $table->decimal('commission_rate', 5, 2)->unsigned()->nullable()->after('estimated_value');
        });
    }

    public function down(): void
    {
        Schema::table('contributions', function (Blueprint $table) {
            $table->dropColumn(['deal_value', 'estimated_value', 'commission_rate']);
            $table->string('type', 20)->change();
        });
    }
};

