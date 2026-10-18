<?php

declare(strict_types=1);

namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Widgets\Widget;
use App\Alfakit\Widgets\Concerns\ReadsDashboardFilters;
use App\Models\Review;
use Illuminate\Database\Eloquent\Builder;

/**
 * A custom widget: PHP gathers the period's newest reviews, and a registered frontend
 * component (`demo-latest-reviews`, one per renderer) draws them. Nothing is computed in
 * the browser except the relative dates, which the locale formatter handles.
 */
class LatestReviews extends Widget
{
    use ReadsDashboardFilters;

    protected static ?int $sort = 5;

    protected static ?string $component = 'demo-latest-reviews';

    protected function getViewData(): array
    {
        [$start, $end] = $this->range();
        $storeIds = $this->storeIds();

        $reviews = Review::query()
            ->with(['product:id,name', 'customer:id,first_name,last_name'])
            ->whereHas('product', fn (Builder $query) => $query->whereIn('store_id', $storeIds))
            ->whereBetween('created_at', [$start, $end])
            ->latest()
            ->limit(6)
            ->get();

        return [
            'heading' => __('platform.dashboard.latest_reviews.heading'),
            'description' => __('platform.dashboard.latest_reviews.description'),
            'empty' => __('platform.dashboard.latest_reviews.empty'),
            'verifiedLabel' => __('platform.dashboard.latest_reviews.verified'),
            'reviews' => $reviews->map(fn (Review $review): array => [
                'id' => $review->id,
                'rating' => $review->rating,
                'ratingLabel' => __('platform.dashboard.latest_reviews.rating', ['rating' => $review->rating]),
                'title' => $review->title,
                'body' => $review->body,
                'product' => $review->product?->getAttribute('name'),
                'customer' => $review->customer?->getAttribute('name'),
                'status' => $review->status->value,
                'statusLabel' => $review->status->getLabel(),
                'statusColor' => $review->status->getColor(),
                'verified' => $review->is_verified_purchase,
                'createdAt' => $review->created_at?->toIso8601String(),
            ])->all(),
        ];
    }
}
