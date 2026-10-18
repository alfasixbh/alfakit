<?php

declare(strict_types=1);

namespace App\Filament\Pages\Benchmark\Widgets;

use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use App\Models\Benchmark\BenchmarkRecord;

class RecordStats extends StatsOverviewWidget
{
    /** @var int|string|array<string, int|string|null> */
    protected int|string|array $columnSpan = 'full';

    protected function getStats(): array
    {
        return [
            Stat::make('Records', number_format(BenchmarkRecord::query()->count())),
            Stat::make('Active', number_format(BenchmarkRecord::query()->where('status', 'active')->count()))->color('success'),
            Stat::make('Backorder', number_format(BenchmarkRecord::query()->where('status', 'backorder')->count()))->color('warning'),
            Stat::make('Average price', number_format((float) BenchmarkRecord::query()->avg('unit_price'), 2)),
        ];
    }
}
