<?php

declare(strict_types=1);

namespace App\Alfakit\Portal\Widgets;

use AlfaSix\Alfakit\Widgets\StatsOverviewWidget;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget\Stat;
use App\Alfakit\Portal\Resources\OrderResource;
use Illuminate\Support\Number;

/**
 * The customer's own numbers: the resource query is scoped to the signed-in user.
 */
class OrderStats extends StatsOverviewWidget
{
    protected function getStats(): array
    {
        $orders = OrderResource::getEloquentQuery();
        $last = (clone $orders)->latest('placed_at')->first();

        return [
            Stat::make(__('playground.portal.stats.open'), Number::format((clone $orders)->whereIn('status', ['processing', 'shipped'])->count(), locale: app()->getLocale()))
                ->descriptionIcon('truck')
                ->color('warning'),
            Stat::make(__('playground.portal.stats.spent'), (string) Number::currency((int) (clone $orders)->where('status', '!=', 'cancelled')->sum('total') / 100, in: 'USD', locale: app()->getLocale()))
                ->color('success'),
            Stat::make(__('playground.portal.stats.last'), $last?->placed_at?->translatedFormat('j M Y') ?? __('playground.portal.stats.none'))
                ->description($last?->number)
                ->color('primary'),
        ];
    }
}
