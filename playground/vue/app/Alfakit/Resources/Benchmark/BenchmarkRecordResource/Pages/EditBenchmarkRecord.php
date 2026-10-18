<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\Benchmark\BenchmarkRecordResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use App\Alfakit\Resources\Benchmark\BenchmarkRecordResource;

class EditBenchmarkRecord extends EditRecord
{
    protected static string $resource = BenchmarkRecordResource::class;
}
