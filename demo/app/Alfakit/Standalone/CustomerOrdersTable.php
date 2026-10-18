<?php

declare(strict_types=1);

namespace App\Alfakit\Standalone;

use AlfaSix\Alfakit\Standalone\Table;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Enums\PaginationMode;
use AlfaSix\Alfakit\Tables\Table as TableBuilder;
use App\Demo\Renderer;
use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;

/**
 * Order tracking (/{renderer}/track): the orders of the customer who identified themselves
 * with e-mail and order number. Clicking a row selects it for the timeline below; sorting and
 * search live in the page's query string next to the lookup parameters.
 */
class CustomerOrdersTable extends Table
{
    public Customer $customer;

    public ?string $selected = null;

    public function table(TableBuilder $table): TableBuilder
    {
        return $table
            ->query(Order::query()->where('customer_id', $this->customer->getKey())->withCount('items'))
            ->heading(__('shop.track.orders.heading'))
            ->description(__('shop.track.orders.description', ['name' => $this->customer->first_name]))
            ->columns([
                TextColumn::make('number')
                    ->label(__('shop.track.orders.number'))
                    ->weight('semibold')
                    ->searchable()
                    ->sortable()
                    ->copyable(),
                TextColumn::make('placed_at')
                    ->label(__('shop.track.orders.placed'))
                    ->date()
                    ->sortable(),
                TextColumn::make('items_count')
                    ->label(__('shop.track.orders.items'))
                    ->numeric()
                    ->alignCenter(),
                TextColumn::make('status')
                    ->label(__('shop.track.orders.status'))
                    ->badge()
                    ->formatStateUsing(fn (OrderStatus $state): string => $state->getLabel())
                    ->color(fn (OrderStatus $state): string => $state->getColor())
                    ->icon(fn (OrderStatus $state): string => $state->getIcon())
                    ->sortable(),
                TextColumn::make('total')
                    ->label(__('shop.track.orders.total'))
                    ->money(fn (Order $record): string => $record->currency)
                    ->alignEnd()
                    ->sortable(),
            ])
            ->recordUrl(fn (Order $record): string => '/'.Renderer::current().'/track?'.http_build_query([
                'email' => $this->customer->email,
                'number' => $record->number,
            ]))
            ->recordClasses(fn (Order $record): ?string => $record->number === $this->selected ? 'bg-primary/5' : null)
            ->defaultSort('placed_at', 'desc')
            ->paginationMode(PaginationMode::Simple)
            ->defaultPaginationPageOption(5)
            ->paginationPageOptions([5, 10])
            ->searchPlaceholder(__('shop.track.orders.search'));
    }
}
