<?php

namespace Database\Factories;

use App\Models\Contribution;
use App\Models\Team;
use App\Models\TeamMember;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Contribution>
 */
class ContributionFactory extends Factory
{
    protected $model = Contribution::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'member_id' => fn (array $attrs) => TeamMember::factory()->state(['team_id' => $attrs['team_id']]),
            'type' => 'CASH',
            'description' => fake()->sentence(),
            'value' => 1000,
            'multiplier' => 4.0,
            'total_slices' => 4000,
            'status' => 'PENDING',
            'contribution_date' => now(),
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => ['status' => 'APPROVED']);
    }

    public function ofType(string $type, int $value, float $multiplier): static
    {
        return $this->state(fn () => [
            'type' => $type,
            'value' => $value,
            'multiplier' => $multiplier,
            'total_slices' => (int) round($value * $multiplier),
        ]);
    }
}
