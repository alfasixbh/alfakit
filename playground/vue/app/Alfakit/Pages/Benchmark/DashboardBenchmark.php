<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Benchmark;

use AlfaSix\Alfakit\Pages\Page;
use App\Alfakit\Pages\Benchmark\Widgets\InventoryStats;
use App\Alfakit\Pages\Benchmark\Widgets\LatestRecordsTable;
use App\Alfakit\Pages\Benchmark\Widgets\RecordStats;
use App\Alfakit\Pages\Benchmark\Widgets\RegionChart;
use App\Alfakit\Pages\Benchmark\Widgets\ShipmentsChart;
use App\Alfakit\Pages\Benchmark\Widgets\StatusChart;

/**
 * Benchmark scenario (scripts/bench): a dashboard with six widgets over the 10,000 benchmark
 * records: two stats overviews, a doughnut, a line and a bar chart and a table widget. The
 * widgets are lazy (the default), so their data arrives in the deferred request after the
 * page. Mirrors benchmarks/filament-app/app/Filament/Pages/DashboardBenchmark.php.
 */
class DashboardBenchmark extends Page
{
    protected static ?string $navigationIcon = 'gauge';

    protected static ?string $slug = 'dashboard-benchmark';

    public static function getNavigationGroup(): string
    {
        return __('playground.nav.groups.benchmark');
    }

    public static function getNavigationLabel(): string
    {
        return __('playground.nav.dashboard_benchmark');
    }

    public function getTitle(): string
    {
        return __('playground.nav.dashboard_benchmark');
    }

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
