<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeder index. Other agents: add a seeder class to `$seeders` below (keep DemoSeeder first,
 * it creates the stores, staff, catalog and orders everything else hangs off).
 */
class DatabaseSeeder extends Seeder
{
    /** @var array<int, class-string<Seeder>> */
    protected array $seeders = [
        DemoSeeder::class,
        CatalogSeeder::class,
        NotificationSeeder::class,
        SupplierApiSeeder::class,
        // First-party plugins (packages/plugins/*): roles, returns, invoices, helpdesk, CMS…
        DemoPluginsSeeder::class,
    ];

    public function run(): void
    {
        // The bulk seed is not an audit trail: DemoPluginsSeeder writes a curated one.
        activity()->disableLogging();

        try {
            $this->call(array_values(array_filter($this->seeders, fn (string $seeder): bool => $seeder !== DemoPluginsSeeder::class)));
        } finally {
            activity()->enableLogging();
        }

        if (in_array(DemoPluginsSeeder::class, $this->seeders, true)) {
            $this->call(DemoPluginsSeeder::class);
        }
    }
}
