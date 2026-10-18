<?php

declare(strict_types=1);

namespace App\Alfakit\Portal\Resources;

use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Portal\Resources\OrderResource\Pages;
use App\Models\Order;
use Illuminate\Database\Eloquent\Model;

/**
 * The customer's own orders (the portal panel's `scopeToUser('user_id')`), read-only.
 */
class OrderResource extends Resource
{
    protected static ?string $model = Order::class;

    protected static ?string $navigationIcon = 'package';

    protected static ?string $recordTitleAttribute = 'number';

    public static function getModelLabel(): string
    {
        return __('playground.portal.orders.label');
    }

    public static function getPluralModelLabel(): string
    {
        return __('playground.portal.orders.plural');
    }

    public static function getNavigationLabel(): string
    {
        return __('playground.portal.orders.navigation');
    }

    /**
     * Customers look at their orders; they don't create, edit or delete them here (the
     * panel's `scopeToUser()` already limits them to their own).
     */
    public static function can(string $action, ?Model $record = null): bool
    {
        return in_array($action, ['viewAny', 'view'], true) && parent::can($action, $record);
    }

    /**
     * @return array<string, string>
     */
    public static function statusOptions(): array
    {
        return array_map(static fn (string $status): string => __("playground.portal.orders.statuses.{$status}"), array_combine(array_keys(Order::STATUSES), array_keys(Order::STATUSES)));
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('placed_at', 'desc')
            ->columns([
                TextColumn::make('number')->label(__('playground.portal.orders.number'))->searchable()->weight('medium'),
                TextColumn::make('status')
                    ->label(__('playground.portal.orders.status'))
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => self::statusOptions()[$state] ?? $state)
                    ->color(fn (string $state): string => Order::STATUSES[$state] ?? 'gray'),
                TextColumn::make('items_count')->label(__('playground.portal.orders.items'))->numeric()->alignEnd(),
                TextColumn::make('total')->label(__('playground.portal.orders.total'))->money('USD', divideBy: 100)->sortable()->alignEnd(),
                TextColumn::make('placed_at')->label(__('playground.portal.orders.placed_at'))->date()->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')->label(__('playground.portal.orders.status'))->options(self::statusOptions()),
            ])
            ->recordActions([ViewAction::make()]);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(__('playground.portal.orders.label'))->columns(2)->schema([
                TextEntry::make('number')->label(__('playground.portal.orders.number')),
                TextEntry::make('status')
                    ->label(__('playground.portal.orders.status'))
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => self::statusOptions()[$state] ?? $state)
                    ->color(fn (string $state): string => Order::STATUSES[$state] ?? 'gray'),
                TextEntry::make('items_count')->label(__('playground.portal.orders.items'))->numeric(),
                TextEntry::make('total')->label(__('playground.portal.orders.total'))->money('USD', divideBy: 100),
                TextEntry::make('placed_at')->label(__('playground.portal.orders.placed_at'))->dateTime(),
            ]),
        ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListOrders::route('/'),
            'view' => Pages\ViewOrder::route('/{record}'),
        ];
    }
}
