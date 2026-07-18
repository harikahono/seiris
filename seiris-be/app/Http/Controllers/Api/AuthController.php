<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * POST /api/auth/register
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Registrasi berhasil.',
            'token'   => $token,
            'user'    => new UserResource($user),
        ], 201);
    }

    /**
     * POST /api/auth/login
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Email atau password salah.',
            ], 401);
        }

        // Opsional: revoke token lain kalau user minta
        if ($request->boolean('revoke_others')) {
            $user->tokens()->delete();
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil.',
            'token'   => $token,
            'user'    => new UserResource($user),
        ]);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }

/**
 * GET /api/auth/me
 */
public function me(Request $request): JsonResponse
{
    return response()->json([
        'user' => new UserResource($request->user()),
    ]);
}

/**
 * PATCH /api/users/me/github-token
 * Update user's GitHub personal access token (for private repo diff)
 */
public function updateGithubToken(Request $request): JsonResponse
{
    $user = $request->user();
    
    $request->validate([
        'github_token' => ['nullable', 'string', 'max:255'],
    ]);
    
    $user->update([
        'github_token' => $request->filled('github_token') ? $request->github_token : null,
    ]);
    
    return response()->json([
        'message' => 'GitHub token berhasil diperbarui.',
        'user' => new UserResource($user),
    ]);
}
}