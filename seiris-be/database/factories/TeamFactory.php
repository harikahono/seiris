<?php

namespace Database\Factories;

use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Team>
 */
class TeamFactory extends Factory
{
    protected $model = Team::class;

    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'name' => fake()->company(),
            'description' => fake()->sentence(),
            'invite_code' => strtoupper(Str::random(8)),
            'approval_threshold' => 50,
            'commission_rate' => 50.00,
            'is_frozen' => false,
        ];
    }

    public function frozen(): static
    {
        return $this->state(fn () => ['is_frozen' => true, 'frozen_at' => now()]);
    }
}
