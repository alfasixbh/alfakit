<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\ProductResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use AlfaSix\Alfakit\Schemas\Components\Tabs\Tab;
use App\Alfakit\Resources\ProductResource;
use App\Enums\ProductStatus;
use Illuminate\Database\Eloquent\Builder;

class ListProducts extends ListRecords
{
    protected static string $resource = ProductResource::class;

    public function getTabs(): array
    {
        $count = fn (ProductStatus $status): int => ProductResource::getEloquentQuery()->where('status', $status)->count();

        return [
            'all' => Tab::make(fn (): string => __('catalog.review_tabs.all')),
            'active' => Tab::make(fn (): string => ProductStatus::Active->getLabel())
                ->icon(ProductStatus::Active->getIcon())
                ->badge(fn (): int => $count(ProductStatus::Active))
                ->badgeColor('success')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('status', ProductStatus::Active)),
            'draft' => Tab::make(fn (): string => ProductStatus::Draft->getLabel())
                ->icon(ProductStatus::Draft->getIcon())
                ->badge(fn (): int => $count(ProductStatus::Draft))
                ->badgeColor('gray')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('status', ProductStatus::Draft)),
            'low_stock' => Tab::make(fn (): string => __('catalog.filters.low_stock'))
                ->icon('triangle-alert')
                ->badge(fn (): int => ProductResource::getEloquentQuery()->where('stock', '<=', 5)->where('status', ProductStatus::Active)->count())
                ->badgeColor('warning')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('stock', '<=', 5)),
        ];
    }

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
