<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\OrderResource\Pages;

use AlfaSix\Alfakit\Forms\Components\ModalTableSelect;
use AlfaSix\Alfakit\Forms\Components\MoneyInput;
use AlfaSix\Alfakit\Forms\Components\Repeater;
use AlfaSix\Alfakit\Forms\Components\Repeater\TableColumn;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Resources\Pages\CreateRecord;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Components\Fieldset;
use AlfaSix\Alfakit\Schemas\Components\Grid;
use AlfaSix\Alfakit\Schemas\Components\Placeholder;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Components\Wizard;
use AlfaSix\Alfakit\Schemas\Components\Wizard\Step;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Support\Enums\Alignment;
use App\Alfakit\Resources\OrderResource;
use App\Alfakit\Resources\OrderResource\ProductPicker;
use App\Alfakit\Schemas\AddressFields;
use App\Enums\OrderStatus;
use App\Models\Address;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;

/**
 * New orders go through a four-step wizard: customer, items (a table repeater with a
 * ModalTableSelect and live totals), addresses (saved address or typed), review.
 * Each "Next" validates the current step on the server.
 */
class CreateOrder extends CreateRecord
{
    protected static string $resource = OrderResource::class;

    protected static bool $canCreateAnother = false;

    public const FREE_SHIPPING_FROM = 120.0;

    public const SHIPPING_FEE = 9.5;

