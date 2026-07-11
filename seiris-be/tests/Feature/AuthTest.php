<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_returns_token_and_user(): void
    {
        $r = $this->postJson('/api/auth/register', [
            'name'                  => 'Budi Santoso',
            'email'                 => 'test@gmail.com',
            'password'              => 'rahasia123',
            'password_confirmation' => 'rahasia123',
        ]);

        $r->assertStatus(201);
        $r->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);
        $r->assertJsonPath('user.email', 'test@gmail.com');
    }

    public function test_login_returns_token(): void
    {
        User::factory()->create([
            'email'    => 'test@gmail.com',
            'password' => bcrypt('rahasia123'),
        ]);

        $r = $this->postJson('/api/auth/login', [
            'email'    => 'test@gmail.com',
            'password' => 'rahasia123',
        ]);

        $r->assertOk();
        $r->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum');
        $r = $this->getJson('/api/auth/me');

        $r->assertOk();
        $r->assertJsonPath('user.email', $user->email);
    }

    public function test_me_without_token_returns_401(): void
    {
        $r = $this->getJson('/api/auth/me');
        $r->assertStatus(401);
    }

    public function test_register_validates_required_fields(): void
    {
        $r = $this->postJson('/api/auth/register', []);

        $r->assertStatus(422);
        $r->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_login_wrong_password_returns_401(): void
    {
        User::factory()->create([
            'email'    => 'test@gmail.com',
            'password' => bcrypt('rahasia123'),
        ]);

        $r = $this->postJson('/api/auth/login', [
            'email'    => 'test@gmail.com',
            'password' => 'wrongpass1',
        ]);

        $r->assertStatus(401);
        $r->assertJsonPath('message', 'Email atau password salah.');
    }
}
