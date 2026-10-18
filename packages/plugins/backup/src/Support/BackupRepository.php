<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitBackup\Support;

use Illuminate\Support\Collection;
use Spatie\Backup\BackupDestination\Backup;
use Spatie\Backup\BackupDestination\BackupDestination;
use Spatie\Backup\Config\Config;
use Spatie\Backup\Tasks\Monitor\BackupDestinationStatus;
use Spatie\Backup\Tasks\Monitor\BackupDestinationStatusFactory;

/**
 * Reads backups and destination health from the spatie/laravel-backup configuration:
 * the backup's own destination disks (`backup.backup.destination.disks`) and the monitored
 * backups (`backup.monitor_backups`) with their health checks.
 */
final class BackupRepository
{
    /**
     * One status per destination: every monitored backup, plus the application's own
     * destination disks that aren't monitored (checked for reachability only).
     *
     * @return Collection<int, BackupDestinationStatus>
     */
    public static function statuses(): Collection
    {
        $config = app(Config::class);
        $statuses = BackupDestinationStatusFactory::createForMonitorConfig($config->monitoredBackups)->values();

        $monitored = $statuses
            ->map(static fn (BackupDestinationStatus $status): string => $status->backupDestination()->backupName().'|'.$status->backupDestination()->diskName())
            ->all();

        foreach ($config->backup->destination->disks as $disk) {
            if (! in_array($config->backup->name.'|'.$disk, $monitored, true)) {
                $statuses->push(new BackupDestinationStatus(BackupDestination::create($disk, $config->backup->name)));
            }
        }

        return $statuses;
    }

    /**
     * The application's backup destinations (`backup.backup.destination.disks`).
     *
     * @return array<string, BackupDestination>
     */
    public static function destinations(): array
    {
        $config = app(Config::class);
        $destinations = [];

        foreach ($config->backup->destination->disks as $disk) {
            $destinations[$disk] = BackupDestination::create($disk, $config->backup->name);
        }

        return $destinations;
    }

    /**
     * The backups on every reachable destination, newest first, keyed by `key()`.
     *
     * @return array<string, array{id: string, name: string, path: string, disk: string, date: string, size: int}>
     */
    public static function backups(): array
    {
        $rows = [];

        foreach (self::destinations() as $disk => $destination) {
            if (! $destination->isReachable()) {
                continue;
            }

            foreach ($destination->backups() as $backup) {
                $key = self::key($disk, $backup->path());

                $rows[$key] = [
                    'id' => $key,
                    'name' => basename($backup->path()),
                    'path' => $backup->path(),
                    'disk' => $disk,
                    'date' => $backup->date()->toDateTimeString(),
                    'size' => (int) $backup->sizeInBytes(),
                ];
            }
        }

        uasort($rows, static fn (array $a, array $b): int => strcmp($b['date'], $a['date']));

        return $rows;
    }

    /**
     * The backup at `$path` on `$disk`, only when it is one of the listed backups (so no
     * other file of the disk can be downloaded or deleted).
     */
    public static function find(string $disk, string $path): ?Backup
    {
        $destination = self::destinations()[$disk] ?? null;

        if ($destination === null || ! $destination->isReachable()) {
            return null;
        }

        return $destination->backups()->first(static fn (Backup $backup): bool => $backup->path() === $path);
    }

    public static function key(string $disk, string $path): string
    {
        return substr(hash('sha256', $disk.'|'.$path), 0, 20);
    }
}
