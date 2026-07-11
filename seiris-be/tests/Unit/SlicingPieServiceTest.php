<?php

namespace Tests\Unit;

use App\Services\SlicingPieService;
use PHPUnit\Framework\TestCase;

class SlicingPieServiceTest extends TestCase
{
    /**
     * Tracer: CASH gets 4x multiplier (independent literal from the Slicing Pie spec).
     */
    public function test_cash_contribution_gets_four_times_multiplier(): void
    {
        $result = SlicingPieService::calculateSlices('CASH', 1000);

        $this->assertSame(4.0, $result['multiplier']);
        $this->assertSame(4000, $result['total_slices']);
    }

    /**
     * TIME gets 2x multiplier (independent literal).
     */
    public function test_time_contribution_gets_two_times_multiplier(): void
    {
        $result = SlicingPieService::calculateSlices('TIME', 500);

        $this->assertSame(2.0, $result['multiplier']);
        $this->assertSame(1000, $result['total_slices']);
    }

    /**
     * SALES gets 2x multiplier (independent literal).
     */
    public function test_sales_contribution_gets_two_times_multiplier(): void
    {
        $result = SlicingPieService::calculateSlices('SALES', 250);

        $this->assertSame(2.0, $result['multiplier']);
        $this->assertSame(500, $result['total_slices']);
    }

    /**
     * Unknown type must be rejected (behavior already implemented).
     */
    public function test_unknown_contribution_type_throws(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        SlicingPieService::calculateSlices('BOGUS', 100);
    }

    /**
     * RED: negative contribution value is not valid and must be rejected.
     * Currently calculateSlices accepts it (computes negative slices) -> fails.
     */
    public function test_negative_value_is_rejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        SlicingPieService::calculateSlices('CASH', -100);
    }
}
