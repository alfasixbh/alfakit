<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Benchmark\Widgets;

use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\Alfakit\Widgets\TableWidget;
use App\Models\Benchmark\BenchmarkRecord;

class LatestRecordsTable extends TableWidget
{
    /** @var int|string|array<string, int|string|null> */
    protected int|string|array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->heading('Latest records')
            ->query(BenchmarkRecord::query()->with(['vendor']))
            ->defaultSort('id', 'desc')
            ->defaultPaginationPageOption(10)
            ->columns([
                TextColumn::make('sku'),
                TextColumn::make('name'),
                TextColumn::make('vendor.name')->label('Vendor'),
                TextColumn::make('status')->badge(),
                TextColumn::make('unit_price')->money('USD')->alignEnd(),
            ]);
    }
}
