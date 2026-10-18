<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\Benchmark;

use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\Benchmark\BenchBigRecordResource\Pages;
use App\Models\Benchmark\BenchBigRecord;
use Illuminate\Database\Eloquent\Builder;

/**
 * Benchmark scenario: 1,000,000 rows (bench_big_records), 25 per page. `?mode=cursor` or
 * `?mode=simple` switches the pagination mode so scripts/bench/big.mjs can compare them;
 * `?mode=deferred` keeps numbered pagination with `deferTotals()`.
 * Mirrors benchmarks/filament-app/app/Filament/Resources/BenchBigRecordResource.php.
 */
class BenchBigRecordResource extends Resource
{
    protected static ?string $model = BenchBigRecord::class;

    protected static ?string $navigationIcon = 'gauge';

    protected static ?string $recordTitleAttribute = 'sku';

    public static function getNavigationGroup(): string
    {
        return __('playground.nav.groups.benchmark');
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                // Prefix search as a range on the unique index (`like '%…%'` would scan every row).
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
            ->paginationMode(fn (): ?string => in_array(request()->query('mode'), ['cursor', 'simple'], true) ? request()->query('mode') : null)
            // `?mode=deferred`: numbered pagination whose count query (1M rows) loads after the rows.
            ->deferTotals(fn (): bool => request()->query('mode') === 'deferred')
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
