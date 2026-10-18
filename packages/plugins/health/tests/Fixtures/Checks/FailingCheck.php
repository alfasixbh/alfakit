<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitHealth\Tests\Fixtures\Checks;

use Spatie\Health\Checks\Check;
use Spatie\Health\Checks\Result;

class FailingCheck extends Check
{
    public static string $status = 'failed';

    public function run(): Result
    {
        $result = Result::make()->shortSummary('95%')->meta(['used' => '95%']);

        return match (static::$status) {
            'ok' => $result->ok(),
            'warning' => $result->warning('Disk is getting full'),
            default => $result->failed('Disk almost full'),
        };
    }
}
