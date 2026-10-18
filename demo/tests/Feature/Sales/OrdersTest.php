<?php

declare(strict_types=1);

use App\Alfakit\Resources\OrderResource\Pages\CreateOrder;
use App\Alfakit\Resources\OrderResource\Pages\EditOrder;
use App\Alfakit\Resources\OrderResource\Pages\ListOrders;
use App\Alfakit\Resources\OrderResource\Pages\ManageOrderPayments;
use App\Alfakit\Resources\OrderResource\Pages\ViewOrder;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\ShipmentStatus;
use App\Enums\StaffRole;
use App\Models\Order;

require_once __DIR__.'/SalesFixtures.php';

it('lists the store orders with status badges in every renderer', function (string $renderer): void {
    [$store] = salesStore();
    $customer = salesCustomer($store);
    $order = salesOrder($store, $customer, salesProduct($store));

    $page = alfakit()->testPage(ListOrders::class, ['tenant' => $store], $renderer)
        ->assertOk()
        ->assertCanSeeTableRecords([$order])
        ->assertTableColumnExists('status')
        ->assertTableColumnExists('total');

    expect($page->getProps('alfakit.id'))->toBe($renderer);
})->with(['react', 'vue', 'svelte']);

it('creates an order through the wizard and computes the totals', function (): void {
    [$store] = salesStore();
    $customer = salesCustomer($store);
    $product = salesProduct($store, 80);

    alfakit()->testPage(CreateOrder::class, ['tenant' => $store], 'react')
        ->fillForm([
            'customer_id' => $customer->id,
            'channel' => 'store',
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 2,
                'unit_price' => 80,
            ]],
            'shipping_address' => [
                'recipient' => 'Noor Haddad',
                'line1' => '12 Pearl Street',
                'city' => 'Manama',
                'country' => 'BH',
            ],
        ])
        ->call('create')
        ->assertHasNoFormErrors();

    $order = Order::query()->where('customer_id', $customer->id)->latest('id')->firstOrFail();

    expect($order->status)->toBe(OrderStatus::Pending)
        ->and($order->number)->toStartWith('MA-')
        ->and($order->items()->count())->toBe(1)
        ->and((float) $order->subtotal)->toBe(160.0)
        ->and((float) $order->shipping_total)->toBe(0.0) // free from 120
        ->and((float) $order->tax_total)->toBe(16.0)
        ->and((float) $order->total)->toBe(176.0)
        ->and($order->timeline)->toHaveCount(1)
        ->and($order->billing_address['line1'] ?? null)->toBe('12 Pearl Street');
});

it('validates the wizard steps on the server', function (): void {
    [$store] = salesStore();
    $product = salesProduct($store);

    alfakit()->testPage(CreateOrder::class, ['tenant' => $store], 'react')
        ->fillForm([
            'channel' => 'web',
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 10]],
            'shipping_address' => ['recipient' => '', 'line1' => '', 'city' => '', 'country' => null],
        ])
        ->call('create')
        ->assertHasFormErrors(['shipping_address.recipient', 'shipping_address.line1']);

    expect(Order::query()->count())->toBe(0);
});

it('ships a paid order from the header action', function (): void {
    [$store] = salesStore();
    $order = salesOrder($store, salesCustomer($store), salesProduct($store));

    alfakit()->testPage(EditOrder::class, ['record' => $order, 'tenant' => $store], 'vue')
        ->assertActionVisible('ship')
        ->callAction('ship', [
            'carrier' => 'DHL Express',
            'tracking_number' => 'JD000000001',
            'shipped_at' => now()->format('Y-m-d H:i'),
        ])
        ->assertHasNoActionErrors()
        ->assertNotified();

    $order->refresh();

    expect($order->status)->toBe(OrderStatus::Shipped)
        ->and($order->shipments()->count())->toBe(1)
        ->and($order->shipments()->first()?->status)->toBe(ShipmentStatus::InTransit)
        ->and(collect($order->timeline)->last()['status'])->toBe('shipped');
});

