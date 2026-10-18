<?php

declare(strict_types=1);

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\StaffRole;
use App\Models\Address;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;

/*
 * Fixtures shared by the sales-area tests: a store, a manager signed in to it, a customer
 * with a default address, an active product and a paid order with one line and a payment.
 */

if (! function_exists('salesStore')) {
    /** @return array{0: Store, 1: User} */
    function salesStore(StaffRole $role = StaffRole::Manager): array
    {
        $store = Store::factory()->create();
        $user = User::factory()->create(['password' => 'password']);
        $user->stores()->attach($store, ['role' => $role->value]);

        test()->actingAs($user);

        return [$store, $user];
    }
}

if (! function_exists('salesCustomer')) {
    function salesCustomer(Store $store): Customer
    {
        $customer = Customer::factory()->create(['store_id' => $store->id, 'first_name' => 'Noor', 'last_name' => 'Haddad', 'email' => 'noor@example.com']);

        Address::query()->create([
            'customer_id' => $customer->id,
            'label' => 'Home',
            'type' => 'shipping',
            'recipient' => 'Noor Haddad',
            'line1' => '12 Pearl Street',
            'city' => 'Manama',
            'state' => 'Capital',
            'postal_code' => '317',
            'country' => 'BH',
            'phone' => '+97336000000',
            'is_default' => true,
        ]);

        return $customer;
    }
}

if (! function_exists('salesProduct')) {
    function salesProduct(Store $store, float $price = 80): Product
    {
        return Product::factory()->active()->create(['store_id' => $store->id, 'price' => $price, 'stock' => 20]);
    }
}

if (! function_exists('salesOrder')) {
    function salesOrder(Store $store, Customer $customer, Product $product, OrderStatus $status = OrderStatus::Paid, int $quantity = 2): Order
    {
        $subtotal = round((float) $product->price * $quantity, 2);
        $tax = round($subtotal * 0.1, 2);

        $order = Order::factory()->create([
            'store_id' => $store->id,
            'customer_id' => $customer->id,
            'number' => 'MA-TST-00001',
            'status' => $status,
            'subtotal' => $subtotal,
            'shipping_total' => 0,
            'tax_total' => $tax,
            'total' => round($subtotal + $tax, 2),
            'shipping_address' => $customer->defaultAddress?->toSnapshot(),
            'billing_address' => $customer->defaultAddress?->toSnapshot(),
            'placed_at' => now()->subDay(),
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'quantity' => $quantity,
            'unit_price' => $product->price,
            'total' => $subtotal,
        ]);

        if ($status !== OrderStatus::Pending) {
            $order->payments()->create([
                'method' => PaymentMethod::Card,
                'status' => PaymentStatus::Captured,
                'amount' => $order->total,
                'currency' => 'USD',
                'reference' => 'PAY-TEST',
                'card_brand' => 'visa',
                'card_last_four' => '4242',
                'paid_at' => now()->subDay(),
            ]);
        }

        return $order->fresh();
    }
}
