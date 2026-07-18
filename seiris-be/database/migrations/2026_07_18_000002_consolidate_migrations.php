<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Consolidated migration — replaces 12 individual "add" migrations.
     *
     * Original files squashed:
     *   2026_01_01_000007_add_status_to_revenues_table
     *   2026_07_08_000001_add_sales_fields_to_contributions
     *   2026_07_08_000002_add_unique_to_profit_distributions
     *   2026_07_08_000003_add_deductions_to_revenues
     *   2026_07_09_000001_drop_revenue_enum_and_legacy_columns
     *   2026_07_09_000003_add_project_id_to_core_tables
     *   2026_07_09_000004_add_leaver_type_to_team_members
     *   2026_07_11_000001_add_unique_profit_distribution_constraint
     *   2026_07_13_000001_add_hours_to_contributions_table
     *   2026_07_14_000001_add_proof_and_source_to_contributions
     *   2026_07_14_000002_add_github_token_to_users
     *   2026_07_18_000001_add_profile_photo_to_users
     *
     * Each operation is guarded by Schema::hasColumn() / try-catch so it's
     * safe to run on both fresh and existing databases.
     */
    public function up(): void
    {
        // ── 1. Add status to revenues ──
        if (! Schema::hasColumn('revenues', 'status')) {
            Schema::table('revenues', function (Blueprint $table) {
                $table->string('status', 30)->default('pending')->after('distributable_amount');
                $table->index(['team_id', 'status']);
            });
        }

        // ── 2. Migrate REVENUE → SALES, drop legacy invoice columns ──
        if (Schema::hasColumn('contributions', 'invoice_amount')) {
            // Change column type from enum to string (PG needs explicit ALTER)
            if (DB::getDriverName() !== 'sqlite') {
                DB::statement('ALTER TABLE contributions ALTER COLUMN type TYPE varchar(20) USING type::varchar(20)');
            }
            DB::table('contributions')->where('type', 'REVENUE')->update(['type' => 'SALES']);

            Schema::table('contributions', function (Blueprint $table) {
                $table->unsignedBigInteger('deal_value')->nullable()->after('contribution_date');
                $table->unsignedBigInteger('estimated_value')->nullable()->after('deal_value');
                $table->decimal('commission_rate', 5, 2)->unsigned()->nullable()->after('estimated_value');
                $table->dropColumn(['invoice_amount', 'actual_amount', 'invoice_path']);
            });
        }

        // ── 3. Add unique constraint to profit_distributions ──
        try {
            Schema::table('profit_distributions', function (Blueprint $table) {
                $table->unique(['revenue_id', 'member_id'], 'profit_distributions_revenue_member_unique');
            });
        } catch (\Exception $e) {
            // Constraint already exists — ignore
        }

        // ── 4. Add deductions to revenues ──
        if (! Schema::hasColumn('revenues', 'deductions')) {
            Schema::table('revenues', function (Blueprint $table) {
                $table->json('deductions')->nullable()->after('distributable_amount');
            });
        }

        // ── 5. Add project_id FK to contributions, revenues, equity_snapshots ──
        if (! Schema::hasColumn('contributions', 'project_id')) {
            Schema::table('contributions', function (Blueprint $table) {
                $table->foreignUuid('project_id')->nullable()->after('member_id')
                    ->constrained('projects')->restrictOnDelete();
                $table->index(['project_id', 'status']);
            });
        }
        if (! Schema::hasColumn('revenues', 'project_id')) {
            Schema::table('revenues', function (Blueprint $table) {
                $table->foreignUuid('project_id')->nullable()->after('team_id')
                    ->constrained('projects')->restrictOnDelete();
                $table->index('project_id');
            });
        }
        if (! Schema::hasColumn('equity_snapshots', 'project_id')) {
            Schema::table('equity_snapshots', function (Blueprint $table) {
                $table->foreignUuid('project_id')->nullable()->after('team_id')
                    ->constrained('projects')->restrictOnDelete();
                $table->index(['team_id', 'project_id']);
            });
        }

        // ── 6. Add leaver_type & exit_reason to team_members ──
        if (! Schema::hasColumn('team_members', 'leaver_type')) {
            Schema::table('team_members', function (Blueprint $table) {
                $table->string('leaver_type')->nullable()->after('status')
                    ->comment('null=active, good=resign/terminated without cause, bad=fired/quit without cause');
                $table->text('exit_reason')->nullable()->after('leaver_type');
            });
        }

        // ── 7. Add hours to contributions ──
        if (! Schema::hasColumn('contributions', 'hours')) {
            Schema::table('contributions', function (Blueprint $table) {
                $table->decimal('hours', 8, 2)->nullable()->after('total_slices');
            });
        }

        // ── 8. Add proof_path & source_url to contributions ──
        if (! Schema::hasColumn('contributions', 'proof_path')) {
            Schema::table('contributions', function (Blueprint $table) {
                $table->string('proof_path')->nullable()->after('status');
                $table->string('source_url')->nullable()->after('proof_path');
            });
        }

        // ── 9. Add github_token to users ──
        if (! Schema::hasColumn('users', 'github_token')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('github_token')->nullable()->after('remember_token');
            });
        }

        // ── 10. Add profile_photo_path to users ──
        if (! Schema::hasColumn('users', 'profile_photo_path')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('profile_photo_path')->nullable()->after('password');
            });
        }
    }

    /**
     * Reverse the consolidated migration.
     * Note: old individual migrations are deleted, so rolling back past
     * this point requires `migrate:fresh`.
     */
    public function down(): void
    {
        // Reverse in opposite order
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['profile_photo_path', 'github_token']);
        });
        Schema::table('contributions', function (Blueprint $table) {
            $table->dropColumn(['proof_path', 'source_url', 'hours']);
        });
        Schema::table('team_members', function (Blueprint $table) {
            $table->dropColumn(['leaver_type', 'exit_reason']);
        });
        Schema::table('equity_snapshots', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_id');
        });
        Schema::table('revenues', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_id');
            $table->dropColumn('deductions');
        });
        Schema::table('contributions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_id');
        });
        Schema::table('profit_distributions', function (Blueprint $table) {
            $table->dropUnique('profit_distributions_revenue_member_unique');
        });
        Schema::table('contributions', function (Blueprint $table) {
            $table->dropColumn(['deal_value', 'estimated_value', 'commission_rate']);
        });
        Schema::table('revenues', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
