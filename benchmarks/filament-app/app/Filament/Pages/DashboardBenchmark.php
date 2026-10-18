<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use App\Filament\Pages\Benchmark\Widgets\InventoryStats;
use App\Filament\Pages\Benchmark\Widgets\LatestRecordsTable;
use App\Filament\Pages\Benchmark\Widgets\RecordStats;
use App\Filament\Pages\Benchmark\Widgets\RegionChart;
use App\Filament\Pages\Benchmark\Widgets\ShipmentsChart;
use App\Filament\Pages\Benchmark\Widgets\StatusChart;
use BackedEnum;
use Filament\Pages\Page;
use UnitEnum;

/**
 * Benchmark scenario: the Filament v5 counterpart of
 * playground/react/app/Alfakit/Pages/Benchmark/DashboardBenchmark.php (six lazy widgets).
 */
class DashboardBenchmark extends Page
{
    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-chart-bar';

    protected static string|UnitEnum|null $navigationGroup = 'Benchmark';

    protected static ?string $title = 'Dashboard benchmark';

    protected static ?string $slug = 'dashboard-benchmark';

    protected function getHeaderWidgets(): array
    {
        return [
            RecordStats::class,
            InventoryStats::class,
            StatusChart::class,
            ShipmentsChart::class,
            RegionChart::class,
            LatestRecordsTable::class,
        ];
    }

    public function getHeaderWidgetsColumns(): int|array
    {
        return 3;
    }
}
