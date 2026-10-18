<?php

declare(strict_types=1);

namespace App\Filament\Pages\Benchmark\Widgets;

use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use App\Models\Benchmark\BenchmarkRecord;
use App\Models\Benchmark\BenchmarkVendor;

class InventoryStats extends StatsOverviewWidget
{
    /** @var int|string|array<string, int|string|null> */
    protected int|string|array $columnSpan = 'full';

    protected function getStats(): array
    {
        return [
            Stat::make('Units in stock', number_format((int) BenchmarkRecord::query()->sum('quantity'))),
            Stat::make('Average rating', number_format((float) BenchmarkRecord::query()->avg('rating'), 1)),
            Stat::make('Discontinued', number_format(BenchmarkRecord::query()->where('status', 'discontinued')->count()))->color('danger'),
            Stat::make('Vendors', number_format(BenchmarkVendor::query()->count())),
        ];
    }
}
