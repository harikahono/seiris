<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // F-1: partial unique index — cuma 1 PENDING proposal per member
        // PostgreSQL: WHERE status = 'PENDING' → sisanya bebas duplikat (APPROVED/REJECTED)
        DB::statement('
            CREATE UNIQUE INDEX uq_fmr_proposals_pending
            ON fmr_proposals (member_id)
            WHERE status = \'PENDING\'
        ');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_fmr_proposals_pending');
    }
};
