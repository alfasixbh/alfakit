<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * The customer portal (/portal): customer@example.com / password with a few orders, and
 * another customer whose orders the first one must never see.
 */
class PortalSeeder extends Seeder
{
    public function run(): void
    {
        $customer = $this->customer('customer@example.com', 'Casey Customer');
        $other = $this->customer('other.customer@example.com', 'Olivia Other');

        $this->orders($customer, [
            ['A-1001', 'delivered', 3, 12900, 42],
            ['A-1002', 'delivered', 1, 4500, 30],
            ['A-1003', 'shipped', 2, 8990, 6],
            ['A-1004', 'processing', 5, 23450, 1],
            ['A-1005', 'cancelled', 1, 1999, 18],
        ]);

        $this->orders($other, [
            ['B-2001', 'processing', 2, 15000, 2],
            ['B-2002', 'delivered', 1, 3300, 25],
        ]);
    }

    private function customer(string $email, string $name): User
    {
        $user = User::query()->firstOrNew(['email' => $email]);
        $user->forceFill([
            'name' => $name,
            'password' => $user->exists ? $user->password : Hash::make('password'),
            'email_verified_at' => $user->email_verified_at ?? now(),
            'is_customer' => true,
        ])->save();

        return $user;
    }

    /**
     * @param  array<int, array{0: string, 1: string, 2: int, 3: int, 4: int}>  $orders
     */
    private function orders(User $user, array $orders): void
    {
        foreach ($orders as [$number, $status, $items, $total, $daysAgo]) {
            Order::query()->updateOrCreate(['number' => $number], [
                'user_id' => $user->id,
                'status' => $status,
                'items_count' => $items,
                'total' => $total,
                'currency' => 'USD',
                'placed_at' => now()->subDays($daysAgo),
            ]);
        }
    }
}
