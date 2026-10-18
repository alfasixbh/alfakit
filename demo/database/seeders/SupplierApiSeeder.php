<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Demo\SupplierApi;
use App\Models\Store;
use Illuminate\Database\Seeder;

/**
 * Re-seeds the fake supplier API's JSON file (not the database) for every store.
 */
class SupplierApiSeeder extends Seeder
{
    public function run(): void
    {
        SupplierApi::reset(Store::query()->pluck('slug')->all() ?: ['manama', 'dubai', 'london']);
    }
}
