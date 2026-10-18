<?php

namespace App\Examples;

/**
 * Sample rows for the live examples, so they run without a database.
 */
class Fixtures
{
    /**
     * @return list<array{id: int, number: string, customer: string, status: string, total: float, gift: bool, placed_at: string}>
     */
    public static function orders(): array
    {
        $customers = ['Layla Haddad', 'Tom Becker', 'Yuki Tanaka', 'Omar Farouk', 'Sofia Rossi', 'Lucas Martin', 'Amira Saleh', 'Noah Jansen'];
        $statuses = ['paid', 'pending', 'paid', 'refunded', 'paid', 'pending', 'paid', 'paid'];
        $rows = [];

        foreach ($customers as $index => $customer) {
            $rows[] = [
                'id' => $index + 1,
                'number' => sprintf('AK-%04d', 1040 + $index),
                'customer' => $customer,
                'status' => $statuses[$index],
                'total' => round(39 + $index * 17.5, 2),
                'gift' => $index % 3 === 0,
                'placed_at' => '2026-10-'.str_pad((string) (2 + $index), 2, '0', STR_PAD_LEFT),
            ];
        }

        return $rows;
    }
}
