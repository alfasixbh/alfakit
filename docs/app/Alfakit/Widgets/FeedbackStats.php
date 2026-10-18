<?php

declare(strict_types=1);

namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Widgets\StatsOverviewWidget;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget\Stat;
use App\Models\Feedback;

class FeedbackStats extends StatsOverviewWidget
{
    protected function getStats(): array
    {
        $total = Feedback::count();
        $helpful = Feedback::where('is_helpful', true)->count();
        $pending = Feedback::where('status', 'new')->count();

        $rate = $total === 0 ? 0 : (int) round($helpful / $total * 100);

        return [
            Stat::make('Feedback received', (string) $total)
                ->description('All time')
                ->color('primary'),
            Stat::make('Helpful rate', $rate.'%')
                ->description($helpful.' marked helpful')
                ->descriptionIcon($rate >= 50 ? 'trending-up' : 'trending-down')
                ->color($rate >= 50 ? 'success' : 'danger'),
            Stat::make('Awaiting review', (string) $pending)
                ->description('Status "new"')
                ->color($pending > 0 ? 'warning' : 'success'),
        ];
    }
}
