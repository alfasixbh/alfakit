<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\OrderResource\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\ExportAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use AlfaSix\Alfakit\Schemas\Components\Tabs\Tab;
use App\Alfakit\Exporters\OrderExporter;
use App\Alfakit\Resources\OrderResource;
use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Builder;

class ListOrders extends ListRecords
{
    protected static string $resource = OrderResource::class;

    public function getTabs(): array
    {
        $open = [OrderStatus::Pending, OrderStatus::Paid, OrderStatus::Processing, OrderStatus::Shipped];

        return [
            'all' => Tab::make()->label(__('sales.orders.tabs.all')),
            'open' => Tab::make()->label(__('sales.orders.tabs.open'))
                ->icon('package-open')
                ->badge(fn (): int => OrderResource::getEloquentQuery()->whereIn('status', $open)->count())
                ->modifyQueryUsing(fn (Builder $query) => $query->whereIn('status', $open)),
            'fulfilled' => Tab::make()->label(__('sales.orders.tabs.fulfilled'))
                ->icon('circle-check')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('status', OrderStatus::Delivered)),
            'attention' => Tab::make()->label(__('sales.orders.tabs.attention'))
                ->icon('triangle-alert')
                ->badge(fn (): int => OrderResource::getEloquentQuery()->whereIn('status', [OrderStatus::Cancelled, OrderStatus::Refunded])->count())
                ->badgeColor('danger')
                ->modifyQueryUsing(fn (Builder $query) => $query->whereIn('status', [OrderStatus::Cancelled, OrderStatus::Refunded])),
        ];
    }

    protected function getHeaderActions(): array
    {
        $cursor = OrderResource::usesCursorPagination();

        return [
            Action::make('pagination')
                ->label($cursor ? __('sales.orders.actions.cursor_off') : __('sales.orders.actions.cursor_on'))
                ->tooltip(__('sales.orders.actions.cursor_tooltip'))
                ->icon($cursor ? 'list-ordered' : 'mouse-pointer-2')
                ->color('gray')
                ->outlined()
                ->action(fn () => session()->put(OrderResource::SESSION_CURSOR, ! $cursor))
                ->successRedirectUrl(fn (): string => OrderResource::getUrl('index')),
            Action::make('board')
                ->label(__('plugins.board.open'))
                ->icon('square-kanban')
                ->color('gray')
                ->outlined()
                ->url(fn (): string => OrderResource::getUrl('board')),
            ExportAction::make()
                ->label(__('sales.orders.actions.export'))
                ->exporter(OrderExporter::class)
                ->fileDisk('demo')
                ->maxRows(5000)
                ->rateLimit(5, 3600)
                ->color('gray')
                ->outlined(),
            CreateAction::make()->icon('plus'),
        ];
    }
}
