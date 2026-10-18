<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\BenchBigRecordResource\Pages;
use App\Models\Benchmark\BenchBigRecord;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Enums\PaginationMode;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use UnitEnum;

/**
 * Benchmark scenario: 1,000,000 rows (bench_big_records), 25 per page. `?mode=simple` or
 * `?mode=cursor` switches the pagination mode (first request only; scripts/bench/big.mjs
 * measures full page loads). Mirrors the AlfaKit playground's BenchBigRecordResource.
 */
class BenchBigRecordResource extends Resource
{
    protected static ?string $model = BenchBigRecord::class;

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-chart-bar';

    protected static string|UnitEnum|null $navigationGroup = 'Benchmark';

    protected static ?string $recordTitleAttribute = 'sku';

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('sku')->sortable()->searchable(query: fn (Builder $query, string $search): Builder => $query->where('sku', '>=', $search)->where('sku', '<', $search."\u{10FFFF}")),
                TextColumn::make('name'),
                TextColumn::make('status')->badge()->sortable(),
                TextColumn::make('quantity')->numeric()->sortable()->alignEnd(),
                TextColumn::make('unit_price')->money('USD')->sortable()->alignEnd(),
                TextColumn::make('created_at')->dateTime()->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')->options(['draft' => 'Draft', 'active' => 'Active', 'backorder' => 'Backorder', 'discontinued' => 'Discontinued']),
            ])
            ->paginationMode(fn (): PaginationMode => match (request()->query('mode')) {
                'simple' => PaginationMode::Simple,
                'cursor' => PaginationMode::Cursor,
                default => PaginationMode::Default,
            })
            ->defaultSort('id', 'asc')
            ->paginationPageOptions([25])
            ->defaultPaginationPageOption(25);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListBenchBigRecords::route('/'),
        ];
    }
}
