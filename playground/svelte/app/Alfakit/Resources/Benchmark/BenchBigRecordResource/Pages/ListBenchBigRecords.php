<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\Benchmark\BenchBigRecordResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use App\Alfakit\Resources\Benchmark\BenchBigRecordResource;

class ListBenchBigRecords extends ListRecords
{
    protected static string $resource = BenchBigRecordResource::class;
}
