<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profit_distributions', function (Blueprint $table) {
            $table->unique(['revenue_id', 'member_id']);
        });
    }

    public function down(): void
    {
        Schema::table('profit_distributions', function (Blueprint $table) {
            $table->dropUnique(['revenue_id', 'member_id']);
        });
    }
};

