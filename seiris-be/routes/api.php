<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\ContributionController;
use App\Http\Controllers\Api\ApprovalController;
use App\Http\Controllers\Api\RevenueController;
use App\Http\Controllers\Api\EquityController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FmrProposalController;

// ── Health Check (public, untuk UptimeRobot) ──────────────────
Route::get('/ping', fn () => response()->json([
    'status' => 'ok',
    'app'    => config('app.name'),
    'time'   => now()->toISOString(),
]));

// ── Auth (public) ─────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
});

// ── Authenticated Routes ───────────────────────────────────────
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {

    // Broadcasting auth (Pusher presence channel)
    Route::post('broadcasting/auth', fn (Request $request) => Broadcast::auth($request));

    // Auth
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me',      [AuthController::class, 'me']);

    // Dashboard
    Route::get('my-dashboard', [DashboardController::class, 'index']);

    // Teams — no team param (create, list, join)
    Route::post('teams',       [TeamController::class, 'store']);
    Route::get('teams',        [TeamController::class, 'index']);
    Route::post('teams/join',  [TeamController::class, 'join']);

    // Routes without {team} param — member check inline di controller
    Route::post('contributions/{contribution}/vote', [ApprovalController::class, 'vote']);
    Route::post('revenues/{revenue}/distribute',     [RevenueController::class, 'distribute']);
    Route::post('fmr-proposals/{proposal}/approve',  [FmrProposalController::class, 'approve']);
    Route::post('fmr-proposals/{proposal}/reject',   [FmrProposalController::class, 'reject']);

    // Routes with {team} param — require team.member middleware
    Route::middleware('team.member')->group(function () {

        // Teams
        Route::get('teams/{team}',                                [TeamController::class, 'show']);
        Route::put('teams/{team}',                                [TeamController::class, 'update']);
        Route::put('teams/{team}/members/{member}/fmr',           [TeamController::class, 'updateFmr']);
        Route::post('teams/{team}/freeze',                        [TeamController::class, 'freeze']);
        Route::post('teams/{team}/members/{member}/exit',         [TeamController::class, 'exitMember']);

        // Contributions
        Route::get('teams/{team}/contributions',                  [ContributionController::class, 'index']);
        Route::post('teams/{team}/contributions',                 [ContributionController::class, 'store']);
        Route::get('teams/{team}/contributions/{contribution}',   [ContributionController::class, 'show']);

        // Revenues
        Route::get('teams/{team}/revenues',                       [RevenueController::class, 'index']);
        Route::post('teams/{team}/revenues',                      [RevenueController::class, 'store']);

        // FMR Proposals
        Route::post('teams/{team}/fmr-proposals',                 [FmrProposalController::class, 'store']);
        Route::get('teams/{team}/fmr-proposals',                  [FmrProposalController::class, 'index']);

        // Equity
        Route::get('teams/{team}/equity',                         [EquityController::class, 'current']);
        Route::get('teams/{team}/equity/history',                 [EquityController::class, 'history']);
        Route::get('teams/{team}/equity/export',                  [EquityController::class, 'export']);

        // Audit Log
        Route::get('teams/{team}/audit-logs',                     [AuditLogController::class, 'index']);
    });
});