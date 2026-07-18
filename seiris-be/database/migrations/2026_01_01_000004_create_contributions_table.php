<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contributions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignUuid('member_id')->constrained('team_members')->cascadeOnDelete();
            $table->string('type', 20); // CASH, TIME, IDEA, NETWORK, FACILITY, SALES
            $table->string('description');
            $table->unsignedBigInteger('value')->comment('Contribution value in IDR');
            $table->decimal('multiplier', 3, 1)->comment('2.0 or 4.0');
            $table->unsignedBigInteger('total_slices')->comment('value * multiplier, immutable after creation');
            $table->decimal('hours', 8, 2)->nullable()->comment('Hours worked (TIME/IDEA/NETWORK)');
            $table->enum('status', ['PENDING', 'APPROVED', 'REJECTED'])->default('PENDING');
            $table->string('proof_path')->nullable();
            $table->string('source_url')->nullable();
            $table->date('contribution_date');
            $table->unsignedBigInteger('deal_value')->nullable();
            $table->unsignedBigInteger('estimated_value')->nullable();
            $table->decimal('commission_rate', 5, 2)->unsigned()->nullable();
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

