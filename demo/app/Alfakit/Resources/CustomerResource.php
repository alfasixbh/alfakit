<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\ActionGroup;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Actions\ExportBulkAction;
use AlfaSix\Alfakit\Actions\RestoreAction;
use AlfaSix\Alfakit\Actions\RestoreBulkAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Forms\Components\DatePicker;
use AlfaSix\Alfakit\Forms\Components\FileUpload;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Infolists\Components\IconEntry;
use AlfaSix\Alfakit\Infolists\Components\ImageEntry;
use AlfaSix\Alfakit\Infolists\Components\RepeatableEntry;
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Infolists\Components\ViewEntry;
use AlfaSix\Alfakit\Localization\Locale as PanelLocale;
use AlfaSix\Alfakit\Navigation\SubNavigationPosition;
use AlfaSix\Alfakit\Resources\Pages\Page;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\EmptyState;
use AlfaSix\Alfakit\Schemas\Components\Group;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\ImageColumn;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Count;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Filters\TernaryFilter;
use AlfaSix\Alfakit\Tables\Filters\TrashedFilter;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitTags\Forms\Components\SpatieTagsInput;
use AlfaSix\AlfakitTags\Tables\Columns\SpatieTagsColumn;
use App\Alfakit\Exporters\CustomerExporter;
use App\Alfakit\Resources\CustomerResource\Pages;
use App\Alfakit\Schemas\AddressFields;
use App\Alfakit\Support\EnumBadge;
use App\Alfakit\Support\InitialsAvatar;
use App\Demo\Nav;
use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

/**
 * Customers of the current store: a list with generated-initials avatars and order
 * aggregates, a profile infolist with a twelve-month spend chart (ViewEntry rendered by a
 * registered frontend component), and sub-navigation to addresses and orders.
 */
class CustomerResource extends Resource
{
    protected static ?string $model = Customer::class;

    protected static ?string $navigationIcon = 'users';

    protected static ?int $navigationSort = 10;

    protected static ?string $recordTitleAttribute = 'email';

