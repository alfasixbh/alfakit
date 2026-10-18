<?php

declare(strict_types=1);

namespace App\Alfakit\Exporters;

use AlfaSix\Alfakit\Actions\Exports\ExportColumn;
use AlfaSix\Alfakit\Actions\Exports\Exporter;
use App\Models\Customer;

class CustomerExporter extends Exporter
{
    protected static ?string $model = Customer::class;

    public static function getColumns(): array
    {
        return [
            ExportColumn::make('first_name')->label(__('sales.fields.first_name')),
            ExportColumn::make('last_name')->label(__('sales.fields.last_name')),
            ExportColumn::make('email')->label(__('sales.fields.email')),
            ExportColumn::make('phone')->label(__('sales.fields.phone')),
            ExportColumn::make('country')->label(__('sales.fields.country')),
            ExportColumn::make('locale')->label(__('sales.fields.locale')),
            ExportColumn::make('is_vip')->label(__('sales.fields.is_vip')),
            ExportColumn::make('accepts_marketing')->label(__('sales.fields.accepts_marketing')),
            ExportColumn::make('orders_count')->label(__('sales.fields.orders_count'))->counts('orders'),
            ExportColumn::make('created_at')->label(__('sales.fields.joined')),
            ExportColumn::make('birthday')->label(__('sales.fields.birthday'))->enabledByDefault(false),
            ExportColumn::make('notes')->label(__('sales.fields.notes'))->enabledByDefault(false),
        ];
    }
}
