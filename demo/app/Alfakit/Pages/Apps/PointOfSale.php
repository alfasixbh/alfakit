<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Apps;

use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Notifications\Actions\Action as NotificationAction;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Pages\Attributes\Expose;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Support\Currency;
use App\Alfakit\Resources\OrderResource;
use App\Demo\Nav;
use App\Enums\DiscountType;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ProductStatus;
use App\Enums\StaffRole;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Discount;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * The point of sale: a fullscreen app page rendered by `Pages/Pos` in each renderer
 * (resources/js/{react,vue,svelte}/pages/Pos.*).
 *
 * The component gets its first products, the categories and its copy from `getViewData()`,
 * and calls the `#[Expose]` methods below for everything else: search, SKU lookup, the
 * server-side quote (subtotal, discount, VAT) and the checkout. The customer and payment
 * method come from the `sale` form (`saleForm()`), embedded with `<PageForm name="sale" />`:
 * a relationship Select with "create customer", and ToggleButtons. Every query is scoped to
 * the current store; exposed methods are not resource queries, so nothing does it for us.
 */
class PointOfSale extends Page
{
    public const PAGE_SIZE = 24;

    public const TAX_RATE = 0.1;

    public const MAX_QUANTITY = 99;

    /** Payment methods offered at the counter. */
    public const PAYMENT_METHODS = [PaymentMethod::Card, PaymentMethod::ApplePay, PaymentMethod::CashOnDelivery];

    protected static ?string $slug = 'pos';

    protected static ?string $component = 'Pages/Pos';

    protected static string $layout = 'fullscreen';

    protected static ?string $navigationIcon = 'scan-barcode';

