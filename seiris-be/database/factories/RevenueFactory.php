<?php

namespace Database\Factories;

use App\Models\Revenue;
use App\Models\Team;
use App\Models\TeamMember;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Revenue>
 */
class RevenueFactory extends Factory
{
    protected $model = Revenue::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'project_id' => null,
            'recorded_by' => fn (array $attrs) => TeamMember::factory()->state(['team_id' => $attrs['team_id']]),
            'description' => fake()->sentence(),
            'amount' => 100000,
            'distributable_amount' => 100000,
            'deductions' => [],
            'revenue_date' => now(),
            'is_distributed' => false,
            'status' => 'pending',
        ];
    }

    public function distributed(): static
    {
        return $this->state(fn () => [
            'status' => 'distributed',
            'is_distributed' => true,
            'distributed_at' => now(),
        ]);
    }
}
