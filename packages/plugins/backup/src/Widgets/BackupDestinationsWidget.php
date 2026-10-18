<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitBackup\Widgets;

use AlfaSix\Alfakit\Widgets\StatsOverviewWidget;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget\Stat;
use AlfaSix\AlfakitBackup\BackupPlugin;
use AlfaSix\AlfakitBackup\Support\BackupRepository;
use Illuminate\Support\Number;
use Spatie\Backup\Tasks\Monitor\BackupDestinationStatus;

/**
 * One card per backup destination: healthy, unhealthy or unreachable, with the number of
 * backups, the storage they use and the age of the newest one.
 */
class BackupDestinationsWidget extends StatsOverviewWidget
{
    protected static bool $isDiscovered = false;

    public static function canView(): bool
    {
        return BackupPlugin::get()->isAuthorized();
    }

    protected function getHeading(): ?string
    {
        return (string) __('alfakit-backup::backup.destinations.heading');
    }

    protected function getPollingInterval(): ?string
    {
        return BackupPlugin::get()->getPollingInterval();
    }

    protected function getStats(): array
    {
        return BackupRepository::statuses()
            ->map(fn (BackupDestinationStatus $status): Stat => $this->makeStat($status))
            ->all();
    }

    protected function makeStat(BackupDestinationStatus $status): Stat
    {
        $destination = $status->backupDestination();
        $label = (string) __('alfakit-backup::backup.destinations.label', ['name' => $destination->backupName(), 'disk' => $destination->diskName()]);

        if (! $destination->isReachable()) {
            return Stat::make($label, (string) __('alfakit-backup::backup.destinations.unreachable'))
                ->description($destination->connectionError()?->getMessage())
                ->color('danger')
                ->icon('cloud-off');
        }

        $healthy = $status->isHealthy();
        $backups = $destination->backups();
        $newest = $backups->newest();

        $description = trans_choice('alfakit-backup::backup.destinations.summary', $backups->count(), [
            'count' => $backups->count(),
            'size' => Number::fileSize($backups->size(), precision: 2),
            'newest' => $newest?->date()->diffForHumans() ?? '',
        ]);

        $failures = $status->getHealthCheckFailures()
            ->map(static fn ($failure): string => $failure->exception()->getMessage())
            ->implode(' ');

        return Stat::make($label, (string) __('alfakit-backup::backup.destinations.'.($healthy ? 'healthy' : 'unhealthy')))
            ->description(trim($description.($failures !== '' ? ' — '.$failures : '')))
            ->color($healthy ? 'success' : 'danger')
            ->icon($healthy ? 'shield-check' : 'shield-alert');
    }
}