    public const TAX_RATE = 0.1;

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Wizard::make([
                Step::make(__('sales.orders.steps.customer'))
                    ->key('customer')
                    ->description(__('sales.orders.steps.customer_description'))
                    ->icon('user')
                    ->schema([
                        OrderResource::customerSelect()
                            ->helperText(__('sales.orders.wizard.customer_hint'))
                            // "New order" on a customer page lands here with ?customer_id=.
                            ->default(fn (): ?int => Customer::query()->whereKey(request()->integer('customer_id'))->value('id'))
                            ->live()
                            ->afterStateUpdated(function (Set $set, mixed $state): void {
                                $snapshot = blank($state) ? null : Customer::query()->find((int) $state)?->defaultAddress?->toSnapshot();

                                $set('shipping_address', $snapshot ?? static::emptyAddress());
                            })
                            ->columnSpanFull(),
                        ToggleButtons::make('channel')
                            ->label(__('sales.fields.channel'))
                            ->options(OrderResource::channelOptions())
                            ->icons(['web' => 'globe', 'store' => 'store', 'phone' => 'phone'])
                            ->default('store')
                            ->grouped()
                            ->required(),
                        Textarea::make('notes')->label(__('sales.fields.notes'))->rows(2)->maxLength(1000),
                    ])->columns(2),

                Step::make(__('sales.orders.steps.items'))
                    ->key('items')
                    ->description(__('sales.orders.steps.items_description'))
                    ->icon('package')
                    ->schema([
                        Repeater::make('items')
                            ->hiddenLabel()
                            ->relationship()
                            ->table([
                                TableColumn::make(__('sales.fields.product'))->width('45%')->markAsRequired(),
                                TableColumn::make(__('sales.fields.quantity'))->width('15%')->alignment(Alignment::End),
                                TableColumn::make(__('sales.fields.unit_price'))->width('20%')->alignment(Alignment::End),
                                TableColumn::make(__('sales.fields.line_total'))->width('20%')->alignment(Alignment::End),
                            ])
                            ->schema([
                                ModalTableSelect::make('product_id')
                                    ->label(__('sales.fields.product'))
                                    ->recordTitleAttribute('name')
                                    ->tableConfiguration(ProductPicker::class)
                                    ->required()
                                    ->live()
                                    ->afterStateUpdated(function (Set $set, Get $get, mixed $state): void {
                                        $product = blank($state) ? null : Product::query()->find((int) $state);
                                        $price = (float) ($product->price ?? 0);
                                        $quantity = max(1, (int) ($get('quantity') ?: 1));

                                        $set('unit_price', $price);
                                        $set('total', round($price * $quantity, 2));
                                    }),
                                TextInput::make('quantity')
                                    ->label(__('sales.fields.quantity'))
                                    ->numeric()
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
                                    ->readOnly(),
                            ])
                            ->mutateRelationshipDataBeforeCreateUsing(fn (array $data): array => static::completeItem($data))
                            ->minItems(1)
                            ->defaultItems(1)
                            ->reorderable(false)
                            ->addActionLabel(__('sales.orders.actions.add_item'))
                            ->columnSpanFull(),
                        Callout::make(fn (): string => __('sales.orders.wizard.estimated_total'))
                            ->description(fn (Get $get): string => static::estimate($get('items')))
                            ->info()
                            ->icon('calculator')
                            ->columnSpanFull(),
                    ]),

                Step::make(__('sales.orders.steps.addresses'))
                    ->key('addresses')
                    ->description(__('sales.orders.steps.addresses_description'))
                    ->icon('map-pin')
                    ->schema([
                        Select::make('saved_address')
                            ->label(__('sales.orders.wizard.saved_address'))
                            ->helperText(__('sales.orders.wizard.saved_address_hint'))
                            ->options(fn (Get $get): array => static::savedAddresses($get('customer_id')))
                            ->native(false)
                            ->live()
                            ->dehydrated(false)
                            ->visible(fn (Get $get): bool => filled($get('customer_id')))
                            ->afterStateUpdated(function (Set $set, mixed $state): void {
                                if (filled($state) && ($address = Address::query()->find((int) $state)) !== null) {
                                    $set('shipping_address', $address->toSnapshot());
                                }
                            })
                            ->columnSpanFull(),
                        Fieldset::make(__('sales.fields.shipping_address'))
                            ->statePath('shipping_address')
                            ->schema([AddressFields::make()])
                            ->columns(2),
                        Toggle::make('billing_same')
                            ->label(__('sales.orders.wizard.billing_same'))
                            ->default(true)
                            ->live()
                            ->dehydrated(false)
                            ->columnSpanFull(),
                        Fieldset::make(__('sales.fields.billing_address'))
                            ->statePath('billing_address')
                            ->schema([AddressFields::make()])
                            ->visible(fn (Get $get): bool => ! $get('billing_same'))
                            ->columns(2),
                    ])->columns(2),

                Step::make(__('sales.orders.steps.review'))
                    ->key('review')
                    ->description(__('sales.orders.steps.review_description'))
                    ->icon('clipboard-check')
                    ->schema([
                        Callout::make(fn (): string => __('sales.orders.wizard.review_heading'))
                            ->description(fn (Get $get): string => trans_choice('sales.orders.wizard.review_body', count(array_filter((array) $get('items'), fn (mixed $item): bool => filled($item['product_id'] ?? null))), [
                                'customer' => ($id = $get('customer_id')) ? (Customer::query()->find($id)->name ?? __('sales.orders.wizard.review_anonymous')) : __('sales.orders.wizard.review_anonymous'),
                                'city' => $get('shipping_address.city') ?: __('sales.orders.wizard.review_no_city'),
                            ]))
                            ->success()
                            ->icon('sparkles')
                            ->columnSpanFull(),
                        Section::make(fn (): string => __('sales.orders.sections.totals'))->icon('calculator')->schema([
                            Grid::make(['default' => 2, '@md' => 4])->schema([
                                Placeholder::make('review_subtotal')->label(__('sales.fields.subtotal'))->content(fn (Get $get): string => OrderResource::money(static::totals($get('items'))['subtotal'])),
                                Placeholder::make('review_shipping')->label(__('sales.fields.shipping'))->content(fn (Get $get): string => OrderResource::money(static::totals($get('items'))['shipping'])),
                                Placeholder::make('review_tax')->label(__('sales.fields.tax'))->content(fn (Get $get): string => OrderResource::money(static::totals($get('items'))['tax'])),
                                Placeholder::make('review_total')->label(__('sales.fields.total'))->content(fn (Get $get): string => OrderResource::money(static::totals($get('items'))['total'])),
                            ]),
                        ]),
                    ]),
            ])->persistStepInQueryString()->submitActionLabel(__('sales.orders.wizard.submit_hint'))->columnSpanFull(),
        ])->columns(1);
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        /** @var Store $store */
        $store = alfakit()->getTenant();
        $now = now();

        $data['number'] = Order::nextNumber($store);
        $data['status'] = OrderStatus::Pending;
        $data['currency'] = 'USD';
        $data['placed_at'] = $now;
        $data['timeline'] = [['status' => OrderStatus::Pending->value, 'at' => $now->toIso8601String(), 'note' => __('demo.timeline.placed')]];

        if (blank($data['billing_address']['recipient'] ?? null)) {
            $data['billing_address'] = $data['shipping_address'] ?? null;
        }

        unset($data['saved_address'], $data['billing_same'], $data['items']);

        return $data;
    }

    protected function afterCreate(): void
    {
        /** @var Order $order */
        $order = $this->getCreatedRecord();
        $subtotal = (float) $order->items()->sum('total');

        $order->forceFill(['shipping_total' => $subtotal >= self::FREE_SHIPPING_FROM ? 0 : self::SHIPPING_FEE])->recalculateTotals();
    }

    // ---------------------------------------------------------------- Helpers

    /** Fill name, SKU and line total of an item from its product before it is stored. */
    public static function completeItem(array $data): array
    {
        $product = Product::query()->find($data['product_id'] ?? null);
        $quantity = max(1, (int) ($data['quantity'] ?? 1));
        $unitPrice = round((float) ($data['unit_price'] ?? $product->price ?? 0), 2);

        return [
            ...$data,
            'name' => $product->name ?? ($data['name'] ?? ''),
            'sku' => $product->sku ?? ($data['sku'] ?? null),
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'total' => round($unitPrice * $quantity, 2),
        ];
    }

    /** @return array{subtotal: float, shipping: float, tax: float, total: float} */
    public static function totals(mixed $items): array
    {
        $subtotal = 0.0;

        foreach ((array) $items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $subtotal += round((float) ($item['unit_price'] ?? 0) * max(1, (int) ($item['quantity'] ?? 1)), 2);
        }

        $shipping = $subtotal === 0.0 || $subtotal >= self::FREE_SHIPPING_FROM ? 0.0 : self::SHIPPING_FEE;
        $tax = round($subtotal * self::TAX_RATE, 2);

        return ['subtotal' => $subtotal, 'shipping' => $shipping, 'tax' => $tax, 'total' => round($subtotal + $shipping + $tax, 2)];
    }

    protected static function estimate(mixed $items): string
    {
        $totals = static::totals($items);

        if ($totals['subtotal'] === 0.0) {
            return __('sales.orders.wizard.no_items');
        }

        return OrderResource::money($totals['total']).' · '.__('sales.orders.wizard.tax_hint').' '.__('sales.orders.wizard.free_shipping_hint', ['amount' => OrderResource::money(self::FREE_SHIPPING_FROM)]);
    }

    /** @return array<int, string> */
    protected static function savedAddresses(mixed $customerId): array
    {
        if (blank($customerId)) {
            return [];
        }

        return Address::query()
            ->where('customer_id', $customerId)
            ->orderByDesc('is_default')
            ->get()
            ->mapWithKeys(fn (Address $address): array => [$address->id => trim(($address->label ? $address->label.' · ' : '').$address->line1.', '.$address->city)])
            ->all();
    }

    /** @return array<string, null> */
    protected static function emptyAddress(): array
    {
        return array_fill_keys(['recipient', 'line1', 'line2', 'city', 'state', 'postal_code', 'country', 'phone'], null);
    }
}
