<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('revenues', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignUuid('recorded_by')->constrained('team_members')->cascadeOnDelete();
            $table->string('description');
            $table->unsignedBigInteger('amount')->comment('Gross revenue in IDR');
            $table->unsignedBigInteger('distributable_amount')->comment('Amount to be distributed as profit');
            $table->string('proof_path')->nullable()->comment('Path to payment proof');
            $table->date('revenue_date');
            $table->boolean('is_distributed')->default(false);
            $table->timestamp('distributed_at')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'is_distributed']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revenues');
    }
};
