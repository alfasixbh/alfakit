<?php

declare(strict_types=1);

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\StaffRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Customer;
use App\Models\Discount;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Testing\TestResponse;

require_once __DIR__.'/../Sales/SalesFixtures.php';

/*
 * The app pages built with the custom page toolkit: the point of sale (`Pages/Pos`) and the
 * fulfilment board (`Pages/FulfilmentBoard`), and their `#[Expose]` methods.
 */

function appPage(string $renderer, Store $store, string $slug): TestResponse
{
    return test()->get("/{$renderer}/admin/{$store->slug}/{$slug}", ['X-Inertia' => 'true', 'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request())]);
}

function appToken(Store $store, string $slug, string $renderer = 'react'): string
{
    return appPage($renderer, $store, $slug)->assertOk()->json('props.page.token');
}

/**
 * @param  array<mixed>  $arguments
 * @param  array<string, mixed>  $forms
 */
function appCall(Store $store, string $slug, string $method, array $arguments = [], array $forms = [], string $renderer = 'react', ?string $token = null): TestResponse
{
    return test()->postJson("/{$renderer}/admin/{$store->slug}/_alfakit/pages/call", [
        'token' => $token ?? appToken($store, $slug, $renderer),
        'method' => $method,
        'arguments' => $arguments,
        'forms' => $forms,
    ]);
}

it('renders the point of sale and the board in every renderer', function (string $renderer): void {
    [$store] = salesStore(StaffRole::Staff);
    salesProduct($store, 40);

    $pos = appPage($renderer, $store, 'pos')->assertOk();

    expect($pos->json('component'))->toBe('Pages/Pos')
        ->and($pos->json('props.page.layout'))->toBe('fullscreen')
        ->and($pos->json('props.products'))->toHaveCount(1)
        ->and($pos->json('props.copy.title'))->toBe('Point of sale')
        ->and(collect($pos->json('props.page.content'))->pluck('key')->all())->toBe(['form:sale'])
        ->and(collect($pos->json('props.page.content.0.components'))->pluck('statePath')->all())->toBe(['customer_id', 'payment_method']);

    $board = appPage($renderer, $store, 'fulfilment')->assertOk();

    expect($board->json('component'))->toBe('Pages/FulfilmentBoard')
        ->and(collect($board->json('props.columns'))->pluck('status')->all())->toBe(['paid', 'processing', 'shipped', 'delivered']);
})->with(['react', 'vue', 'svelte']);

it('checks out a sale: order, items, payment, stock and a toast', function (): void {
    [$store] = salesStore(StaffRole::Staff);
    $customer = salesCustomer($store);
    $soap = salesProduct($store, 50);
    $candle = salesProduct($store, 20);

    $response = appCall($store, 'pos', 'checkout', [
        'items' => [['product_id' => $soap->id, 'quantity' => 2], ['product_id' => $candle->id, 'quantity' => 1]],
    ], ['sale' => ['customer_id' => (string) $customer->id, 'payment_method' => 'cash_on_delivery']])->assertOk();

    $order = Order::query()->findOrFail($response->json('result.id'));

    expect($order->store_id)->toBe($store->id)
        ->and($order->customer_id)->toBe($customer->id)
        ->and($order->status)->toBe(OrderStatus::Paid)
        ->and($order->channel)->toBe('store')
        ->and((float) $order->subtotal)->toBe(120.0)
        ->and((float) $order->tax_total)->toBe(12.0)
        ->and((float) $order->total)->toBe(132.0)
        ->and($order->items()->count())->toBe(2)
        ->and($order->payments()->first()?->status)->toBe(PaymentStatus::Captured)
        ->and($order->payments()->first()?->method->value)->toBe('cash_on_delivery')
        ->and($soap->fresh()->stock)->toBe(18)
        ->and($candle->fresh()->stock)->toBe(19)
        ->and($response->json('notifications.0.title'))->toBe("{$order->number} charged")
        ->and($response->json('reload'))->toBe(['recentSales'])
        ->and($response->json('result.receiptUrl'))->toContain("/pos/receipts/{$order->id}");

    $this->get($response->json('result.receiptUrl'))->assertOk()->assertSee($order->number)->assertSee($soap->name);
});

it('quotes the cart on the server with a discount code', function (): void {
    [$store] = salesStore(StaffRole::Staff);
    $product = salesProduct($store, 100);
    Discount::query()->create(['store_id' => $store->id, 'code' => 'TEN', 'name' => 'Ten', 'type' => 'percentage', 'value' => 10, 'is_active' => true]);

    $quote = appCall($store, 'pos', 'quote', ['items' => [['product_id' => $product->id, 'quantity' => 2]], 'discountCode' => 'ten'])->assertOk();

    expect($quote->json('result'))->toMatchArray(['subtotal' => 200, 'discount' => 20, 'tax' => 18, 'total' => 198, 'discountCode' => 'TEN']);

    appCall($store, 'pos', 'quote', ['items' => [['product_id' => $product->id, 'quantity' => 1]], 'discountCode' => 'NOPE'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('discountCode');
});

it('finds products by SKU and searches them', function (): void {
    [$store] = salesStore(StaffRole::Staff);
    $product = salesProduct($store);

    appCall($store, 'pos', 'findBySku', ['code' => $product->sku])->assertOk()->assertJsonPath('result.id', $product->id);
    appCall($store, 'pos', 'findBySku', ['code' => 'NOPE-123'])->assertStatus(422)->assertJsonValidationErrors('code');
    appCall($store, 'pos', 'searchProducts', ['search' => $product->sku, 'category' => null])->assertOk()->assertJsonPath('result.0.id', $product->id);
});

it('refuses to sell more than the stock, and validates the sale form', function (): void {
    [$store] = salesStore(StaffRole::Staff);
    $product = salesProduct($store);

    appCall($store, 'pos', 'checkout', ['items' => [['product_id' => $product->id, 'quantity' => 21]]], ['sale' => ['payment_method' => 'card']])
        ->assertStatus(422)
        ->assertJsonValidationErrors('items.0.quantity');

    appCall($store, 'pos', 'checkout', ['items' => [['product_id' => $product->id, 'quantity' => 1]]], ['sale' => ['payment_method' => '']])
        ->assertStatus(422)
        ->assertJsonValidationErrors('forms.sale.payment_method');

    expect(Order::query()->count())->toBe(0)
        ->and($product->fresh()->stock)->toBe(20);
});

it('scopes the point of sale to the current store', function (): void {
    [$store, $user] = salesStore(StaffRole::Staff);
    $other = Store::factory()->create();
    $foreign = salesProduct($other);
    $foreignCustomer = Customer::factory()->create(['store_id' => $other->id]);
    $mine = salesProduct($store);

    // Another store's product is unknown here, another store's customer is not an option.
    appCall($store, 'pos', 'checkout', ['items' => [['product_id' => $foreign->id, 'quantity' => 1]]], ['sale' => ['payment_method' => 'card']])
        ->assertStatus(422)
        ->assertJsonValidationErrors('items.0.product_id');

    appCall($store, 'pos', 'checkout', ['items' => [['product_id' => $mine->id, 'quantity' => 1]]], ['sale' => ['payment_method' => 'card', 'customer_id' => (string) $foreignCustomer->id]])
        ->assertStatus(422)
        ->assertJsonValidationErrors('forms.sale.customer_id');

    // A store the user is not a member of.
    $this->postJson("/react/admin/{$other->slug}/_alfakit/pages/call", ['token' => appToken($store, 'pos'), 'method' => 'searchProducts', 'arguments' => []])->assertNotFound();

    // Receipts of other stores' orders.
    $order = salesOrder($other, $foreignCustomer, $foreign);
    $this->get("/react/admin/{$store->slug}/pos/receipts/{$order->id}")->assertNotFound();

    expect($foreign->fresh()->stock)->toBe(20)->and($user->id)->not->toBeNull();
});

it('refuses methods that are not exposed', function (string $method): void {
    [$store] = salesStore(StaffRole::Staff);

    appCall($store, 'pos', $method)->assertNotFound();
})->with(['findProducts', 'resolveLines', 'totals', 'receipt', 'saleForm', 'getViewData', 'store']);

it('needs staff access to the store for the point of sale', function (): void {
    $store = Store::factory()->create();
    $user = User::factory()->create(['is_admin' => false]);
    $this->actingAs($user);

    appPage('react', $store, 'pos')->assertNotFound();
});

it('moves orders on the board along the fulfilment flow only', function (): void {
    [$store] = salesStore(StaffRole::Staff);
    $order = salesOrder($store, salesCustomer($store), salesProduct($store), OrderStatus::Paid);
    $token = appToken($store, 'fulfilment');

    $moved = appCall($store, 'fulfilment', 'moveOrder', ['order' => $order->id, 'status' => 'processing'], token: $token)->assertOk();

    expect($moved->json('result'))->toMatchArray(['id' => $order->id, 'status' => 'processing'])
        ->and($moved->json('notifications.0.status'))->toBe('success')
        ->and($order->fresh()->status)->toBe(OrderStatus::Processing)
        ->and(Arr::last($order->fresh()->timeline)['status'])->toBe('processing');

    // Skipping a step is refused with a toast (the card goes back in the browser).
    $refused = appCall($store, 'fulfilment', 'moveOrder', ['order' => $order->id, 'status' => 'delivered'], token: $token)
        ->assertStatus(422)
        ->assertJsonValidationErrors('status');

    expect($refused->json('notifications.0.status'))->toBe('danger')
        ->and($order->fresh()->status)->toBe(OrderStatus::Processing);

    // Orders of another store are out of reach.
    $other = Store::factory()->create();
    $foreign = Order::factory()->create(['store_id' => $other->id, 'status' => OrderStatus::Paid]);
    appCall($store, 'fulfilment', 'moveOrder', ['order' => $foreign->id, 'status' => 'processing'], token: $token)->assertNotFound();
    expect($foreign->fresh()->status)->toBe(OrderStatus::Paid);
});
