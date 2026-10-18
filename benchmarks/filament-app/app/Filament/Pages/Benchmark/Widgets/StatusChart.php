<?php

declare(strict_types=1);

namespace App\Filament\Pages\Benchmark\Widgets;

use Filament\Widgets\ChartWidget;
use App\Models\Benchmark\BenchmarkRecord;

class StatusChart extends ChartWidget
{
    protected ?string $heading = 'Records by status';

    protected function getType(): string
    {
        return 'doughnut';
    }

    protected function getData(): array
    {
        $counts = BenchmarkRecord::query()->selectRaw('status, count(*) as total')->groupBy('status')->orderBy('status')->pluck('total', 'status');

        return [
            'labels' => $counts->keys()->all(),
            'datasets' => [['label' => 'Records', 'data' => $counts->values()->map(static fn ($value): int => (int) $value)->all()]],
        ];
    }
}