    protected static ?int $navigationSort = -10;

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::SALES);
    }

    public static function getNavigationLabel(): string
    {
        return __('apps.pos.title');
    }

    public function getTitle(): string
    {
        return __('apps.pos.title');
    }

    public static function canAccess(): bool
    {
        $user = alfakit()->auth();

        return $user instanceof User && $user->hasStaffRole(StaffRole::Staff);
    }

    /**
     * The page, plus its printable receipt (`/pos/receipts/{order}`), in the same tenant group.
     */
    public static function registerRoutes(Panel $panel): void
    {
        parent::registerRoutes($panel);

        Route::get('pos/receipts/{order}', [static::class, 'receipt'])
            ->whereNumber('order')
            ->name('pages.pos.receipt');
    }

    // ---------------------------------------------------------------- Props

    /**
     * @return array<string, mixed>
     */
    protected function getViewData(): array
    {
        return [
            'products' => $this->findProducts('', null),
            'categories' => Category::query()
                ->whereHas('products', fn (Builder $query) => $this->sellable($query))
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Category $category): array => ['id' => $category->id, 'name' => $category->name])
                ->all(),
            'recentSales' => fn (): array => $this->recentSales(),
            'currency' => 'USD',
            'ordersUrl' => OrderResource::getUrl('index'),
            'copy' => __('apps.pos'),
        ];
    }

    /**
     * Customer (searchable relationship Select that can create a customer) and payment method.
     */
    public function saleForm(Schema $schema): Schema
    {
        return $schema->model(Order::class)->columns(1)->components([
            OrderResource::customerSelect()
                ->label(__('apps.pos.customer'))
                ->placeholder(__('apps.pos.walk_in'))
                ->createOptionForm([
                    TextInput::make('first_name')->label(__('apps.pos.new_customer.first_name'))->required()->maxLength(60),
                    TextInput::make('last_name')->label(__('apps.pos.new_customer.last_name'))->required()->maxLength(60),
                    TextInput::make('email')->label(__('apps.pos.new_customer.email'))->email()->required()->maxLength(120),
                    TextInput::make('phone')->label(__('apps.pos.new_customer.phone'))->tel()->maxLength(30),
                ])
                ->createOptionUsing(fn (array $data): int => Customer::query()->create([
                    'store_id' => $this->store()->getKey(),
                    'first_name' => (string) $data['first_name'],
                    'last_name' => (string) $data['last_name'],
                    'email' => (string) $data['email'],
                    'phone' => $data['phone'] ?? null,
                ])->getKey()),
            ToggleButtons::make('payment_method')
                ->label(__('apps.pos.payment_method'))
                ->options(collect(self::PAYMENT_METHODS)->mapWithKeys(fn (PaymentMethod $method): array => [$method->value => __('apps.pos.payment.'.$method->value)])->all())
                ->icons(collect(self::PAYMENT_METHODS)->mapWithKeys(fn (PaymentMethod $method): array => [$method->value => $method->getIcon()])->all())
                ->default(PaymentMethod::Card->value)
                ->grouped()
                ->required(),
        ]);
    }

    // ---------------------------------------------------------------- Exposed methods

    /**
     * Products for the grid: name or SKU search, optionally within a category.
     *
     * @return array<int, array<string, mixed>>
     */
    #[Expose(rules: ['search' => ['nullable', 'string', 'max:80'], 'category' => ['nullable', 'integer']])]
    public function searchProducts(?string $search = null, ?int $category = null): array
    {
        return $this->findProducts((string) $search, $category);
    }

    /**
     * The product with exactly this SKU (barcode scanners type it and press Enter).
     *
     * @return array<string, mixed>
     */
    #[Expose(rules: ['code' => ['required', 'string', 'max:64']])]
    public function findBySku(string $code): array
    {
        $product = $this->sellable(Product::query())->where('sku', trim($code))->first();

        if ($product === null) {
            throw ValidationException::withMessages(['code' => __('apps.pos.errors.sku_not_found', ['code' => $code])]);
        }

        return $this->productCard($product);
    }

    /**
     * Subtotal, discount, VAT and total of the cart, computed here only.
     *
     * @param  array<int, array{product_id: int, quantity: int}>  $items
     * @return array<string, mixed>
     */
    #[Expose(rules: [
        'items' => ['present', 'array', 'max:50'],
        'items.*.product_id' => ['required', 'integer'],
        'items.*.quantity' => ['required', 'integer', 'min:1', 'max:'.self::MAX_QUANTITY],
        'discountCode' => ['nullable', 'string', 'max:40'],
    ])]
    public function quote(array $items, ?string $discountCode = null): array
    {
        $lines = $this->resolveLines($items);

        return $this->totals($lines, $this->resolveDiscount($discountCode, $this->subtotal($lines)));
    }

    /**
     * Charge the cart: an order with its items and a captured payment, stock decremented,
     * all in one transaction (the panel's `databaseTransactions()`).
     *
     * @param  array<int, array{product_id: int, quantity: int}>  $items
     * @return array<string, mixed>
     */
    #[Expose(
        rateLimit: 20,
        authorize: ['create', Order::class],
        rules: [
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:'.self::MAX_QUANTITY],
            'discountCode' => ['nullable', 'string', 'max:40'],
        ],
        messages: ['items.required' => 'apps.pos.errors.empty', 'items.min' => 'apps.pos.errors.empty'],
    )]
    public function checkout(array $items, ?string $discountCode = null): array
    {
        $sale = $this->formState('sale');
        $store = $this->store();
        $method = PaymentMethod::tryFrom((string) ($sale['payment_method'] ?? '')) ?? PaymentMethod::Card;
        $lines = $this->resolveLines($items, lock: true);
        $discount = $this->resolveDiscount($discountCode, $this->subtotal($lines));
        $now = now();

        $order = Order::query()->create([
            'store_id' => $store->getKey(),
            'customer_id' => $sale['customer_id'] ?? null,
            'discount_id' => $discount?->getKey(),
            'number' => Order::nextNumber($store),
            'status' => OrderStatus::Paid,
            'currency' => 'USD',
            'subtotal' => 0,
            'discount_total' => 0,
            'shipping_total' => 0,
            'tax_total' => 0,
            'total' => 0,
            'channel' => 'store',
            'placed_at' => $now,
            'timeline' => [
                ['status' => OrderStatus::Pending->value, 'at' => $now->toIso8601String(), 'note' => __('demo.timeline.placed')],
                ['status' => OrderStatus::Paid->value, 'at' => $now->toIso8601String(), 'note' => __('demo.timeline.paid')],
            ],
        ]);

        foreach ($lines as $line) {
            $order->items()->create([
                'product_id' => $line['product']->id,
                'name' => $line['product']->name,
                'sku' => $line['product']->sku,
                'quantity' => $line['quantity'],
                'unit_price' => $line['product']->price,
                'total' => $line['total'],
            ]);

            $line['product']->decrement('stock', $line['quantity']);
        }

        $order->recalculateTotals();

        $order->payments()->create([
            'method' => $method,
            'status' => PaymentStatus::Captured,
            'amount' => $order->total,
            'currency' => $order->currency,
            'reference' => 'POS-'.Str::upper(Str::random(8)),
            'paid_at' => $now,
        ]);

        $discount?->increment('used_count');

        $total = Currency::format((float) $order->total, $order->currency);

        Notification::make()
            ->success()
            ->title(__('apps.pos.charged', ['number' => $order->number]))
            ->body(__('apps.pos.charged_body', ['total' => $total, 'method' => __('apps.pos.payment.'.$method->value)]))
            ->actions([
                NotificationAction::make('view')->label(__('apps.pos.view_order'))->url(OrderResource::getUrl('view', ['record' => $order])),
            ])
            ->send();

        // Recent sales come from getViewData(); the browser reloads just that prop.
        $this->reloadProps('recentSales');

        return [
            'id' => $order->id,
            'number' => $order->number,
            'total' => (float) $order->total,
            'url' => OrderResource::getUrl('view', ['record' => $order]),
            'receiptUrl' => $this->receiptUrl($order),
        ];
    }

    // ---------------------------------------------------------------- Receipt route

    /**
     * `GET pos/receipts/{order}`: a printable receipt of one of this store's orders.
     */
    public function receipt(Request $request): View
    {
        abort_unless(static::canAccess(), 403);

        $order = Order::query()
            ->whereBelongsTo($this->store())
            ->with(['items', 'payments', 'customer'])
            ->findOrFail((int) $request->route('order'));

        $payment = $order->payments->first();

        return view('demo.pos.receipt', [
            'order' => $order,
            'store' => $this->store(),
            'cashier' => alfakit()->auth()?->getAttribute('name'),
            'payment' => $payment === null ? null : __('apps.pos.payment.'.$payment->method->value),
            'money' => static fn (float|string $amount): string => Currency::format((float) $amount, $order->currency),
            'backUrl' => static::getUrl(),
            'direction' => alfakit()->getCurrentOrDefaultPanel()->getLocalizationSchema()['direction'] ?? 'ltr',
        ]);
    }

    // ---------------------------------------------------------------- Helpers

    protected function store(): Store
    {
        $store = alfakit()->getTenant();
        abort_unless($store instanceof Store, 404);

        return $store;
    }

    /**
     * Active products of the current store.
     *
     * @param  Builder<Product>  $query
     * @return Builder<Product>
     */
    protected function sellable(Builder $query): Builder
    {
        return $query->whereBelongsTo($this->store())->where('status', ProductStatus::Active);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function findProducts(string $search, ?int $category): array
    {
        $search = trim($search);

        return $this->sellable(Product::query())
            ->when($category !== null, fn (Builder $query) => $query->where('category_id', $category))
            ->when($search !== '', fn (Builder $query) => $query->where(fn (Builder $query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('sku', 'like', "%{$search}%")))
            ->orderByDesc('featured')
            ->orderBy('name')
            ->limit(self::PAGE_SIZE)
            ->get()
            ->map(fn (Product $product): array => $this->productCard($product))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    protected function productCard(Product $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->localizedName(),
            'sku' => $product->sku,
            'price' => (float) $product->price,
            'stock' => $product->stock,
            'image' => $product->imageUrl(),
            'categoryId' => $product->category_id,
        ];
    }

    /**
     * The cart's products (of this store, active) with their line totals; quantities are
     * checked against the stock.
     *
     * @param  array<int, array{product_id: int, quantity: int}>  $items
     *
     * @throws ValidationException
     *
     * @return array<int, array{product: Product, quantity: int, total: float}>
     */
    protected function resolveLines(array $items, bool $lock = false): array
    {
        $quantities = [];

        foreach ($items as $item) {
            $id = (int) $item['product_id'];
            $quantities[$id] = ($quantities[$id] ?? 0) + (int) $item['quantity'];
        }

        $products = $this->sellable(Product::query())
            ->whereKey(array_keys($quantities))
            ->when($lock, fn (Builder $query) => $query->lockForUpdate())
            ->get()
            ->keyBy('id');

        $lines = [];
        $errors = [];
        $index = 0;

        foreach ($quantities as $id => $quantity) {
            $product = $products->get($id);

            if ($product === null) {
                $errors["items.{$index}.product_id"] = __('apps.pos.errors.unavailable', ['name' => "#{$id}"]);
            } elseif ($quantity > $product->stock) {
                $errors["items.{$index}.quantity"] = __('apps.pos.errors.not_enough_stock', ['count' => $product->stock, 'name' => $product->localizedName()]);
            } else {
                $lines[] = ['product' => $product, 'quantity' => $quantity, 'total' => round((float) $product->price * $quantity, 2)];
            }

            $index++;
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return $lines;
    }

    /**
     * @param  array<int, array{total: float}>  $lines
     */
    protected function subtotal(array $lines): float
    {
        return round(array_sum(array_column($lines, 'total')), 2);
    }

    /**
     * An active, current discount of this store, or null without a code.
     *
     * @throws ValidationException
     */
    protected function resolveDiscount(?string $code, float $subtotal): ?Discount
    {
        $code = trim((string) $code);

        if ($code === '') {
            return null;
        }

        $discount = Discount::query()
            ->whereBelongsTo($this->store())
            ->where('code', Str::upper($code))
            ->where('is_active', true)
            ->where(fn (Builder $query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn (Builder $query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
            ->first();

        $valid = $discount !== null
            && $discount->type !== DiscountType::FreeShipping
            && ($discount->usage_limit === null || $discount->used_count < $discount->usage_limit)
            && ($discount->min_order_total === null || $subtotal >= (float) $discount->min_order_total);

        if (! $valid) {
            throw ValidationException::withMessages(['discountCode' => __('apps.pos.errors.discount_invalid', ['code' => $code])]);
        }

        return $discount;
    }

    /**
     * The same arithmetic as `Order::recalculateTotals()` (no shipping at the counter).
     *
     * @param  array<int, array{product: Product, quantity: int, total: float}>  $lines
     * @return array<string, mixed>
     */
    protected function totals(array $lines, ?Discount $discount): array
    {
        $subtotal = $this->subtotal($lines);

        $discountTotal = match ($discount?->type) {
            DiscountType::Percentage => round($subtotal * (float) $discount->value / 100, 2),
            DiscountType::Fixed => min($subtotal, (float) $discount->value),
            default => 0.0,
        };
        $tax = round(($subtotal - $discountTotal) * self::TAX_RATE, 2);

        return [
            'lines' => array_map(fn (array $line): array => ['productId' => $line['product']->id, 'quantity' => $line['quantity'], 'total' => $line['total']], $lines),
            'subtotal' => $subtotal,
            'discount' => $discountTotal,
            'discountCode' => $discount?->code,
            'discountLabel' => $discount?->name,
            'tax' => $tax,
            'total' => round($subtotal - $discountTotal + $tax, 2),
        ];
    }

    /**
     * Today's last sales at the counter.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function recentSales(): array
    {
        return Order::query()
            ->whereBelongsTo($this->store())
            ->where('channel', 'store')
            ->where('placed_at', '>=', now()->startOfDay())
            ->with('customer')
            ->latest('id')
            ->limit(5)
            ->get()
            ->map(fn (Order $order): array => [
                'id' => $order->id,
                'number' => $order->number,
                'total' => (float) $order->total,
                'customer' => $order->customer?->name,
                'placedAt' => $order->placed_at?->toIso8601String(),
                'receiptUrl' => $this->receiptUrl($order),
            ])
            ->all();
    }

    protected function receiptUrl(Order $order): string
    {
        return $this->getPanel()->route('pages.pos.receipt', ['order' => $order->getKey()]);
    }
}
