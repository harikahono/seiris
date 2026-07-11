<?php

namespace Database\Factories;

use App\Models\EquitySnapshot;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EquitySnapshot>
 */
class EquitySnapshotFactory extends Factory
{
    protected $model = EquitySnapshot::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'project_id' => null,
            'triggered_by_contribution' => null,
            'total_slices' => 0,
            'equity_map' => [],
            'is_frozen' => false,
        ];
    }
}
