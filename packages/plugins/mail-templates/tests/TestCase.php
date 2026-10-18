<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitMailTemplates\Tests;

use AlfaSix\Alfakit\Tests\TestCase as AlfakitTestCase;
use AlfaSix\AlfakitMailTemplates\AlfakitMailTemplatesServiceProvider;
use AlfaSix\AlfakitMailTemplates\Models\MailTemplate;
use RuntimeException;

abstract class TestCase extends AlfakitTestCase
{
    /**
     * The running test (Pest binds test closures to it).
     */
    public static function current(): static
    {
        $test = \Pest\TestSuite::getInstance()->test;

        if (! $test instanceof static) {
            throw new RuntimeException('No '.static::class.' is running.');
        }

        return $test;
    }

    protected function setUp(): void
    {
        parent::setUp();

        MailTemplate::flushVersionsTableCache();
    }

    protected function getPackageProviders($app): array
    {
        return [...parent::getPackageProviders($app), AlfakitMailTemplatesServiceProvider::class];
    }

    protected function defineDatabaseMigrations(): void
    {
        parent::defineDatabaseMigrations();

        $this->loadMigrationsFrom(dirname(__DIR__).'/database/migrations');
        $this->loadMigrationsFrom(dirname(__DIR__, 3).'/alfakit/database/migrations');
    }
}
