<?php

namespace Database\Factories;

use App\Models\FmrProposal;
use App\Models\Team;
use App\Models\TeamMember;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FmrProposal>
 */
class FmrProposalFactory extends Factory
{
    protected $model = FmrProposal::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'member_id' => fn (array $attrs) => TeamMember::factory()->state(['team_id' => $attrs['team_id']]),
            'proposed_fmr' => 75000,
            'status' => 'PENDING',
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => ['status' => 'APPROVED']);
    }

    public function rejected(): static
    {
        return $this->state(fn () => ['status' => 'REJECTED']);
    }
}
