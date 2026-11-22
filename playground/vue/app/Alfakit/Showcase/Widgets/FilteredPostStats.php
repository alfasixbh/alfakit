<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Widgets;

use AlfaSix\Alfakit\Widgets\Concerns\InteractsWithPageFilters;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget\Stat;
use App\Models\Post;

/**
 * Showcase dashboards: a stat that follows the dashboard's filters (`$this->pageFilters`).
 */
class FilteredPostStats extends StatsOverviewWidget
{
    use InteractsWithPageFilters;

    protected function getStats(): array
    {
        return [
            Stat::make('Matching posts', (string) FilteredPostsTable::filtered(Post::query(), $this->pageFilters)->count()),
        ];
    }
}
