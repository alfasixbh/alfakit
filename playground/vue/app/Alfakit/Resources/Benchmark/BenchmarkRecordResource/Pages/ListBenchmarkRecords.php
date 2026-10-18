<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\Benchmark\BenchmarkRecordResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use App\Alfakit\Resources\Benchmark\BenchmarkRecordResource;

class ListBenchmarkRecords extends ListRecords
{
    protected static string $resource = BenchmarkRecordResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
