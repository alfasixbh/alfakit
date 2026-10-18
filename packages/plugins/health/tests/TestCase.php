<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitHealth\Tests;

use AlfaSix\Alfakit\Tests\TestCase as AlfakitTestCase;
use AlfaSix\AlfakitHealth\AlfakitHealthServiceProvider;
use AlfaSix\AlfakitHealth\Tests\Fixtures\Panels\HealthPanelProvider;
use Spatie\Health\HealthServiceProvider;
use Spatie\Health\ResultStores\InMemoryHealthResultStore;

abstract class TestCase extends AlfakitTestCase
{
    protected function getPackageProviders($app): array
    {
        return [
            ...parent::getPackageProviders($app),
            HealthServiceProvider::class,
            AlfakitHealthServiceProvider::class,
            HealthPanelProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        parent::defineEnvironment($app);

        $app['config']->set('health.result_stores', [InMemoryHealthResultStore::class]);
        $app['config']->set('health.notifications.enabled', false);
    }
}
