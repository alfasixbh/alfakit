<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitBackup\Tests;

use AlfaSix\Alfakit\Tests\TestCase as AlfakitTestCase;
use AlfaSix\AlfakitBackup\AlfakitBackupServiceProvider;
use AlfaSix\AlfakitBackup\Tests\Fixtures\Panels\BackupPanelProvider;
use Spatie\Backup\BackupServiceProvider;
use Spatie\Backup\Tasks\Monitor\HealthChecks\MaximumAgeInDays;

abstract class TestCase extends AlfakitTestCase
{
    protected function getPackageProviders($app): array
    {
        return [
            ...parent::getPackageProviders($app),
            BackupServiceProvider::class,
            AlfakitBackupServiceProvider::class,
            BackupPanelProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        parent::defineEnvironment($app);

        // Tests replace the disk with Storage::fake('backups'); no backup ever really runs.
        $app['config']->set('filesystems.disks.backups', ['driver' => 'local', 'root' => storage_path('framework/testing/disks/backups')]);
        $app['config']->set('backup.backup.name', 'alfakit-test');
        $app['config']->set('backup.backup.destination.disks', ['backups']);
        $app['config']->set('backup.monitor_backups', [[
            'name' => 'alfakit-test',
            'disks' => ['backups'],
            'health_checks' => [MaximumAgeInDays::class => 1],
        ]]);
        $app['config']->set('backup.notifications.notifications', []);
    }
}
