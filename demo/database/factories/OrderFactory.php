<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    public function definition(): array
    {
        $subtotal = fake()->randomFloat(2, 45, 620);
        $shipping = $subtotal >= 120 ? 0 : 9.5;
        $tax = round($subtotal * 0.1, 2);
        $placed = fake()->dateTimeBetween('-12 months', 'now');

        return [
            'store_id' => Store::factory(),
            'customer_id' => Customer::factory(),
            'number' => 'MA-'.fake()->unique()->numberBetween(100000, 999999),
            'status' => fake()->randomElement(OrderStatus::cases()),
            'currency' => 'USD',
            'subtotal' => $subtotal,
            'discount_total' => 0,
            'shipping_total' => $shipping,
            'tax_total' => $tax,
            'total' => round($subtotal + $shipping + $tax, 2),
            'timeline' => [['status' => OrderStatus::Pending->value, 'at' => $placed->format(DATE_ATOM), 'note' => null]],
            'channel' => fake()->randomElement(['web', 'web', 'web', 'store', 'phone']),
            'placed_at' => $placed,
        ];
    }
}
