<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Widgets;

use AlfaSix\Alfakit\Widgets\ChartWidget;
use App\Models\Post;

/**
 * Showcase gallery: a chart with a filter dropdown (`getFilters()`), over the seeded posts.
 */
class GalleryChart extends ChartWidget
{
    protected ?string $maxHeight = '220px';

    protected function getHeading(): ?string
    {
        return __('playground.showcase.gallery.chart_heading');
    }

    protected function getChartType(): string
    {
        return 'bar';
    }

    /**
     * @return array<string, string>
     */
    protected function getFilters(): ?array
    {
        return [
            'status' => __('playground.showcase.gallery.chart_by_status'),
            'featured' => __('playground.showcase.gallery.chart_by_featured'),
        ];
    }

    protected function getData(): array
    {
        if ($this->getFilter() === 'featured') {
            return [
                'labels' => [__('playground.showcase.gallery.chart_featured'), __('playground.showcase.gallery.chart_not_featured')],
                'datasets' => [[
                    'label' => __('playground.showcase.gallery.chart_dataset'),
                    'data' => [Post::query()->where('is_featured', true)->count(), Post::query()->where('is_featured', false)->count()],
                ]],
            ];
        }

        $counts = Post::query()->selectRaw('status, count(*) as total')->groupBy('status')->orderBy('status')->pluck('total', 'status');

        return [
            'labels' => $counts->keys()->all(),
            'datasets' => [['label' => __('playground.showcase.gallery.chart_dataset'), 'data' => $counts->values()->map(static fn ($value): int => (int) $value)->all()]],
        ];
    }
}
