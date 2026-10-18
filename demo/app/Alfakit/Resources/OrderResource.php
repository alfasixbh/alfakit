<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\ActionGroup;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Actions\ExportBulkAction;
use AlfaSix\Alfakit\Actions\ForceDeleteAction;
use AlfaSix\Alfakit\Actions\ForceDeleteBulkAction;
use AlfaSix\Alfakit\Actions\RestoreAction;
use AlfaSix\Alfakit\Actions\RestoreBulkAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Forms\Components\DatePicker;
use AlfaSix\Alfakit\Forms\Components\MoneyInput;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Infolists\Components\RepeatableEntry;
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Navigation\SubNavigationPosition;
use AlfaSix\Alfakit\Resources\Pages\Page;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Components\EmptyState;
use AlfaSix\Alfakit\Schemas\Components\Fieldset;
use AlfaSix\Alfakit\Schemas\Components\Group;
use AlfaSix\Alfakit\Schemas\Components\Placeholder;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Support\Currency;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Count;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Sum;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Enums\PaginationMode;
use AlfaSix\Alfakit\Tables\Filters\Filter;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\DateConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\NumberConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\RelationshipConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\SelectConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\TextConstraint;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Filters\TrashedFilter;
use AlfaSix\Alfakit\Tables\Grouping\Group as TableGroup;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitActivityLog\Infolists\Components\ActivityLogTimelineEntry;
use AlfaSix\AlfakitComments\Actions\CommentsTableAction;
use AlfaSix\AlfakitComments\Infolists\Components\CommentsEntry;
use App\Alfakit\Exporters\OrderExporter;
use App\Alfakit\Resources\OrderResource\Pages;
use App\Alfakit\Schemas\AddressFields;
use App\Alfakit\Support\EnumBadge;
use App\Demo\Nav;
use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Carbon;

/**
 * Orders of the current store. The list shows summaries, grouping and the query builder; new
 * orders go through a wizard (CreateOrder); a record has sub-navigation for details, items,
 * payments, shipments and the status timeline.
 */
class OrderResource extends Resource
{
    public const SESSION_CURSOR = 'demo.orders.cursor';

    public const CHANNELS = ['web', 'store', 'phone'];

    protected static ?string $model = Order::class;

    protected static ?string $navigationIcon = 'shopping-bag';

    protected static ?int $navigationSort = 10;

    protected static ?string $recordTitleAttribute = 'number';

