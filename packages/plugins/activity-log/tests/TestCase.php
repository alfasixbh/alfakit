<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Tests;

use AlfaSix\Alfakit\Tests\TestCase as AlfakitTestCase;
use AlfaSix\AlfakitActivityLog\AlfakitActivityLogServiceProvider;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Panels\ActivityLogPanelProvider;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Panels\ActivityLogTenantPanelProvider;
use Spatie\Activitylog\ActivitylogServiceProvider;

abstract class TestCase extends AlfakitTestCase
{
    protected function getPackageProviders($app): array
    {
        return [
            ...parent::getPackageProviders($app),
            ActivitylogServiceProvider::class,
            AlfakitActivityLogServiceProvider::class,
            ActivityLogPanelProvider::class,
            ActivityLogTenantPanelProvider::class,
        ];
    }

    protected function defineDatabaseMigrations(): void
    {
        parent::defineDatabaseMigrations();

        $this->loadMigrationsFrom(__DIR__.'/Fixtures/database/migrations');
    }
}
