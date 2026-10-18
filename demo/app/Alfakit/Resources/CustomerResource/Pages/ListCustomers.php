<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CustomerResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\ExportAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use AlfaSix\Alfakit\Schemas\Components\Tabs\Tab;
use App\Alfakit\Exporters\CustomerExporter;
use App\Alfakit\Resources\CustomerResource;
use Illuminate\Database\Eloquent\Builder;

class ListCustomers extends ListRecords
{
    protected static string $resource = CustomerResource::class;

    public function getTabs(): array
    {
        return [
            'all' => Tab::make()->label(__('sales.customers.tabs.all')),
            'vip' => Tab::make()->label(__('sales.customers.tabs.vip'))
                ->icon('crown')
                ->badge(fn (): int => CustomerResource::getEloquentQuery()->where('is_vip', true)->count())
                ->badgeColor('warning')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('is_vip', true)),
            'marketing' => Tab::make()->label(__('sales.customers.tabs.marketing'))
                ->icon('mail')
                ->modifyQueryUsing(fn (Builder $query) => $query->where('accepts_marketing', true)),
            'new' => Tab::make()->label(__('sales.customers.tabs.new'))
                ->icon('sparkles')
                ->badge(fn (): int => CustomerResource::getEloquentQuery()->where('created_at', '>=', now()->startOfMonth())->count())
                ->modifyQueryUsing(fn (Builder $query) => $query->where('created_at', '>=', now()->startOfMonth())),
        ];
    }

    protected function getHeaderActions(): array
    {
        return [
            ExportAction::make()
                ->label(__('sales.customers.actions.export'))
                ->exporter(CustomerExporter::class)
                ->fileDisk('demo')
                ->maxRows(5000)
                ->rateLimit(5, 3600)
                ->color('gray')
                ->outlined(),
            CreateAction::make()->icon('plus'),
        ];
    }
}
