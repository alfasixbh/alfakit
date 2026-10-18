<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\Benchmark\BenchmarkRecordResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\CreateRecord;
use App\Alfakit\Resources\Benchmark\BenchmarkRecordResource;

class CreateBenchmarkRecord extends CreateRecord
{
    protected static string $resource = BenchmarkRecordResource::class;
}