    protected static ?SubNavigationPosition $subNavigationPosition = SubNavigationPosition::Top;

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::SALES);
    }

    public static function getNavigationBadge(): string|int|null
    {
        $pending = static::getEloquentQuery()->where('status', OrderStatus::Pending)->count();

        return $pending > 0 ? $pending : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'warning';
    }

    /** Whether the list browses by cursor (toggled from the list header). */
    public static function usesCursorPagination(): bool
    {
        return (bool) session(self::SESSION_CURSOR, false);
    }

    /** @return array<string, string> */
    public static function channelOptions(): array
    {
        return collect(self::CHANNELS)->mapWithKeys(fn (string $channel): array => [$channel => __('sales.channel.'.$channel)])->all();
    }

    // ---------------------------------------------------------------- Edit form (details)

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Callout::make(fn (): string => __('sales.orders.callouts.pending_heading'))
                ->description(fn (): string => __('sales.orders.callouts.pending_body'))
                ->warning()
                ->icon('clock')
                ->visible(fn (?Order $record): bool => $record?->status === OrderStatus::Pending)
                ->columnSpanFull(),
            Callout::make(fn (): string => __('sales.orders.callouts.refunded_heading'))
                ->description(fn (): string => __('sales.orders.callouts.refunded_body'))
                ->info()
                ->icon('rotate-ccw')
                ->visible(fn (?Order $record): bool => $record?->status === OrderStatus::Refunded)
                ->columnSpanFull(),
            Callout::make(fn (): string => __('sales.orders.callouts.cancelled_heading'))
                ->description(fn (): string => __('sales.orders.callouts.cancelled_body'))
                ->danger()
                ->icon('circle-x')
                ->visible(fn (?Order $record): bool => $record?->status === OrderStatus::Cancelled)
                ->columnSpanFull(),

            Group::make([
                Section::make(fn (): string => __('sales.orders.sections.details'))->icon('receipt')->schema([
                    TextInput::make('number')->label(__('sales.fields.number'))->readOnly(),
                    DatePicker::make('placed_at')->label(__('sales.fields.placed_at'))->seconds(false)->native(false)->required(),
                    static::customerSelect()->columnSpanFull(),
                    ToggleButtons::make('status')
                        ->label(__('sales.fields.status'))
                        ->options(OrderStatus::options())
                        ->colors(EnumBadge::toggleMaps(OrderStatus::class)['colors'])
                        ->icons(EnumBadge::toggleMaps(OrderStatus::class)['icons'])
                        ->inline()
                        ->required()
                        ->columnSpanFull(),
                    ToggleButtons::make('channel')
                        ->label(__('sales.fields.channel'))
                        ->options(static::channelOptions())
                        ->icons(['web' => 'globe', 'store' => 'store', 'phone' => 'phone'])
                        ->grouped()
                        ->required(),
                    Select::make('discount_id')
                        ->label(__('sales.fields.discount'))
                        ->relationship('discount', 'code')
                        ->searchable()
                        ->preload()
                        ->native(false),
                    Textarea::make('notes')->label(__('sales.fields.notes'))->rows(3)->maxLength(1000)->columnSpanFull(),
                ])->columns(2),

                Section::make(fn (): string => __('sales.orders.sections.addresses'))->icon('map-pin')->collapsible()->schema([
                    Fieldset::make(__('sales.fields.shipping_address'))->statePath('shipping_address')->schema([AddressFields::make(required: false)]),
                    Fieldset::make(__('sales.fields.billing_address'))->statePath('billing_address')->schema([AddressFields::make(required: false)]),
                ])->columns(2),
            ])->columnSpan(['default' => 1, 'lg' => 2]),

            Group::make([
                Section::make(fn (): string => __('sales.orders.sections.totals'))
                    ->description(fn (): string => __('sales.orders.sections.totals_description'))
                    ->icon('calculator')
                    ->schema([
                        Placeholder::make('subtotal_display')->label(__('sales.fields.subtotal'))
                            ->content(fn (?Order $record): string => static::money($record?->subtotal, $record)),
                        Placeholder::make('discount_display')->label(__('sales.fields.discount'))
                            ->content(fn (?Order $record): string => static::money($record?->discount_total, $record, negative: true)),
                        MoneyInput::make('shipping_total')->label(__('sales.fields.shipping'))
                            ->currency(fn (?Order $record): string => $record->currency ?? 'USD')
                            ->minValue(0),
                        Placeholder::make('tax_display')->label(__('sales.fields.tax'))
                            ->content(fn (?Order $record): string => static::money($record?->tax_total, $record)),
                        Placeholder::make('total_display')->label(__('sales.fields.total'))
                            ->content(fn (?Order $record): string => static::money($record?->total, $record)),
                        Placeholder::make('paid_display')->label(__('sales.orders.sections.payments'))
                            ->content(fn (?Order $record): string => $record === null ? '' : __('sales.orders.paid_of', [
                                'paid' => static::money($record->paidTotal(), $record),
                                'total' => static::money($record->total, $record),
                            ])),
                    ]),
            ])->columnSpan(['default' => 1, 'lg' => 1]),
        ])->columns(3);
    }

    public static function customerSelect(): Select
    {
        return Select::make('customer_id')
            ->label(__('sales.fields.customer'))
            ->relationship('customer', 'email')
            ->getOptionLabelFromRecordUsing(fn (Customer $customer): string => $customer->name.' · '.$customer->email)
            ->searchable(['first_name', 'last_name', 'email'])
            ->preload()
            ->native(false);
    }

    public static function money(float|int|string|null $amount, ?Order $order = null, bool $negative = false): string
    {
        $amount = (float) ($amount ?? 0);

        return ($negative && $amount > 0 ? '−' : '').Currency::format($amount, $order->currency ?? 'USD');
    }

    // ---------------------------------------------------------------- Infolist (timeline)

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Group::make([
                Section::make(fn (): string => __('sales.orders.sections.timeline'))
                    ->description(fn (): string => __('sales.orders.sections.timeline_description'))
                    ->icon('history')
                    ->schema([
                        EmptyState::make(fn (): string => __('sales.orders.empty.timeline'))
                            ->description(fn (): string => __('sales.orders.empty.timeline_body'))
                            ->icon('history')
                            ->visible(fn (Order $record): bool => blank($record->timeline)),
                        RepeatableEntry::make('timeline')
                            ->hiddenLabel()
                            ->visible(fn (Order $record): bool => filled($record->timeline))
                            ->schema([
                                EnumBadge::entry('status', OrderStatus::class)->label(__('sales.fields.status')),
                                TextEntry::make('at')->label(__('sales.fields.at'))->dateTime(),
                                TextEntry::make('note')->label(__('sales.fields.note'))->placeholder('—'),
                            ])
                            ->columns(['default' => 1, 'md' => 3]),
                    ]),
                // alfasix/alfakit-comments: internal notes with @mentions and reactions.
                Section::make(fn (): string => __('plugins.comments.section'))
                    ->description(fn (): string => __('plugins.comments.section_description'))
                    ->icon('messages-square')
                    ->schema([CommentsEntry::make()]),
                // alfasix/alfakit-activity-log: who changed what on this order.
                Section::make(fn (): string => __('plugins.activity.section'))
                    ->icon('scroll-text')
                    ->collapsible()
                    ->collapsed()
                    ->schema([ActivityLogTimelineEntry::make()->limit(10)->hiddenLabel()]),
            ])->columnSpan(['default' => 1, 'lg' => 2]),

            Group::make([
                Section::make(fn (): string => __('sales.orders.sections.details'))->icon('receipt')->schema([
                    TextEntry::make('number')->label(__('sales.fields.number'))->weight('semibold')->copyable(),
                    EnumBadge::entry('status', OrderStatus::class)->label(__('sales.fields.status')),
                    TextEntry::make('customer.name')->label(__('sales.fields.customer'))
                        ->url(fn (Order $record): ?string => $record->customer ? CustomerResource::getUrl('view', ['record' => $record->customer]) : null)
                        ->placeholder(__('sales.orders.wizard.review_anonymous')),
                    TextEntry::make('channel')->label(__('sales.fields.channel'))->badge()->color('gray')
                        ->formatStateUsing(fn (string $state): string => __('sales.channel.'.$state)),
                    TextEntry::make('placed_at')->label(__('sales.fields.placed_at'))->dateTime(),
                    TextEntry::make('total')->label(__('sales.fields.total'))->money(fn (Order $record): string => $record->currency)->weight('semibold'),
                    TextEntry::make('paid')->label(__('sales.orders.sections.payments'))
                        ->getStateUsing(fn (Order $record): string => __('sales.orders.paid_of', [
                            'paid' => static::money($record->paidTotal(), $record),
                            'total' => static::money($record->total, $record),
                        ])),
                    TextEntry::make('latestShipment.carrier')->label(__('sales.fields.carrier'))->placeholder('—')
                        ->helperText(fn (Order $record): ?string => $record->latestShipment?->tracking_number),
                    TextEntry::make('shipping_address')->label(__('sales.fields.shipping_address'))
                        // Resolve the whole snapshot to one line: an array state would otherwise be
                        // rendered as a list of its values.
                        ->getStateUsing(fn (Order $record): ?string => AddressFields::format($record->shipping_address))
                        ->placeholder('—'),
                ])->columns(1),
            ])->columnSpan(['default' => 1, 'lg' => 1]),
        ])->columns(3);
    }

    // ---------------------------------------------------------------- Table

    public static function table(Table $table): Table
    {
        $cursor = static::usesCursorPagination();

        return $table
            ->columns([
                TextColumn::make('number')
                    ->label(__('sales.fields.number'))
                    ->searchable()
                    ->sortable()
                    ->weight('semibold')
                    ->copyable()
                    ->summarize(Count::make()->label(__('sales.orders.summary.count'))),
                TextColumn::make('customer.first_name')
                    ->label(__('sales.fields.customer'))
                    ->formatStateUsing(fn (mixed $state, Order $record): ?string => $record->customer?->name)
                    ->description(fn (Order $record): ?string => $record->customer?->email)
                    ->placeholder(__('sales.orders.wizard.review_anonymous'))
                    ->searchable(query: fn (Builder $query, string $search): Builder => $query->orWhereHas('customer', fn (Builder $customers) => $customers
                        ->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")))
                    ->sortable(),
                EnumBadge::column('status', OrderStatus::class)->label(__('sales.fields.status'))->sortable(),
                TextColumn::make('channel')
                    ->label(__('sales.fields.channel'))
                    ->badge()
                    ->color('gray')
                    ->formatStateUsing(fn (string $state): string => __('sales.channel.'.$state))
                    ->toggleable()
                    ->visibleFrom('lg'),
                TextColumn::make('items_count')
                    ->label(__('sales.fields.items_count'))
                    ->counts('items')
                    ->numeric()
                    ->alignEnd()
                    ->sortable()
                    ->toggleable()
                    ->visibleFrom('md'),
                TextColumn::make('total')
                    ->label(__('sales.fields.total'))
                    ->money(fn (Order $record): string => $record->currency)
                    ->alignEnd()
                    ->sortable()
                    ->summarize(Sum::make()->money('USD')->label(__('sales.orders.summary.revenue'))),
                TextColumn::make('placed_at')
                    ->label(__('sales.fields.placed_at'))
                    ->dateTime()
                    ->sortable()
                    ->toggleable(),
                TextColumn::make('latestShipment.carrier')
                    ->label(__('sales.fields.carrier'))
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('discount_code')
                    ->label(__('sales.fields.discount_code'))
                    ->badge()
                    ->color('secondary')
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->label(__('sales.fields.updated_at'))
                    ->since()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('placed_at', 'desc')
            ->groups($cursor ? [] : [
                TableGroup::make('status')
                    ->label(__('sales.orders.groups.status'))
                    ->getTitleFromRecordUsing(fn (Order $record): string => $record->status->getLabel())
                    ->collapsible(),
                TableGroup::make('placed_month', 'placed_at')
                    ->label(__('sales.orders.groups.month'))
                    ->getKeyFromRecordUsing(fn (Order $record): ?string => $record->placed_at?->format('Y-m'))
                    ->getTitleFromRecordUsing(fn (Order $record): string => $record->placed_at?->translatedFormat('F Y') ?? '—')
                    ->scopeQueryByKeyUsing(function (Builder $query, ?string $key): Builder {
                        if ($key === null) {
                            return $query->whereNull('placed_at');
                        }

                        $start = Carbon::createFromFormat('Y-m', $key)?->startOfMonth() ?? now()->startOfMonth();

                        return $query->whereBetween('placed_at', [$start, $start->copy()->endOfMonth()]);
                    })
                    ->orderQueryUsing(fn (Builder $query, string $direction): Builder => $query->orderBy('placed_at', $direction))
                    ->collapsible(),
                TableGroup::make('channel')
                    ->label(__('sales.orders.groups.channel'))
                    ->getTitleFromRecordUsing(fn (Order $record): string => __('sales.channel.'.$record->channel)),
            ])
            ->filters([
                SelectFilter::make('status')->label(__('sales.fields.status'))->options(OrderStatus::options())->multiple(),
                SelectFilter::make('channel')->label(__('sales.fields.channel'))->options(static::channelOptions()),
                Filter::make('placed_between')
                    ->label(__('sales.orders.filters.placed_between'))
                    ->schema([
                        DatePicker::make('from')->label(__('sales.orders.filters.from'))->native(false),
                        DatePicker::make('until')->label(__('sales.orders.filters.until'))->native(false),
                    ])
                    ->query(fn (Builder $query, array $data): Builder => $query
                        ->when($data['from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('placed_at', '>=', $from))
                        ->when($data['until'] ?? null, fn (Builder $q, string $until) => $q->whereDate('placed_at', '<=', $until)))
                    ->indicateUsing(fn (array $data): array => array_values(array_filter([
                        ($data['from'] ?? null) ? __('sales.orders.filters.from').' '.Carbon::parse($data['from'])->translatedFormat('M j, Y') : null,
                        ($data['until'] ?? null) ? __('sales.orders.filters.until').' '.Carbon::parse($data['until'])->translatedFormat('M j, Y') : null,
                    ]))),
                Filter::make('vip')
                    ->label(__('sales.orders.filters.vip_only'))
                    ->toggle()
                    ->query(fn (Builder $query): Builder => $query->whereHas('customer', fn (Builder $q) => $q->where('is_vip', true))),
                QueryBuilder::make()
                    ->constraints([
                        TextConstraint::make('number')->label(__('sales.fields.number')),
                        NumberConstraint::make('total')->label(__('sales.fields.total')),
                        NumberConstraint::make('items_count')->label(__('sales.fields.items_count'))->integer(),
                        DateConstraint::make('placed_at')->label(__('sales.fields.placed_at')),
                        SelectConstraint::make('status')->label(__('sales.fields.status'))->options(OrderStatus::options())->multiple(),
                        SelectConstraint::make('channel')->label(__('sales.fields.channel'))->options(static::channelOptions())->multiple(),
                        RelationshipConstraint::make('customer')->label(__('sales.fields.customer'))->titleAttribute('email')->multiple(),
                        RelationshipConstraint::make('discount')->label(__('sales.fields.discount'))->titleAttribute('code')->multiple(),
                    ])
                    ->maxDepth(2),
                TrashedFilter::make(),
            ])
            ->deferFilters()
            ->persistFiltersInSession()
            ->persistSortInSession()
            ->reorderableColumns()
            // Rows first; the count (and page numbers) load right after.
            ->deferTotals()
            ->striped()
            ->paginationMode($cursor ? PaginationMode::Cursor : PaginationMode::Default)
            ->paginationPageOptions([10, 25, 50, 100])
            ->defaultPaginationPageOption(25)
            ->description($cursor ? __('sales.orders.callouts.cursor_body') : null)
            ->emptyStateHeading(__('sales.orders.empty.orders'))
            ->emptyStateDescription(__('sales.orders.empty.orders_body'))
            ->emptyStateIcon('shopping-bag')
            ->recordActions([
                EditAction::make(),
                ActionGroup::make([
                    ViewAction::make()->label(__('sales.orders.pages.timeline'))->icon('history'),
                    CommentsTableAction::make(),
                    DeleteAction::make()->undoable(),
                    RestoreAction::make(),
                    ForceDeleteAction::make(),
                ]),
            ])
            ->bulkActions([
                ExportBulkAction::make()->exporter(OrderExporter::class)->fileDisk('demo'),
                DeleteBulkAction::make()->undoable(),
                RestoreBulkAction::make(),
                ForceDeleteBulkAction::make(),
            ])
            // alfasix/alfakit-ai: "Ask AI" turns a sentence into these filters, search and sort.
            ->aiFilters();
    }

    // ---------------------------------------------------------------- Pages & navigation

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListOrders::route('/'),
            'create' => Pages\CreateOrder::route('/create'),
            'edit' => Pages\EditOrder::route('/{record}/edit'),
            'items' => Pages\ManageOrderItems::route('/{record}/items'),
            'payments' => Pages\ManageOrderPayments::route('/{record}/payments'),
            'shipments' => Pages\ManageOrderShipments::route('/{record}/shipments'),
            // alfasix/alfakit-kanban: the fulfilment board.
            'board' => Pages\OrderBoard::route('/board'),
            'view' => Pages\ViewOrder::route('/{record}'),
        ];
    }

    public static function getRecordSubNavigation(Page $page): array
    {
        return $page->generateNavigationItems([
            Pages\EditOrder::class,
            Pages\ManageOrderItems::class,
            Pages\ManageOrderPayments::class,
            Pages\ManageOrderShipments::class,
            Pages\ViewOrder::class,
        ]);
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([SoftDeletingScope::class])
            ->with(['customer', 'latestShipment']);
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['number', 'customer.email', 'customer.first_name', 'customer.last_name'];
    }

    public static function getGlobalSearchResultDetails(Model $record): array
    {
        /** @var Order $record */
        return array_filter([
            __('sales.fields.customer') => $record->customer?->name,
            __('sales.fields.total') => static::money($record->total, $record),
            __('sales.fields.status') => $record->status->getLabel(),
        ]);
    }
}
