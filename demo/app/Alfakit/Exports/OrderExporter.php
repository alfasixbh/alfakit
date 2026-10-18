<?php

declare(strict_types=1);

namespace App\Alfakit\Exports;

use AlfaSix\Alfakit\Actions\Exports\ExportColumn;
use AlfaSix\Alfakit\Actions\Exports\Exporter;
use AlfaSix\Alfakit\Actions\Exports\Models\Export;
use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;

/**
 * CSV / XLSX export behind the sales report's "Export orders" button. Runs on the sync queue
 * in the demo and announces the download with a database notification.
 */
class OrderExporter extends Exporter
{
    protected static ?string $model = Order::class;

    public static function getColumns(): array
    {
        return [
            ExportColumn::make('number')->label(__('platform.reports.sales.columns.number')),
            ExportColumn::make('placed_at')->label(__('platform.reports.sales.columns.placed_at')),
            ExportColumn::make('status')
                ->label(__('platform.reports.sales.columns.status'))
                ->formatStateUsing(fn (OrderStatus|string|null $state): string => $state instanceof OrderStatus ? $state->getLabel() : (string) $state),
            ExportColumn::make('customer.name')->label(__('platform.reports.sales.columns.customer')),
            ExportColumn::make('customer.email')->label(__('platform.reports.customers.columns.email')),
            ExportColumn::make('channel')
                ->label(__('platform.reports.sales.columns.channel'))
                ->formatStateUsing(fn (?string $state): string => $state === null ? '' : __('platform.reports.sales.channels.'.$state)),
            ExportColumn::make('items_count')->label(__('platform.reports.sales.columns.items'))->counts('items'),
            ExportColumn::make('subtotal')->label(__('platform.reports.sales.columns.subtotal')),
            ExportColumn::make('discount_total')->label(__('platform.reports.sales.columns.discount')),
            ExportColumn::make('shipping_total')->label(__('platform.reports.sales.columns.shipping')),
            ExportColumn::make('tax_total')->label(__('platform.reports.sales.columns.tax'))->enabledByDefault(false),
            ExportColumn::make('total')->label(__('platform.reports.sales.columns.total')),
            ExportColumn::make('currency')->label(__('platform.settings.fields.currency'))->enabledByDefault(false),
            ExportColumn::make('discount_code')->label(__('platform.reports.sales.columns.discount_code'))->enabledByDefault(false),
        ];
    }

    public static function modifyQuery(Builder $query): Builder
    {
        return $query->with('customer:id,first_name,last_name,email');
    }

    public function getFileName(Export $export): string
    {
        return 'maison-alfa-orders-'.now()->format('Y-m-d');
    }
}
