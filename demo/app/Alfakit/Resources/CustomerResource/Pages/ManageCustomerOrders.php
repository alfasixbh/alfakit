<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CustomerResource\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Resources\Pages\ManageRelatedRecords;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Sum;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\CustomerResource;
use App\Alfakit\Resources\OrderResource;
use App\Alfakit\Support\EnumBadge;
use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;

/**
 * The customer's orders, read-only: each row opens the order in the Orders resource and
 * the header starts a new order for this customer.
 */
class ManageCustomerOrders extends ManageRelatedRecords
{
    protected static string $resource = CustomerResource::class;

    protected static string $relationship = 'orders';

    protected static ?string $relatedRecordTitleAttribute = 'number';

    protected static ?string $navigationIcon = 'shopping-bag';

    public static function getNavigationLabel(): string
    {
        return __('sales.customers.pages.orders');
    }

    public function getRelatedModelLabel(): ?string
    {
        return __('sales.orders.model');
    }

    public function getRelatedPluralModelLabel(): ?string
    {
        return __('sales.orders.models');
    }

    public function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->withCount('items'))
            ->columns([
                TextColumn::make('number')->label(__('sales.fields.number'))->weight('semibold')->searchable()->copyable(),
                EnumBadge::column('status', OrderStatus::class)->label(__('sales.fields.status')),
                TextColumn::make('items_count')->label(__('sales.fields.items_count'))->numeric()->alignEnd()->visibleFrom('md'),
                TextColumn::make('total')
                    ->label(__('sales.fields.total'))
                    ->money(fn (Order $record): string => $record->currency)
                    ->alignEnd()
                    ->sortable()
                    ->summarize(Sum::make()->money('USD')->label(__('sales.fields.lifetime_spend'))),
                TextColumn::make('placed_at')->label(__('sales.fields.placed_at'))->dateTime()->sortable(),
            ])
            ->defaultSort('placed_at', 'desc')
            ->filters([
                SelectFilter::make('status')->label(__('sales.fields.status'))->options(OrderStatus::options())->multiple(),
            ])
            ->recordUrl(fn (Order $record): string => OrderResource::getUrl('edit', ['record' => $record]))
            ->paginationPageOptions([10, 25])
            ->defaultPaginationPageOption(10)
            ->headerActions([
                Action::make('new_order')
                    ->label(__('sales.customers.actions.new_order'))
                    ->icon('plus')
                    ->url(fn (): string => OrderResource::getUrl('create').'?customer_id='.$this->getOwnerRecord()->getKey()),
            ])
            ->emptyStateHeading(__('sales.customers.empty.orders'))
            ->emptyStateDescription(__('sales.customers.empty.orders_body'))
            ->emptyStateIcon('shopping-bag');
    }

    public function getOwnerRecord(): Customer
    {
        /** @var Customer $customer */
        $customer = parent::getOwnerRecord();

        return $customer;
    }
}
