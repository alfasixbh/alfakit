<?php

declare(strict_types=1);

namespace App\Alfakit\Exports;

use AlfaSix\Alfakit\Actions\Exports\ExportColumn;
use AlfaSix\Alfakit\Actions\Exports\Exporter;
use AlfaSix\Alfakit\Actions\Exports\Models\Export;
use App\Models\Customer;

/**
 * Export behind the customers report: contact details plus order count and lifetime value.
 */
class CustomerExporter extends Exporter
{
    protected static ?string $model = Customer::class;

    public static function getColumns(): array
    {
        return [
            ExportColumn::make('first_name')->label(__('platform.reports.customers.columns.name')),
            ExportColumn::make('last_name')->label(__('platform.reports.customers.columns.name').' 2')->enabledByDefault(false),
            ExportColumn::make('email')->label(__('platform.reports.customers.columns.email')),
            ExportColumn::make('phone')->label(__('platform.settings.fields.support_phone'))->enabledByDefault(false),
            ExportColumn::make('country')->label(__('platform.reports.customers.columns.country')),
            ExportColumn::make('orders_count')->label(__('platform.reports.customers.columns.orders'))->counts('orders'),
            ExportColumn::make('lifetime_value')
                ->label(__('platform.reports.customers.columns.spent'))
                ->getStateUsing(fn (Customer $record): string => number_format((float) $record->orders()->sum('total'), 2, '.', '')),
            ExportColumn::make('is_vip')->label(__('platform.reports.customers.columns.vip')),
            ExportColumn::make('accepts_marketing')->label(__('platform.reports.customers.columns.marketing')),
            ExportColumn::make('created_at')->label(__('platform.staff.fields.joined')),
        ];
    }

    public function getFileName(Export $export): string
    {
        return 'maison-alfa-customers-'.now()->format('Y-m-d');
    }
}
