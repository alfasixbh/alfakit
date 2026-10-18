<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Reports;

use AlfaSix\Alfakit\Actions\ExportAction;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Average;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Sum;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\Filter;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Filters\TernaryFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Clusters\Reports;
use App\Alfakit\Exports\CustomerExporter;
use App\Alfakit\Widgets\Reports\NewCustomersChart;
use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Store;
use Illuminate\Database\Eloquent\Builder;

/**
 * Customers report: lifetime value, order count and last order per customer, computed with
 * relationship aggregates so the columns stay sortable.
 */
class CustomersReport extends Page
{
    protected static ?string $cluster = Reports::class;

    protected static ?string $navigationIcon = 'users';

    protected static ?int $navigationSort = 3;

    protected static ?string $slug = 'customers';

    public static function getNavigationLabel(): string
    {
        return __('platform.reports.customers.title');
    }

    public function getTitle(): string
    {
        return __('platform.reports.customers.title');
    }

    public function getSubheading(): ?string
    {
        return __('platform.reports.customers.description');
    }

    protected function getHeaderWidgets(): array
    {
        return [NewCustomersChart::class];
    }

    public function getHeaderWidgetsColumns(): int|array
    {
        return 1;
    }

    public function table(Table $table): Table
    {
        $tenant = alfakit()->getTenant();
        $currency = $tenant instanceof Store ? $tenant->currency : 'USD';
        $paid = fn (Builder $query): Builder => $query->whereIn('status', [OrderStatus::Paid->value, OrderStatus::Processing->value, OrderStatus::Shipped->value, OrderStatus::Delivered->value]);

        return $table
            ->query(Customer::query()->where('store_id', $tenant?->getKey()))
            ->columns([
                TextColumn::make('name')
                    ->label(__('platform.reports.customers.columns.name'))
                    ->getStateUsing(fn (Customer $record): string => $record->name)
                    ->description(fn (Customer $record): string => $record->email)
                    ->weight('medium')
                    ->searchable(['first_name', 'last_name', 'email']),
                TextColumn::make('country')
                    ->label(__('platform.reports.customers.columns.country'))
                    ->badge()
                    ->color('gray')
                    ->sortable()
                    ->visibleFrom('md'),
                TextColumn::make('paid_orders_count')
                    ->label(__('platform.reports.customers.columns.orders'))
                    ->counts(['orders as paid_orders_count' => $paid])
                    ->numeric()
                    ->alignEnd()
                    ->sortable(),
                TextColumn::make('lifetime_value')
                    ->label(__('platform.reports.customers.columns.spent'))
                    ->sum(['orders as lifetime_value' => $paid], 'total')
                    ->money($currency)
                    ->alignEnd()
                    ->sortable()
                    ->summarize([Sum::make()->money($currency), Average::make()->money($currency)]),
                TextColumn::make('average_order')
                    ->label(__('platform.reports.customers.columns.average'))
                    ->avg(['orders as average_order' => $paid], 'total')
                    ->money($currency)
                    ->alignEnd()
                    ->sortable()
                    ->visibleFrom('lg'),
                TextColumn::make('last_order_at')
                    ->label(__('platform.reports.customers.columns.last_order'))
                    ->max('orders as last_order_at', 'placed_at')
                    ->since()
                    ->sortable()
                    ->visibleFrom('sm'),
                IconColumn::make('is_vip')
                    ->label(__('platform.reports.customers.columns.vip'))
                    ->boolean()
                    ->trueIcon('crown')
                    ->trueColor('warning')
                    ->falseIcon('minus')
                    ->falseColor('gray')
                    ->alignCenter(),
                IconColumn::make('accepts_marketing')
                    ->label(__('platform.reports.customers.columns.marketing'))
                    ->boolean()
                    ->alignCenter()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('lifetime_value', 'desc')
            ->filters([
                TernaryFilter::make('is_vip')->label(__('platform.reports.customers.filters.vip')),
                TernaryFilter::make('accepts_marketing')->label(__('platform.reports.customers.filters.marketing')),
                SelectFilter::make('country')
                    ->label(__('platform.reports.customers.filters.country'))
                    ->options(fn (): array => Customer::query()
                        ->where('store_id', $tenant?->getKey())
                        ->distinct()
                        ->orderBy('country')
                        ->pluck('country', 'country')
                        ->all())
                    ->multiple(),
                Filter::make('min_orders')
                    ->schema([
                        TextInput::make('count')->label(__('platform.reports.customers.filters.min_orders'))->numeric()->minValue(1),
                    ])
                    ->query(fn (Builder $query, array $data): Builder => $query
                        ->when($data['count'] ?? null, fn (Builder $q, string $count) => $q->has('orders', '>=', (int) $count))),
            ])
            ->headerActions([
                ExportAction::make()
                    ->label(__('platform.reports.customers.export'))
                    ->icon('download')
                    ->exporter(CustomerExporter::class)
                    ->rateLimit(5),
            ])
            ->persistFiltersInSession()
            ->defaultPaginationPageOption(25);
    }
}
