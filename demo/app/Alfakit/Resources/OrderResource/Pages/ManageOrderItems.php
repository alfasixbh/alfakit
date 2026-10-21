<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\OrderResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\ModalTableSelect;
use AlfaSix\Alfakit\Forms\Components\MoneyInput;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Resources\Pages\ManageRelatedRecords;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\ImageColumn;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Sum;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\OrderResource;
use App\Alfakit\Resources\OrderResource\ProductPicker;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;

/**
 * The "Items" tab: the order lines as a related-records page. Lines can be added from the
 * catalog (ModalTableSelect) while the order is still open; every change recalculates the
 * totals on the order.
 */
class ManageOrderItems extends ManageRelatedRecords
{
    public const OPEN = [OrderStatus::Pending, OrderStatus::Paid, OrderStatus::Processing];

    protected static string $resource = OrderResource::class;

    protected static string $relationship = 'items';

    protected static ?string $relatedRecordTitleAttribute = 'name';

    protected static ?string $navigationIcon = 'package';

    public static function getNavigationLabel(): string
    {
        return __('sales.orders.pages.items');
    }

    public function getRelatedModelLabel(): ?string
    {
        return __('sales.fields.product');
    }

    public function getRelatedPluralModelLabel(): ?string
    {
        return __('sales.fields.items');
    }

    /** Lines are frozen once the order has shipped, been cancelled or refunded. */
    public function isReadOnly(): bool
    {
        /** @var Order $order */
        $order = $this->getOwnerRecord();

        return parent::isReadOnly() || ! in_array($order->status, self::OPEN, true);
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            ModalTableSelect::make('product_id')
                ->label(__('sales.fields.product'))
                ->recordTitleAttribute('name')
                ->tableConfiguration(ProductPicker::class)
                ->required()
                ->live()
                ->afterStateUpdated(function (Set $set, Get $get, mixed $state): void {
                    $product = blank($state) ? null : Product::query()->find((int) $state);
                    $price = (float) ($product->price ?? 0);

                    $set('unit_price', $price);
                    $set('total', round($price * max(1, (int) ($get('quantity') ?: 1)), 2));
                })
                ->columnSpanFull(),
            TextInput::make('quantity')
                ->label(__('sales.fields.quantity'))
                ->integer()
                ->minValue(1)
                ->maxValue(99)
                ->default(1)
                ->required()
                ->live(onBlur: true)
                ->afterStateUpdated(fn (Set $set, Get $get, mixed $state) => $set('total', round((float) $get('unit_price') * max(1, (int) $state), 2))),
            MoneyInput::make('unit_price')
                ->label(__('sales.fields.unit_price'))
                ->currency('USD')
                ->minValue(0)
                ->required()
                ->live(onBlur: true)
                ->afterStateUpdated(fn (Set $set, Get $get, mixed $state) => $set('total', round((float) $state * max(1, (int) $get('quantity')), 2))),
            MoneyInput::make('total')
                ->label(__('sales.fields.line_total'))
                ->currency('USD')
                ->readOnly()
                ->dehydrated(false),
        ])->columns(3);
    }

    public function table(Table $table): Table
    {
        $recalculate = function (): void {
            /** @var Order $order */
            $order = $this->getOwnerRecord();
            $order->recalculateTotals();
        };

        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('product'))
            ->columns([
                ImageColumn::make('product.images')->label('')->disk('demo')->square()->size(44)->limit(1)->limitedRemainingText(false),
                TextColumn::make('name')
                    ->label(__('sales.fields.product'))
                    ->weight('medium')
                    ->description(fn (OrderItem $record): ?string => $record->sku)
                    ->searchable(),
                TextColumn::make('quantity')->label(__('sales.fields.quantity'))->numeric()->alignEnd()
                    ->summarize(Sum::make()->label(__('sales.fields.items'))),
                TextColumn::make('unit_price')->label(__('sales.fields.unit_price'))->money('USD')->alignEnd(),
                TextColumn::make('total')->label(__('sales.fields.line_total'))->money('USD')->alignEnd()->weight('semibold')
                    ->summarize(Sum::make()->money('USD')->label(__('sales.fields.subtotal'))),
            ])
            ->defaultSort('id')
            ->paginated(false)
            ->headerActions([
                CreateAction::make()
                    ->label(__('sales.orders.actions.add_item'))
                    ->icon('plus')
                    ->modalHeading(__('sales.orders.actions.add_item'))
                    ->mutateDataUsing(fn (array $data): array => CreateOrder::completeItem($data))
                    ->after($recalculate),
            ])
            ->recordActions([
                EditAction::make()
                    ->mutateDataUsing(fn (array $data): array => CreateOrder::completeItem($data))
                    ->after($recalculate),
                DeleteAction::make()->after($recalculate),
            ])
            ->emptyStateHeading(__('sales.orders.empty.items'))
            ->emptyStateDescription(__('sales.orders.empty.items_body'))
            ->emptyStateIcon('package');
    }
}
