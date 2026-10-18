<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitHealth\Widgets;

use AlfaSix\Alfakit\Widgets\StatsOverviewWidget;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget\Stat;
use AlfaSix\AlfakitHealth\HealthPlugin;
use AlfaSix\AlfakitHealth\Support\HealthResults;

/**
 * One card per check of the latest run: the check's label, its short summary (or status),
 * the message and a status colour and icon. Shown on the health page.
 */
class HealthCheckResultsWidget extends StatsOverviewWidget
{
    protected static bool $isDiscovered = false;

    protected static bool $isLazy = false;

    /** @var int|array<string, int|null>|null */
    protected int|array|null $columns = ['default' => 1, 'sm' => 2, 'xl' => 3];

    public static function canView(): bool
    {
        return HealthPlugin::get()->isAuthorized();
    }

    protected function getPollingInterval(): ?string
    {
        return HealthPlugin::get()->getPollingInterval();
    }

    protected function getStats(): array
    {
        $stats = [];

        foreach (HealthResults::rows() as $row) {
            $stats[] = Stat::make($row['label'], $row['summary'] !== '' ? $row['summary'] : HealthResults::statusLabel($row['status']))
                ->description($row['message'] !== '' ? $row['message'] : HealthResults::statusLabel($row['status']))
                ->descriptionIcon(HealthResults::statusIcon($row['status']))
                ->descriptionColor(HealthResults::statusColor($row['status']))
                ->color(HealthResults::statusColor($row['status']))
                ->icon(HealthResults::statusIcon($row['status']));
        }

        return $stats;
    }
}
