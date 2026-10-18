<?php

declare(strict_types=1);

namespace App\Alfakit\Exporters;

use AlfaSix\Alfakit\Actions\Exports\ExportColumn;
use AlfaSix\Alfakit\Actions\Exports\Exporter;
use App\Alfakit\Schemas\AddressFields;
use App\Enums\OrderStatus;
use App\Models\Order;

class OrderExporter extends Exporter
{
    protected static ?string $model = Order::class;

    public static function getColumns(): array
    {
        return [
            ExportColumn::make('number')->label(__('sales.fields.number')),
            ExportColumn::make('placed_at')->label(__('sales.fields.placed_at')),
            ExportColumn::make('status')->label(__('sales.fields.status'))
                ->formatStateUsing(fn (mixed $state): string => ($state instanceof OrderStatus ? $state : OrderStatus::from((string) $state))->getLabel()),
            ExportColumn::make('channel')->label(__('sales.fields.channel'))->formatStateUsing(fn (string $state): string => __('sales.channel.'.$state)),
            ExportColumn::make('customer.email')->label(__('sales.fields.customer')),
            ExportColumn::make('items_count')->label(__('sales.fields.items_count'))->counts('items'),
            ExportColumn::make('subtotal')->label(__('sales.fields.subtotal')),
            ExportColumn::make('discount_total')->label(__('sales.fields.discount')),
            ExportColumn::make('shipping_total')->label(__('sales.fields.shipping')),
            ExportColumn::make('tax_total')->label(__('sales.fields.tax')),
            ExportColumn::make('total')->label(__('sales.fields.total')),
            ExportColumn::make('currency'),
            ExportColumn::make('discount_code')->label(__('sales.fields.discount_code'))->enabledByDefault(false),
            ExportColumn::make('shipping_address')->label(__('sales.fields.shipping_address'))
                ->formatStateUsing(fn (mixed $state): ?string => AddressFields::format(is_array($state) ? $state : null))
                ->enabledByDefault(false),
            ExportColumn::make('notes')->label(__('sales.fields.notes'))->enabledByDefault(false),
        ];
    }
}
