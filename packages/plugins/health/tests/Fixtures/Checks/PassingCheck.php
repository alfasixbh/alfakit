<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitHealth\Tests\Fixtures\Checks;

use Spatie\Health\Checks\Check;
use Spatie\Health\Checks\Result;

class PassingCheck extends Check
{
    public function run(): Result
    {
        return Result::make()->ok()->shortSummary('Fast')->meta(['latency_ms' => 12, 'cached' => true]);
    }
}
