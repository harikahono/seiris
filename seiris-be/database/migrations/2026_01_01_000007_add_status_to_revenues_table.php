<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('revenues', function (Blueprint $table) {
            $table->string('status', 30)->default('pending')->after('distributable_amount');
            $table->index(['team_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('revenues', function (Blueprint $table) {
            $table->dropIndex(['team_id', 'status']);
            $table->dropColumn('status');
        });
    }
};
