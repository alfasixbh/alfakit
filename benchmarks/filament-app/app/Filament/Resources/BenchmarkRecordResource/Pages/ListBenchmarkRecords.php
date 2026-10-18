<?php

declare(strict_types=1);

namespace App\Filament\Resources\BenchmarkRecordResource\Pages;

use App\Filament\Resources\BenchmarkRecordResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

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