    protected static ?SubNavigationPosition $subNavigationPosition = SubNavigationPosition::Top;

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::CUSTOMERS);
    }

    public static function getModelLabel(): string
    {
        return __('sales.customers.model');
    }

    public static function getPluralModelLabel(): string
    {
        return __('sales.customers.models');
    }

    public static function getRecordTitle(?Model $record): ?string
    {
        return $record instanceof Customer ? $record->name : null;
    }

    // ---------------------------------------------------------------- Form

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Group::make([
                Section::make(fn (): string => __('sales.customers.sections.identity'))->icon('user')->schema([
                    TextInput::make('first_name')->label(__('sales.fields.first_name'))->required()->maxLength(60),
                    TextInput::make('last_name')->label(__('sales.fields.last_name'))->required()->maxLength(60),
                    TextInput::make('email')->label(__('sales.fields.email'))->email()->required()->maxLength(120)->unique(ignoreRecord: true),
                    TextInput::make('phone')->label(__('sales.fields.phone'))->tel()->maxLength(32),
                    FileUpload::make('avatar_path')
                        ->label(__('sales.fields.avatar'))
                        ->avatar()
                        ->disk('demo')
                        ->directory('avatars')
                        ->maxSize(1024)
                        ->columnSpanFull(),
                ])->columns(2),

                Section::make(fn (): string => __('sales.customers.sections.default_address'))
                    ->description(fn (): string => __('sales.customers.sections.default_address_description'))
                    ->icon('map-pin')
                    ->relationship('defaultAddress', condition: fn (array $state): bool => filled($state['line1'] ?? null))
                    ->mutateRelationshipDataBeforeCreateUsing(fn (array $data): array => [...$data, 'type' => 'shipping', 'label' => $data['label'] ?? __('sales.customers.home'), 'is_default' => true])
                    ->collapsible()
                    ->schema([AddressFields::make(required: false)])
                    ->columns(2),
            ])->columnSpan(['default' => 1, 'lg' => 2]),

            Group::make([
                Section::make(fn (): string => __('sales.customers.sections.preferences'))->icon('sliders-horizontal')->schema([
                    Select::make('locale')
                        ->label(__('sales.fields.locale'))
                        ->options(static::localeOptions())
                        ->default('en')
                        ->required()
                        ->native(false),
                    Select::make('country')
                        ->label(__('sales.fields.country'))
                        ->options(AddressFields::countries())
                        ->default('BH')
                        ->required()
                        ->searchable()
                        ->native(false),
                    DatePicker::make('birthday')->label(__('sales.fields.birthday'))->native(false)->maxDate(fn (): Carbon => now()->subYears(16)),
                    Toggle::make('accepts_marketing')->label(__('sales.fields.accepts_marketing'))->default(false),
                    Toggle::make('is_vip')->label(__('sales.fields.is_vip'))->helperText(__('sales.customers.vip_hint')),
                    // alfasix/alfakit-tags: segments as Spatie tags of the type `segment`.
                    SpatieTagsInput::make('segments')->label(__('plugins.tags.segments'))->type('segment')->columnSpanFull(),
                ]),
                Section::make(fn (): string => __('sales.customers.sections.notes'))->icon('sticky-note')->collapsible()->schema([
                    Textarea::make('notes')->label(__('sales.fields.notes'))->hiddenLabel()->rows(4)->maxLength(1000),
                ]),
            ])->columnSpan(['default' => 1, 'lg' => 1]),
        ])->columns(3);
    }

    // ---------------------------------------------------------------- Infolist

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Group::make([
                Section::make(fn (): string => __('sales.customers.sections.identity'))->icon('user')->schema([
                    ImageEntry::make('avatar_path')
                        ->hiddenLabel()
                        ->disk('demo')
                        ->circular()
                        ->size(72)
                        ->defaultImageUrl(fn (Customer $record): string => InitialsAvatar::url($record->initials(), $record->email))
                        ->columnSpan(1),
                    Group::make([
                        TextEntry::make('name')->hiddenLabel()->weight('semibold')->size('lg')
                            ->getStateUsing(fn (Customer $record): string => $record->name),
                        TextEntry::make('email')->hiddenLabel()->copyable()->icon('mail')->color('gray'),
                        TextEntry::make('phone')->hiddenLabel()->icon('phone')->color('gray')->placeholder('—'),
                    ])->columnSpan(['default' => 1, 'md' => 3]),
                    TextEntry::make('country')->label(__('sales.fields.country'))
                        ->formatStateUsing(fn (?string $state): ?string => $state === null ? null : (\Locale::getDisplayRegion('-'.$state, app()->getLocale()) ?: $state)),
                    TextEntry::make('locale')->label(__('sales.fields.locale'))
                        ->formatStateUsing(fn (?string $state): ?string => $state === null ? null : (static::localeOptions()[$state] ?? $state)),
                    TextEntry::make('birthday')->label(__('sales.fields.birthday'))->date()->placeholder('—')
                        ->helperText(fn (Customer $record): ?string => $record->birthday ? __('sales.customers.age', ['age' => (int) $record->birthday->diffInYears(now())]) : null),
                    TextEntry::make('created_at')->label(__('sales.fields.joined'))->date(),
                    IconEntry::make('is_vip')->label(__('sales.fields.is_vip'))->boolean()->trueIcon('crown')->trueColor('warning'),
                    IconEntry::make('accepts_marketing')->label(__('sales.fields.accepts_marketing'))->boolean(),
                ])->columns(['default' => 2, 'md' => 4]),

                Section::make(fn (): string => __('sales.customers.sections.spend'))->icon('chart-column')->schema([
                    ViewEntry::make('spend')
                        ->hiddenLabel()
                        ->view('demo-spend-chart')
                        ->getStateUsing(fn (Customer $record): array => static::monthlySpend($record))
                        ->viewData(fn (Customer $record): array => [
                            'currency' => 'USD',
                            'labels' => [
                                'aria' => __('sales.customers.chart.aria'),
                                'total' => __('sales.customers.chart.total'),
                                'average' => __('sales.customers.chart.average'),
                                'best' => __('sales.customers.chart.best'),
                                'empty' => __('sales.customers.empty.spend'),
                            ],
                        ]),
                ]),

                Section::make(fn (): string => __('sales.customers.pages.orders'))->icon('shopping-bag')->schema([
                    EmptyState::make(fn (): string => __('sales.customers.empty.orders'))
                        ->icon('shopping-bag')
                        ->visible(fn (Customer $record): bool => ! $record->orders()->exists()),
                    RepeatableEntry::make('recentOrders')
                        ->hiddenLabel()
                        ->getStateUsing(fn (Customer $record) => $record->orders()->latest('placed_at')->limit(5)->get())
                        ->visible(fn (Customer $record): bool => $record->orders()->exists())
                        ->schema([
                            TextEntry::make('number')->label(__('sales.fields.number'))->weight('medium')
                                // Children are serialised once with the parent record before the items, so tolerate both.
                                ->url(fn (Model $record): ?string => $record instanceof Order ? OrderResource::getUrl('edit', ['record' => $record]) : null),
                            EnumBadge::entry('status', OrderStatus::class)->label(__('sales.fields.status')),
                            TextEntry::make('total')->label(__('sales.fields.total'))->money(fn (Model $record): string => $record instanceof Order ? $record->currency : 'USD'),
                            TextEntry::make('placed_at')->label(__('sales.fields.placed_at'))->date(),
                        ])
                        ->columns(['default' => 2, 'md' => 4]),
                ]),
            ])->columnSpan(['default' => 1, 'lg' => 2]),

            Group::make([
                Section::make(fn (): string => __('sales.customers.sections.activity'))->icon('activity')->schema([
                    TextEntry::make('orders_count')->label(__('sales.fields.orders_count'))
                        ->getStateUsing(fn (Customer $record): int => $record->orders()->count())
                        ->numeric()
                        ->weight('semibold'),
                    TextEntry::make('lifetime_spend')->label(__('sales.fields.lifetime_spend'))
                        ->getStateUsing(fn (Customer $record): float => static::lifetimeSpend($record))
                        ->money('USD')
                        ->weight('semibold'),
                    TextEntry::make('last_order')->label(__('sales.fields.last_order'))
                        ->getStateUsing(fn (Customer $record): ?Carbon => $record->orders()->max('placed_at') ? Carbon::parse($record->orders()->max('placed_at')) : null)
                        ->since()
                        ->placeholder('—'),
                ]),
                Section::make(fn (): string => __('sales.customers.sections.default_address'))->icon('map-pin')->schema([
                    TextEntry::make('defaultAddress.line1')->hiddenLabel()
                        ->getStateUsing(fn (Customer $record): ?string => AddressFields::format($record->defaultAddress?->toSnapshot()))
                        ->placeholder(__('sales.customers.empty.addresses')),
                ]),
                Section::make(fn (): string => __('sales.customers.sections.notes'))->icon('sticky-note')->schema([
                    TextEntry::make('notes')->hiddenLabel()->placeholder('—')->prose(),
                ])->visible(fn (Customer $record): bool => filled($record->notes)),
            ])->columnSpan(['default' => 1, 'lg' => 1]),
        ])->columns(3);
    }

    // ---------------------------------------------------------------- Table

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                ImageColumn::make('avatar_path')
                    ->label('')
                    ->disk('demo')
                    ->circular()
                    ->size(36)
                    ->defaultImageUrl(fn (Customer $record): string => InitialsAvatar::url($record->initials(), $record->email)),
                TextColumn::make('first_name')
                    ->label(__('sales.fields.name'))
                    ->formatStateUsing(fn (mixed $state, Customer $record): string => $record->name)
                    ->description(fn (Customer $record): string => $record->email)
                    ->weight('medium')
                    ->searchable(query: fn (Builder $query, string $search): Builder => $query
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"))
                    ->sortable(query: fn (Builder $query, string $direction): Builder => $query->orderBy('last_name', $direction)->orderBy('first_name', $direction))
                    ->summarize(Count::make()->label(__('sales.customers.models'))),
                TextColumn::make('country')
                    ->label(__('sales.fields.country'))
                    ->formatStateUsing(fn (?string $state): ?string => $state === null ? null : (\Locale::getDisplayRegion('-'.$state, app()->getLocale()) ?: $state))
                    ->sortable()
                    ->toggleable()
                    ->visibleFrom('md'),
                TextColumn::make('orders_count')
                    ->label(__('sales.fields.orders_count'))
                    ->counts('orders')
                    ->numeric()
                    ->alignEnd()
                    ->sortable(),
                TextColumn::make('orders_sum_total')
                    ->label(__('sales.fields.lifetime_spend'))
                    ->sum('orders', 'total')
                    ->money('USD')
                    ->alignEnd()
                    ->sortable()
                    ->placeholder('—'),
                SpatieTagsColumn::make('tags')->label(__('plugins.tags.segments'))->type('segment')->limitList(2)->toggleable()->visibleFrom('lg'),
                IconColumn::make('is_vip')
                    ->label(__('sales.fields.is_vip'))
                    ->boolean()
                    ->trueIcon('crown')
                    ->trueColor('warning')
                    ->falseIcon('minus')
                    ->falseColor('gray')
                    ->alignCenter()
                    ->sortable(),
                IconColumn::make('accepts_marketing')
                    ->label(__('sales.fields.accepts_marketing'))
                    ->boolean()
                    ->alignCenter()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('created_at')
                    ->label(__('sales.fields.joined'))
                    ->date()
                    ->sortable()
                    ->toggleable()
                    ->visibleFrom('lg'),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                TernaryFilter::make('is_vip')->label(__('sales.fields.is_vip')),
                TernaryFilter::make('accepts_marketing')->label(__('sales.fields.accepts_marketing')),
                SelectFilter::make('country')->label(__('sales.fields.country'))->options(AddressFields::countries())->multiple(),
                SelectFilter::make('locale')->label(__('sales.fields.locale'))->options(static::localeOptions()),
                TrashedFilter::make(),
            ])
            ->persistFiltersInSession()
            ->persistSortInSession()
            ->striped()
            // Rows first; the count (and page numbers) load right after.
            ->deferTotals()
            ->emptyStateHeading(__('sales.customers.empty.customers'))
            ->emptyStateDescription(__('sales.customers.empty.customers_body'))
            ->emptyStateIcon('users')
            ->recordActions([
                ViewAction::make(),
                ActionGroup::make([
                    EditAction::make(),
                    Action::make('new_order')
                        ->label(__('sales.customers.actions.new_order'))
                        ->icon('shopping-bag')
                        ->url(fn (Customer $record): string => OrderResource::getUrl('create').'?customer_id='.$record->getKey()),
                    DeleteAction::make(),
                    RestoreAction::make(),
                ]),
            ])
            ->bulkActions([
                ExportBulkAction::make()->exporter(CustomerExporter::class)->fileDisk('demo'),
                DeleteBulkAction::make(),
                RestoreBulkAction::make(),
            ]);
    }

    // ---------------------------------------------------------------- Pages & navigation

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCustomers::route('/'),
            'create' => Pages\CreateCustomer::route('/create'),
            'view' => Pages\ViewCustomer::route('/{record}'),
            'edit' => Pages\EditCustomer::route('/{record}/edit'),
            'addresses' => Pages\ManageCustomerAddresses::route('/{record}/addresses'),
            'orders' => Pages\ManageCustomerOrders::route('/{record}/orders'),
        ];
    }

    public static function getRecordSubNavigation(Page $page): array
    {
        return $page->generateNavigationItems([
            Pages\ViewCustomer::class,
            Pages\EditCustomer::class,
            Pages\ManageCustomerAddresses::class,
            Pages\ManageCustomerOrders::class,
        ]);
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->withoutGlobalScopes([SoftDeletingScope::class]);
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['first_name', 'last_name', 'email', 'phone'];
    }

    public static function getGlobalSearchResultDetails(Model $record): array
    {
        /** @var Customer $record */
        return array_filter([
            __('sales.fields.email') => $record->email,
            __('sales.fields.country') => \Locale::getDisplayRegion('-'.$record->country, app()->getLocale()) ?: $record->country,
        ]);
    }

    // ---------------------------------------------------------------- Helpers

    /** @return array<string, string> */
    public static function localeOptions(): array
    {
        $options = [];

        foreach (alfakit()->getCurrentOrDefaultPanel()->getLocales() ?: ['en', 'ar'] as $locale) {
            $code = $locale instanceof PanelLocale ? $locale->getCode() : (string) $locale;
            $options[$code] = \Locale::getDisplayLanguage($code, $code) ?: $code;
        }

        return $options;
    }

    public static function lifetimeSpend(Customer $customer): float
    {
        return round((float) $customer->orders()->whereNotIn('status', [OrderStatus::Cancelled, OrderStatus::Refunded])->sum('total'), 2);
    }

    /**
     * Spend per month for the last twelve months (oldest first), for the profile chart.
     *
     * @return array<int, array{month: string, label: string, total: float, orders: int}>
     */
    public static function monthlySpend(Customer $customer): array
    {
        $start = now()->startOfMonth()->subMonths(11);

        $rows = $customer->orders()
            ->whereNotIn('status', [OrderStatus::Cancelled, OrderStatus::Refunded])
            ->where('placed_at', '>=', $start)
            ->get(['total', 'placed_at'])
            ->groupBy(fn (Order $order): string => $order->placed_at?->format('Y-m') ?? '');

        $months = [];

        for ($i = 0; $i < 12; $i++) {
            $month = $start->copy()->addMonths($i);
            $key = $month->format('Y-m');
            /** @var Collection<int, Order> $orders */
            $orders = $rows->get($key, collect());

            $months[] = [
                'month' => $key,
                'label' => $month->translatedFormat('M'),
                'total' => round((float) $orders->sum(fn (Order $order): float => (float) $order->total), 2),
                'orders' => $orders->count(),
            ];
        }

        return $months;
    }

    public static function avatarUrl(Customer $customer): string
    {
        return $customer->avatar_path ? Storage::disk('demo')->url($customer->avatar_path) : InitialsAvatar::url($customer->initials(), $customer->email);
    }
}
