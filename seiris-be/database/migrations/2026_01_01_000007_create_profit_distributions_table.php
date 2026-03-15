<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profit_distributions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('revenue_id')->constrained('revenues')->cascadeOnDelete();
            $table->foreignUuid('member_id')->constrained('team_members')->cascadeOnDelete();
            $table->decimal('equity_pct_snapshot', 8, 4)->comment('Equity % at the time of distribution');
            $table->unsignedBigInteger('amount')->comment('Amount received in IDR');
            $table->timestamps();

            // Tidak ada UPDATE/DELETE — append only
            $table->index('revenue_id');
            $table->index('member_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profit_distributions');
    }
};
