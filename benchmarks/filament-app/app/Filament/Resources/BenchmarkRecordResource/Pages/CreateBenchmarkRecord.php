<?php

declare(strict_types=1);

namespace App\Filament\Resources\BenchmarkRecordResource\Pages;

use App\Filament\Resources\BenchmarkRecordResource;
use Filament\Resources\Pages\CreateRecord;

class CreateBenchmarkRecord extends CreateRecord
{
    protected static string $resource = BenchmarkRecordResource::class;
}
