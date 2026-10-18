<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Reports;

use AlfaSix\Alfakit\Actions\ExportAction;
use AlfaSix\Alfakit\Forms\Components\DatePicker;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Average;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Count;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Sum;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Enums\FiltersLayout;
use AlfaSix\Alfakit\Tables\Filters\Filter;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Grouping\Group;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Clusters\Reports;
use App\Alfakit\Exports\OrderExporter;
use App\Alfakit\Widgets\Reports\SalesByMonthChart;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Database\Eloquent\Builder;

/**
 * Sales report: a monthly chart in the header, then every order of the store with
 * summaries, grouping, deferred filters in a dialog and a CSV/XLSX export.
 */
class SalesReport extends Page
{
    protected static ?string $cluster = Reports::class;

    protected static ?string $navigationIcon = 'demo::revenue';

    protected static ?int $navigationSort = 1;

    protected static ?string $slug = 'sales';

    public static function getNavigationLabel(): string
    {
        return __('platform.reports.sales.title');
    }

    public function getTitle(): string
    {
        return __('platform.reports.sales.title');
    }

    public function getSubheading(): ?string
    {
        return __('platform.reports.sales.description');
    }

    protected function getHeaderWidgets(): array
    {
        return [SalesByMonthChart::class];
    }

    public function getHeaderWidgetsColumns(): int|array
    {
        return 1;
    }

    public function table(Table $table): Table
    {
        $tenant = alfakit()->getTenant();
        $currency = $tenant instanceof Store ? $tenant->currency : 'USD';

        return $table
            ->query(Order::query()->where('store_id', $tenant?->getKey())->with(['customer:id,first_name,last_name,email'])->withCount('items'))
            ->columns([
                TextColumn::make('number')
                    ->label(__('platform.reports.sales.columns.number'))
                    ->weight('medium')
                    ->searchable()
                    ->sortable()
                    ->summarize(Count::make()->label(__('platform.reports.sales.columns.items'))),
                TextColumn::make('customer.name')
                    ->label(__('platform.reports.sales.columns.customer'))
                    ->description(fn (Order $record): ?string => $record->customer?->getAttribute('email'))
                    ->searchable(['first_name', 'last_name', 'email'])
                    ->visibleFrom('md'),
                TextColumn::make('status')
                    ->label(__('platform.reports.sales.columns.status'))
                    ->badge()
                    ->formatStateUsing(fn (OrderStatus $state): string => $state->getLabel())
                    ->color(fn (OrderStatus $state): string => $state->getColor())
                    ->icon(fn (OrderStatus $state): string => $state->getIcon())
                    ->sortable(),
                TextColumn::make('items_count')
                    ->label(__('platform.reports.sales.columns.items'))
                    ->numeric()
                    ->alignEnd()
                    ->sortable()
                    ->visibleFrom('lg'),
                TextColumn::make('channel')
                    ->label(__('platform.reports.sales.columns.channel'))
                    ->formatStateUsing(fn (string $state): string => __('platform.reports.sales.channels.'.$state))
                    ->badge()
                    ->color('gray')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('subtotal')
                    ->label(__('platform.reports.sales.columns.subtotal'))
                    ->money($currency)
                    ->alignEnd()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('discount_total')
                    ->label(__('platform.reports.sales.columns.discount'))
                    ->money($currency)
                    ->alignEnd()
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->summarize(Sum::make()->money($currency)),
                TextColumn::make('shipping_total')
                    ->label(__('platform.reports.sales.columns.shipping'))
                    ->money($currency)
                    ->alignEnd()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('total')
                    ->label(__('platform.reports.sales.columns.total'))
                    ->money($currency)
                    ->weight('semibold')
                    ->alignEnd()
                    ->sortable()
                    ->summarize([Sum::make()->money($currency), Average::make()->money($currency)]),
                TextColumn::make('placed_at')
                    ->label(__('platform.reports.sales.columns.placed_at'))
                    ->dateTime()
                    ->sortable()
                    ->visibleFrom('sm'),
            ])
            ->defaultSort('placed_at', 'desc')
            ->filters([
                SelectFilter::make('status')
                    ->label(__('platform.reports.sales.filters.status'))
                    ->options(OrderStatus::options())
                    ->multiple(),
                SelectFilter::make('channel')
                    ->label(__('platform.reports.sales.filters.channel'))
                    ->options([
                        'web' => __('platform.reports.sales.channels.web'),
                        'store' => __('platform.reports.sales.channels.store'),
                        'phone' => __('platform.reports.sales.channels.phone'),
                    ]),
                Filter::make('placed')
                    ->schema([
                        DatePicker::make('from')->label(__('platform.reports.sales.filters.placed_from')),
                        DatePicker::make('until')->label(__('platform.reports.sales.filters.placed_until')),
                    ])
                    ->query(fn (Builder $query, array $data): Builder => $query
                        ->when($data['from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('placed_at', '>=', $from))
                        ->when($data['until'] ?? null, fn (Builder $q, string $until) => $q->whereDate('placed_at', '<=', $until))),
                Filter::make('min_total')
                    ->schema([
                        TextInput::make('amount')->label(__('platform.reports.sales.filters.min_total'))->numeric()->minValue(0),
                    ])
                    ->query(fn (Builder $query, array $data): Builder => $query
                        ->when($data['amount'] ?? null, fn (Builder $q, string $amount) => $q->where('total', '>=', (float) $amount))),
            ])
            ->filtersLayout(FiltersLayout::Modal)
            ->groups([
                Group::make('status')->label(__('platform.reports.sales.columns.status'))->getTitleFromRecordUsing(fn (Order $record): string => $record->status->getLabel())->collapsible(),
                Group::make('channel')->label(__('platform.reports.sales.columns.channel'))->getTitleFromRecordUsing(fn (Order $record): string => __('platform.reports.sales.channels.'.$record->channel)),
                Group::make('placed_at')->label(__('platform.reports.sales.columns.placed_at'))->date(),
            ])
            ->headerActions([
                ExportAction::make()
                    ->label(__('platform.reports.sales.export'))
                    ->icon('download')
                    ->exporter(OrderExporter::class)
                    ->rateLimit(5),
            ])
            ->persistFiltersInSession()
            ->persistSortInSession()
            ->striped()
            ->defaultPaginationPageOption(25);
    }
}
