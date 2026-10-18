<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\ActionGroup;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Actions\ReplicateAction;
use AlfaSix\Alfakit\Forms\Components\DateTimePicker;
use AlfaSix\Alfakit\Forms\Components\MoneyInput;
use AlfaSix\Alfakit\Forms\Components\Slider;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Components\Group;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Support\Currency;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Columns\ToggleColumn;
use AlfaSix\Alfakit\Tables\Filters\Filter;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Filters\TernaryFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\DiscountResource\Pages;
use App\Alfakit\Support\EnumBadge;
use App\Demo\Nav;
use App\Enums\DiscountType;
use App\Models\Discount;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Discount codes of the current store. The form shows ToggleButtons for the type, a Slider
 * for percentages, a MoneyInput for fixed amounts and date-time pickers in the store's
 * timezone; the table computes a running / scheduled / expired status.
 */
class DiscountResource extends Resource
{
    protected static ?string $model = Discount::class;

    protected static ?string $navigationIcon = 'ticket-percent';

    protected static ?int $navigationSort = 20;

    protected static ?string $recordTitleAttribute = 'code';

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::SALES);
    }

    public static function getModelLabel(): string
    {
        return __('sales.discounts.model');
    }

    public static function getPluralModelLabel(): string
    {
        return __('sales.discounts.models');
    }

    public static function timezone(): string
    {
        return alfakit()->getTenant()?->getAttribute('timezone') ?? 'Asia/Bahrain';
    }

    // ---------------------------------------------------------------- Form

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Group::make([
                Section::make(fn (): string => __('sales.discounts.sections.code'))->icon('ticket-percent')->schema([
                    TextInput::make('code')
                        ->label(__('sales.fields.code'))
                        ->helperText(__('sales.discounts.hints.code'))
                        ->required()
                        ->minLength(3)
                        ->maxLength(20)
                        ->regex('/^[A-Za-z0-9-]+$/')
                        ->unique(ignoreRecord: true)
                        ->dehydrateStateUsing(fn (?string $state): ?string => $state === null ? null : Str::upper($state))
                        ->suffixAction(
                            Action::make('generate')
                                ->icon('sparkles')
                                ->iconButton()
                                ->tooltip(__('sales.discounts.hints.generate'))
                                ->action(fn (Set $set) => $set('code', Str::upper(Str::random(8)))),
                        ),
                    TextInput::make('name')->label(__('sales.fields.name'))->required()->maxLength(80),
                ])->columns(2),

                Section::make(fn (): string => __('sales.discounts.sections.rule'))->icon('calculator')->schema([
                    ToggleButtons::make('type')
                        ->label(__('sales.fields.type'))
                        ->options(DiscountType::options())
                        ->colors(EnumBadge::toggleMaps(DiscountType::class)['colors'])
                        ->icons(EnumBadge::toggleMaps(DiscountType::class)['icons'])
                        ->default(DiscountType::Percentage->value)
                        ->inline()
                        ->live()
                        ->required()
                        ->columnSpanFull(),
                    Slider::make('value')
                        ->label(__('sales.fields.percent_off'))
                        ->helperText(__('sales.discounts.hints.percent'))
                        ->range(5, 70)
                        ->step(5)
                        ->default(10)
                        ->tooltips()
                        ->pips()
                        ->fillTrack()
                        ->visible(fn (Get $get): bool => $get('type') === DiscountType::Percentage->value)
                        ->columnSpanFull(),
                    MoneyInput::make('fixed_value')
                        ->label(__('sales.fields.amount_off'))
                        ->currency('USD')
                        ->minValue(1)
                        ->required(fn (Get $get): bool => $get('type') === DiscountType::Fixed->value)
                        ->formatStateUsing(fn (?Discount $record): ?float => $record?->type === DiscountType::Fixed ? (float) $record->value : null)
                        ->visible(fn (Get $get): bool => $get('type') === DiscountType::Fixed->value),
                    Callout::make(fn (): string => __('sales.discounts.hints.free_shipping'))
                        ->info()
                        ->icon('truck')
                        ->visible(fn (Get $get): bool => $get('type') === DiscountType::FreeShipping->value)
                        ->columnSpanFull(),
                    MoneyInput::make('min_order_total')->label(__('sales.fields.min_order_total'))->currency('USD')->minValue(0),
                    TextInput::make('usage_limit')
                        ->label(__('sales.fields.usage_limit'))
                        ->integer()
                        ->minValue(1)
                        ->placeholder(__('sales.fields.unlimited')),
                ])->columns(2),
            ])->columnSpan(['default' => 1, 'lg' => 2]),

            Group::make([
                Section::make(fn (): string => __('sales.discounts.sections.schedule'))
                    ->description(fn (): string => __('sales.discounts.sections.schedule_description', ['timezone' => static::timezone()]))
                    ->icon('calendar-clock')
                    ->schema([
                        DateTimePicker::make('starts_at')
                            ->label(__('sales.fields.starts_at'))
                            ->timezone(fn (): string => static::timezone())
                            ->seconds(false)
                            ->native(false)
                            ->default(fn (): Carbon => now()->startOfHour()),
                        DateTimePicker::make('ends_at')
                            ->label(__('sales.fields.ends_at'))
                            ->timezone(fn (): string => static::timezone())
                            ->seconds(false)
                            ->native(false)
                            ->afterOrEqual('starts_at'),
                        Toggle::make('is_active')->label(__('sales.fields.is_active'))->default(true),
                    ])
                    // The side column is narrow: one picker per row so the date and time fit.
                    ->columns(1),
            ])->columnSpan(['default' => 1, 'lg' => 1]),
        ])->columns(3);
    }

    /** Fold the type-specific value fields into `value` before saving. */
    public static function normalize(array $data): array
    {
        $type = DiscountType::tryFrom((string) ($data['type'] ?? ''));

        $data['value'] = match ($type) {
            DiscountType::Percentage => (float) ($data['value'] ?? 0),
            DiscountType::Fixed => (float) ($data['fixed_value'] ?? 0),
            default => 0.0,
        };

        $data['usage_limit'] = filled($data['usage_limit'] ?? null) ? (int) $data['usage_limit'] : null;

        unset($data['fixed_value']);

        return $data;
    }

    // ---------------------------------------------------------------- Table

    public static function table(Table $table): Table
    {
        $timezone = static::timezone();

        return $table
            ->columns([
                TextColumn::make('code')
                    ->label(__('sales.fields.code'))
                    ->badge()
                    ->color('secondary')
                    ->copyable()
                    ->searchable()
                    ->sortable()
                    ->description(fn (Discount $record): string => $record->name),
                EnumBadge::column('type', DiscountType::class)->label(__('sales.fields.type'))->sortable(),
                TextColumn::make('value')
                    ->label(__('sales.fields.value'))
                    ->formatStateUsing(fn (mixed $state, Discount $record): string => static::describeValue($record))
                    ->alignEnd()
                    ->sortable(),
                TextColumn::make('min_order_total')
                    ->label(__('sales.fields.min_order_total'))
                    ->money('USD')
                    ->placeholder('—')
                    ->alignEnd()
                    ->toggleable()
                    ->visibleFrom('lg'),
                TextColumn::make('used_count')
                    ->label(__('sales.fields.usage'))
                    ->formatStateUsing(fn (int $state, Discount $record): string => $record->usage_limit === null
                        ? (string) $state
                        : __('sales.discounts.usage_of', ['used' => $state, 'limit' => $record->usage_limit]))
                    ->alignEnd()
                    ->sortable(),
                TextColumn::make('status')
                    ->label(__('sales.fields.status'))
                    ->badge()
                    ->getStateUsing(fn (Discount $record): string => static::status($record))
                    ->formatStateUsing(fn (string $state): string => __('sales.discounts.status.'.$state))
                    ->color(fn (string $state): string => match ($state) {
                        'running' => 'success',
                        'scheduled' => 'info',
                        'expired', 'exhausted' => 'gray',
                        default => 'warning',
                    })
                    ->icon(fn (string $state): string => match ($state) {
                        'running' => 'play',
                        'scheduled' => 'calendar-clock',
                        'expired' => 'calendar-x',
                        'exhausted' => 'circle-slash',
                        default => 'pause',
                    }),
                TextColumn::make('starts_at')->label(__('sales.fields.starts_at'))->dateTime(timezone: $timezone)->sortable()->toggleable()->visibleFrom('md'),
                TextColumn::make('ends_at')->label(__('sales.fields.ends_at'))->dateTime(timezone: $timezone)->placeholder('—')->sortable()->toggleable()->visibleFrom('md'),
                ToggleColumn::make('is_active')->label(__('sales.fields.is_active'))->disabled(fn (): bool => ! static::canEdit(new Discount)),
            ])
            ->defaultSort('starts_at', 'desc')
            ->filters([
                SelectFilter::make('type')->label(__('sales.fields.type'))->options(DiscountType::options()),
                TernaryFilter::make('is_active')->label(__('sales.fields.is_active')),
                Filter::make('running')->label(__('sales.discounts.filters.running'))->toggle()
                    ->query(fn (Builder $query): Builder => $query->where('is_active', true)
                        ->where(fn (Builder $q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
                        ->where(fn (Builder $q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()))),
                Filter::make('scheduled')->label(__('sales.discounts.filters.scheduled'))->toggle()
                    ->query(fn (Builder $query): Builder => $query->where('starts_at', '>', now())),
                Filter::make('expired')->label(__('sales.discounts.filters.expired'))->toggle()
                    ->query(fn (Builder $query): Builder => $query->where('ends_at', '<', now())),
            ])
            ->striped()
            ->emptyStateHeading(__('sales.discounts.empty.heading'))
            ->emptyStateDescription(__('sales.discounts.empty.body'))
            ->emptyStateIcon('ticket-percent')
            ->recordActions([
                EditAction::make(),
                ActionGroup::make([
                    ReplicateAction::make()
                        ->label(__('sales.discounts.actions.duplicate'))
                        ->excludeAttributes(['used_count'])
                        ->beforeReplicaSaved(function (Discount $replica): void {
                            $replica->fill(['code' => Str::limit($replica->code, 14, '').'-'.Str::upper(Str::random(4)), 'used_count' => 0, 'is_active' => false]);
                        })
                        ->successNotificationTitle(fn (Discount $record): string => __('sales.discounts.actions.duplicate_done', ['code' => $record->code])),
                    DeleteAction::make(),
                ]),
            ])
            ->bulkActions([
                DeleteBulkAction::make(),
            ]);
    }

    // ---------------------------------------------------------------- Pages

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListDiscounts::route('/'),
            'create' => Pages\CreateDiscount::route('/create'),
            'edit' => Pages\EditDiscount::route('/{record}/edit'),
        ];
    }

    // ---------------------------------------------------------------- Helpers

    public static function describeValue(Discount $discount): string
    {
        return match ($discount->type) {
            DiscountType::Percentage => rtrim(rtrim(number_format((float) $discount->value, 2), '0'), '.').' %',
            DiscountType::Fixed => Currency::format((float) $discount->value, 'USD'),
            DiscountType::FreeShipping => DiscountType::FreeShipping->getLabel(),
        };
    }

    /** running | scheduled | expired | paused | exhausted */
    public static function status(Discount $discount): string
    {
        return match (true) {
            ! $discount->is_active => 'paused',
            $discount->usage_limit !== null && $discount->used_count >= $discount->usage_limit => 'exhausted',
            $discount->starts_at !== null && $discount->starts_at->isFuture() => 'scheduled',
            $discount->ends_at !== null && $discount->ends_at->isPast() => 'expired',
            default => 'running',
        };
    }
}
