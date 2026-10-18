<?php

declare(strict_types=1);

namespace App\Filament\Resources\BenchBigRecordResource\Pages;

use App\Filament\Resources\BenchBigRecordResource;
use Filament\Resources\Pages\ListRecords;

class ListBenchBigRecords extends ListRecords
{
    protected static string $resource = BenchBigRecordResource::class;
}