it('hides shipping and refunding when the policy says no', function (): void {
    [$store] = salesStore(StaffRole::Staff);
    $order = salesOrder($store, salesCustomer($store), salesProduct($store), OrderStatus::Pending);

    alfakit()->testPage(EditOrder::class, ['record' => $order, 'tenant' => $store], 'svelte')
        ->assertActionHidden('ship')
        ->assertActionHidden('refund');
});

it('refunds only after the password is confirmed', function (): void {
    [$store] = salesStore();
    $order = salesOrder($store, salesCustomer($store), salesProduct($store));
    $token = alfakit()->testPage(EditOrder::class, ['record' => $order, 'tenant' => $store], 'react')->getToken();

    $payload = ['token' => $token, 'component' => 'page', 'action' => 'refund', 'data' => ['amount' => 50, 'reason' => 'Bottle arrived chipped']];

    $this->postJson('/react/admin/_alfakit/actions', $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors('confirmPassword');

    $this->postJson('/react/admin/_alfakit/actions', [...$payload, 'confirmPassword' => 'password'])
        ->assertSuccessful();

    $order->refresh();

    expect($order->payments()->where('status', PaymentStatus::Refunded)->sum('amount'))->toEqual(50)
        ->and($order->status)->toBe(OrderStatus::Paid) // partial refund keeps the order
        ->and($order->paidTotal())->toBe((float) $order->total - 50.0);

    // The nested "refund in full" footer action closes the order.
    $this->postJson('/react/admin/_alfakit/actions', ['token' => $token, 'component' => 'page', 'action' => 'refund>refund_full', 'confirmPassword' => 'password'])
        ->assertSuccessful();

    expect($order->refresh()->status)->toBe(OrderStatus::Refunded)
        ->and($order->paidTotal())->toBe(0.0);
});

it('serves a printable invoice through a signed link only', function (): void {
    [$store] = salesStore();
    $order = salesOrder($store, salesCustomer($store), salesProduct($store));

    $url = EditOrder::invoiceUrl($order);

    $this->get($url)->assertOk()->assertSee($order->number)->assertSee('12 Pearl Street')->assertSee($store->name);
    $this->get(route('demo.invoice', ['order' => $order]))->assertForbidden();
});

it('records a payment and moves a pending order to paid', function (): void {
    [$store] = salesStore();
    $order = salesOrder($store, salesCustomer($store), salesProduct($store), OrderStatus::Pending);

    alfakit()->testPage(ManageOrderPayments::class, ['record' => $order, 'tenant' => $store], 'react')
        ->assertOk()
        ->callTableAction('create', null, [
            'method' => 'card',
            'amount' => (float) $order->total,
            'paid_at' => now()->format('Y-m-d H:i'),
            'reference' => 'PAY-NEW',
            'card_brand' => 'visa',
            'card_last_four' => '4242',
        ])
        ->assertHasNoActionErrors();

    expect($order->refresh()->status)->toBe(OrderStatus::Paid)
        ->and($order->payments()->count())->toBe(1);
});

it('shows the status timeline on the view page', function (): void {
    [$store] = salesStore();
    $order = salesOrder($store, salesCustomer($store), salesProduct($store));

    $page = alfakit()->testPage(ViewOrder::class, ['record' => $order, 'tenant' => $store], 'react')->assertOk();

    expect(json_encode($page->getProps('page.content')))->toContain('RepeatableEntry')->toContain($order->number);
});

it('renders the orders list right to left in Arabic', function (): void {
    [$store, $user] = salesStore();
    $user->update(['locale' => 'ar']);
    salesOrder($store, salesCustomer($store), salesProduct($store));

    $page = alfakit()->testPage(ListOrders::class, ['tenant' => $store], 'react')->assertOk();

    expect($page->getProps('alfakit.localization.direction'))->toBe('rtl')
        ->and(json_encode($page->getProps('page.content'), JSON_UNESCAPED_UNICODE))->toContain(__('sales.fields.number', [], 'ar'));
});
