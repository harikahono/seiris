<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * ponytail: REVENUE type was a stale/legacy type that never had a
     * calculateSlices() branch (it threw). SALES replaced it. Drop the
     * enum constraint to a plain string and remove the dead REVENUE-only
     * columns (invoice_amount/actual_amount/invoice_path) which now live
     * on the revenues table instead.
     */
    public function up(): void
    {
        // enum -> string (setelah migrasi 2026_07_08 REVENUE sudah di-migrate ke SALES)
        Schema::table('contributions', function (Blueprint $table) {
            $table->string('type')->change();
        });

        // pastikan gak ada sisa REVENUE (jaga-jaga DB lama)
        DB::table('contributions')->where('type', 'REVENUE')->update(['type' => 'SALES']);

        Schema::table('contributions', function (Blueprint $table) {
            $table->dropColumn(['invoice_amount', 'actual_amount', 'invoice_path']);
        });
    }

    public function down(): void
    {
        Schema::table('contributions', function (Blueprint $table) {
            $table->enum('type', ['TIME', 'CASH', 'IDEA', 'NETWORK', 'FACILITY', 'REVENUE'])->change();
            $table->unsignedBigInteger('invoice_amount')->nullable();
            $table->unsignedBigInteger('actual_amount')->nullable();
            $table->string('invoice_path')->nullable();
        });
    }
};

