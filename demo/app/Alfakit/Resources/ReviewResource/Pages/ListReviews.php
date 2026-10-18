<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\ReviewResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use AlfaSix\Alfakit\Schemas\Components\Tabs\Tab;
use App\Alfakit\Resources\ReviewResource;
use App\Enums\ReviewStatus;
use Illuminate\Database\Eloquent\Builder;

/** The moderation queue opens on the pending tab; the other tabs are the archive. */
class ListReviews extends ListRecords
{
    protected static string $resource = ReviewResource::class;

    public function getTabs(): array
    {
        $count = fn (ReviewStatus $status): int => ReviewResource::getEloquentQuery()->where('status', $status)->count();

        $tab = fn (ReviewStatus $status, string $key): Tab => Tab::make(fn (): string => __("catalog.review_tabs.{$key}"))
            ->icon($status->getIcon())
            ->badge(fn (): int => $count($status))
            ->badgeColor($status->getColor())
            ->modifyQueryUsing(fn (Builder $query) => $query->where('status', $status));

        return [
            'pending' => $tab(ReviewStatus::Pending, 'pending'),
            'approved' => $tab(ReviewStatus::Approved, 'approved'),
            'rejected' => $tab(ReviewStatus::Rejected, 'rejected'),
            'all' => Tab::make(fn (): string => __('catalog.review_tabs.all')),
        ];
    }

    public function getDefaultActiveTab(): string|int|null
    {
        return 'pending';
    }

    /** Reviews are written by customers in the shop, never created here. */
    protected function getHeaderActions(): array
    {
        return [];
    }
}
