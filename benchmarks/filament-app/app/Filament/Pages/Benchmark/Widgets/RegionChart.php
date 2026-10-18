<?php

declare(strict_types=1);

namespace App\Filament\Pages\Benchmark\Widgets;

use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\DB;

class RegionChart extends ChartWidget
{
    protected ?string $heading = 'Records by region';

    protected function getType(): string
    {
        return 'bar';
    }

    protected function getData(): array
    {
        $counts = DB::table('benchmark_records')
            ->join('benchmark_regions', 'benchmark_regions.id', '=', 'benchmark_records.region_id')
            ->selectRaw('benchmark_regions.name as region, count(*) as total')
            ->groupBy('benchmark_regions.name')
            ->orderBy('benchmark_regions.name')
            ->pluck('total', 'region');

        return [
            'labels' => $counts->keys()->all(),
            'datasets' => [['label' => 'Records', 'data' => $counts->values()->map(static fn ($value): int => (int) $value)->all()]],
        ];
    }
}
