<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contributions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->foreignUuid('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignUuid('member_id')->constrained('team_members')->cascadeOnDelete();
            $table->enum('type', ['TIME', 'CASH', 'IDEA', 'NETWORK', 'FACILITY', 'REVENUE']);
            $table->string('description');
            $table->unsignedBigInteger('value')->comment('Contribution value in IDR');
            $table->decimal('multiplier', 3, 1)->comment('2.0 or 4.0');
            $table->unsignedBigInteger('total_slices')->comment('value * multiplier, immutable after creation');
            $table->enum('status', ['PENDING', 'APPROVED', 'REJECTED'])->default('PENDING');
            $table->date('contribution_date');

            // REVENUE specific
            $table->unsignedBigInteger('invoice_amount')->nullable()->comment('Amount reported to team');
            $table->unsignedBigInteger('actual_amount')->nullable()->comment('Actual deal value from invoice');
            $table->string('invoice_path')->nullable()->comment('Path to uploaded invoice file');

            $table->timestamps();

            $table->index(['team_id', 'status']);
            $table->index(['member_id', 'status']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contributions');
    }
};
