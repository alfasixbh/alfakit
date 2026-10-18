<?php

declare(strict_types=1);

namespace App\Filament\Pages\Benchmark\Widgets;

use Filament\Widgets\ChartWidget;
use App\Models\Benchmark\BenchmarkRecord;

class ShipmentsChart extends ChartWidget
{
    protected ?string $heading = 'Shipments per month';

    protected function getType(): string
    {
        return 'line';
    }

    protected function getData(): array
    {
        $counts = BenchmarkRecord::query()
            ->whereNotNull('shipped_at')
            ->selectRaw("strftime('%Y-%m', shipped_at) as month, count(*) as total")
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('total', 'month');

        return [
            'labels' => $counts->keys()->all(),
            'datasets' => [['label' => 'Shipments', 'data' => $counts->values()->map(static fn ($value): int => (int) $value)->all()]],
        ];
    }
}
