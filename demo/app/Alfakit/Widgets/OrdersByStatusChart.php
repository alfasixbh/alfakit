<?php

declare(strict_types=1);

namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Widgets\ChartWidget;
use App\Alfakit\Widgets\Concerns\ReadsDashboardFilters;
use App\Enums\OrderStatus;

/**
 * A doughnut of the period's orders by status, painted with the theme palette.
 */
class OrdersByStatusChart extends ChartWidget
{
    use ReadsDashboardFilters;

    protected static ?int $sort = 3;

    protected ?string $maxHeight = '20rem';

    protected function getHeading(): ?string
    {
        return __('platform.dashboard.status_chart.heading');
    }

    protected function getDescription(): ?string
    {
        return __('platform.dashboard.status_chart.description');
    }

    protected function getChartType(): string
    {
        return 'doughnut';
    }

    protected function getPollingInterval(): ?string
    {
        return $this->isLive() ? '10s' : null;
    }

    protected function getData(): array
    {
        $counts = $this->allOrders()
            ->selectRaw('status, COUNT(*) as orders')
            ->groupBy('status')
            ->pluck('orders', 'status');

        $labels = [];
        $data = [];

        foreach (OrderStatus::cases() as $status) {
            $count = (int) ($counts[$status->value] ?? 0);

            if ($count === 0) {
                continue;
            }

            $labels[] = $status->getLabel();
            $data[] = $count;
        }

        return [
            'labels' => $labels,
            'datasets' => [['label' => __('platform.dashboard.revenue_chart.orders'), 'data' => $data, 'borderWidth' => 0, 'hoverOffset' => 6]],
        ];
    }

    protected function getOptions(): ?array
    {
        return [
            'cutout' => '62%',
            'plugins' => ['legend' => ['position' => 'bottom']],
        ];
    }
}
