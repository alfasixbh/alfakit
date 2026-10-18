<?php

declare(strict_types=1);

namespace App\Alfakit\Widgets\Reports;

use AlfaSix\Alfakit\Widgets\ChartWidget;
use App\Models\Customer;

/**
 * Header widget of the customers report: customers created per month over the last year.
 */
class NewCustomersChart extends ChartWidget
{
    protected static bool $isDiscovered = false;

    protected ?string $maxHeight = '16rem';

    /** @var int|string|array<string, int|string|null> */
    protected int|string|array $columnSpan = 'full';

    protected function getHeading(): ?string
    {
        return __('platform.reports.customers.chart_heading');
    }

    protected function getDescription(): ?string
    {
        return __('platform.reports.customers.chart_description');
    }

    protected function getChartType(): string
    {
        return 'line';
    }

    protected function getData(): array
    {
        $start = now()->subMonths(11)->startOfMonth();

        // SQLite is the demo database; swap strftime() for DATE_FORMAT() on MySQL.
        $rows = Customer::query()
            ->where('store_id', alfakit()->getTenant()?->getKey())
            ->where('created_at', '>=', $start)
            ->selectRaw("strftime('%Y-%m', created_at) as month, COUNT(*) as customers")
            ->groupBy('month')
            ->pluck('customers', 'month')
            ->all();

        $labels = [];
        $data = [];
        $cursor = $start->copy();

        while ($cursor->lessThanOrEqualTo(now())) {
            $labels[] = $cursor->translatedFormat('M Y');
            $data[] = (int) ($rows[$cursor->format('Y-m')] ?? 0);
            $cursor->addMonth();
        }

        return [
            'labels' => $labels,
            'datasets' => [['label' => __('platform.reports.customers.new_customers'), 'data' => $data]],
        ];
    }

    protected function getOptions(): ?array
    {
        return [
            'plugins' => ['legend' => ['display' => false]],
            'scales' => ['y' => ['beginAtZero' => true, 'ticks' => ['precision' => 0]]],
        ];
    }
}
