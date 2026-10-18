<?php

declare(strict_types=1);

namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Widgets\StatsOverviewWidget;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Number;

class BlogStats extends StatsOverviewWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make(__('playground.dashboard.users'), Number::format(1024))
                ->description(__('playground.dashboard.this_month', ['change' => '+'.Number::percentage(12)]))
                ->descriptionIcon('trending-up')
                ->color('success')
                ->chart([7, 2, 10, 3, 15, 4, 17]),
            Stat::make(__('playground.dashboard.orders'), Number::format(312))
                ->description(__('playground.dashboard.this_month', ['change' => '-'.Number::percentage(3)]))
                ->descriptionIcon('trending-down')
                ->color('danger'),
            Stat::make(__('playground.dashboard.revenue'), (string) Number::currency(48210, in: 'USD', precision: 0))
                ->description(__('playground.dashboard.on_track'))
                ->color('primary'),
        ];
    }
}
