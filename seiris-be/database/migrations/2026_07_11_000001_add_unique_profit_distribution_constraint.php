<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// C-D: unique constraint on profit_distributions — prevents duplicate distribution
// under concurrent distribute requests (race condition on firstOrCreate)
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profit_distributions', function (Blueprint $table) {
            $table->unique(['revenue_id', 'member_id'], 'profit_distributions_revenue_member_unique');
        });
    }

    public function down(): void
    {
        Schema::table('profit_distributions', function (Blueprint $table) {
            $table->dropUnique('profit_distributions_revenue_member_unique');
        });
    }
};
