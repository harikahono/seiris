<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\ContributionController;
use App\Http\Controllers\Api\ApprovalController;
use App\Http\Controllers\Api\RevenueController;
use App\Http\Controllers\Api\EquityController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FmrProposalController;
use App\Http\Controllers\Api\ProjectController;

// ── Health Check (public, untuk UptimeRobot) ──────────────────
Route::get('/ping', fn () => response()->json([
    'status' => 'ok',
    'app'    => config('app.name'),
    'time'   => now()->toISOString(),
]));

// ── Auth (public) ─────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('login',    [AuthController::class, 'login'])->middleware('throttle:auth');
});

// ── Public: Preview undangan tim ──────────────────────────────
Route::get('teams/invite/{inviteCode}', [TeamController::class, 'previewInvite']);

// ── Authenticated Routes ───────────────────────────────────────
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {

    // Broadcasting auth (Pusher presence channel)
    Route::post('broadcasting/auth', function (Request $request) {
        $user = $request->user();
        $channel = $request->get('channel_name');
        Log::info('[broadcasting/auth] REQUEST', [
            'channel' => $channel,
            'user_id' => $user?->id,
            'user_name' => $user?->name,
        ]);
        try {
            $response = Broadcast::auth($request);
            Log::info('[broadcasting/auth] SUCCESS', ['channel' => $channel]);
            return $response;
        } catch (\Throwable $e) {
            Log::warning('[broadcasting/auth] FAILED', [
                'channel' => $channel,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    })->middleware('throttle:write');

    // Auth
    Route::post('auth/logout', [AuthController::class, 'logout'])->middleware('throttle:write');
    Route::get('auth/me', [AuthController::class, 'me']);
    // User settings
    Route::patch('users/me/profile', [AuthController::class, 'updateProfile'])->middleware('throttle:write');
    Route::delete('users/me/profile-photo', [AuthController::class, 'deleteProfilePhoto'])->middleware('throttle:write');
    Route::patch('users/me/github-token', [AuthController::class, 'updateGithubToken'])->middleware('throttle:write');

    // Dashboard
    Route::get('my-dashboard', [DashboardController::class, 'index']);
    // Config
    Route::get('config', fn () => response()->json(['features' => config('seiris.features')]));

    // Teams — no team param (create, list, join)
    Route::post('teams',       [TeamController::class, 'store'])->middleware('throttle:write');
    Route::get('teams',        [TeamController::class, 'index']);
    Route::post('teams/join',  [TeamController::class, 'join'])->middleware('throttle:write');

    // Routes without {team} param — member check inline di controller
    Route::post('contributions/{contribution}/vote', [ApprovalController::class, 'vote'])->middleware('throttle:write');
    Route::post('revenues/{revenue}/distribute',        [RevenueController::class, 'distribute'])->middleware('throttle:write');
    Route::post('revenues/{revenue}/request-distribute',[RevenueController::class, 'requestDistribute'])->middleware('throttle:write');
    Route::post('fmr-proposals/{proposal}/approve',  [FmrProposalController::class, 'approve'])->middleware('throttle:write');
    Route::post('fmr-proposals/{proposal}/reject',   [FmrProposalController::class, 'reject'])->middleware('throttle:write');

    // Routes with {team} param — require team.member middleware
    Route::middleware('team.member')->group(function () {

        // Teams
        Route::get('teams/{team}',                                [TeamController::class, 'show']);
        Route::put('teams/{team}',                                [TeamController::class, 'update'])->middleware('throttle:write');
        Route::post('teams/{team}/logo',                          [TeamController::class, 'uploadLogo'])->middleware('throttle:write');
        Route::delete('teams/{team}/logo',                         [TeamController::class, 'deleteLogo'])->middleware('throttle:write');
        Route::put('teams/{team}/members/{member}/fmr',           [TeamController::class, 'updateFmr'])->middleware('throttle:write');
        Route::post('teams/{team}/freeze',                        [TeamController::class, 'freeze'])->middleware('throttle:write');
        Route::post('teams/{team}/members/{member}/exit',         [TeamController::class, 'exitMember'])->middleware('throttle:write');

        // Contributions
        Route::get('teams/{team}/contributions',                  [ContributionController::class, 'index']);
        Route::post('teams/{team}/contributions',                 [ContributionController::class, 'store'])->middleware('throttle:write');
        Route::get('teams/{team}/contributions/{contribution}',   [ContributionController::class, 'show']);
        // Proof attach/replace (PENDING only) & GitHub diff viewer (read‑only) – toggleable via feature flag
        if (config('seiris.features.contribution_proof')) {
            Route::post('teams/{team}/contributions/{contribution}/proof', [ContributionController::class, 'attachProof'])->middleware('throttle:write');
            Route::get('teams/{team}/contributions/{contribution}/github-diff', [ContributionController::class, 'githubDiff']);
        }

        // Revenues
        Route::get('teams/{team}/revenues',                       [RevenueController::class, 'index']);
        Route::post('teams/{team}/revenues',                      [RevenueController::class, 'store'])->middleware('throttle:write');
        Route::get('teams/{team}/revenues/{revenue}',             [RevenueController::class, 'show']);

        // FMR Proposals
        Route::post('teams/{team}/fmr-proposals',                 [FmrProposalController::class, 'store'])->middleware('throttle:write');
        Route::get('teams/{team}/fmr-proposals',                  [FmrProposalController::class, 'index']);

        // Equity
        Route::get('teams/{team}/equity',                         [EquityController::class, 'current']);
        Route::get('teams/{team}/equity/history',                 [EquityController::class, 'history']);
        Route::get('teams/{team}/equity/export',                  [EquityController::class, 'export'])->middleware('throttle:write');

        // Audit Log
        Route::get('teams/{team}/audit-logs',                     [AuditLogController::class, 'index']);

        // Projects (anak dari tim) — Slicing Pie Beranak
        Route::get('teams/{team}/projects',                       [ProjectController::class, 'index']);
        Route::post('teams/{team}/projects',                      [ProjectController::class, 'store'])->middleware('throttle:write');

        // Project-scoped routes
        Route::middleware('project.member')->prefix('teams/{team}/projects/{project}')->group(function () {
            Route::get('/',                                       [ProjectController::class, 'show']);
            Route::post('freeze',                                 [ProjectController::class, 'freeze'])->middleware('throttle:write');

            // Contributions scoped ke project
            Route::get('contributions',                           [ContributionController::class, 'index']);
            Route::post('contributions',                          [ContributionController::class, 'store'])->middleware('throttle:write');
            Route::get('contributions/{contribution}',            [ContributionController::class, 'show']);
            // Proof & diff scoped ke project (feature flag)
            if (config('seiris.features.contribution_proof')) {
                Route::post('contributions/{contribution}/proof', [ContributionController::class, 'attachProof'])->middleware('throttle:write');
                Route::get('contributions/{contribution}/github-diff', [ContributionController::class, 'githubDiff']);
            }

            // Revenues scoped ke project
            Route::get('revenues',                                [RevenueController::class, 'index']);
            Route::post('revenues',                               [RevenueController::class, 'store'])->middleware('throttle:write');

            // Equity scoped ke project
            Route::get('equity',                                  [EquityController::class, 'current']);
            Route::get('equity/history',                          [EquityController::class, 'history']);
            Route::get('equity/export',                           [EquityController::class, 'export'])->middleware('throttle:write');

            // Project members — roster (owner only)
            Route::post('members',                                [ProjectController::class, 'addMember'])->middleware('throttle:write');
            Route::delete('members/{member}',                     [ProjectController::class, 'removeMember'])->middleware('throttle:write');
        });
    });
});