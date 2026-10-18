<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitHealth\Widgets;

use AlfaSix\Alfakit\Widgets\StatsOverviewWidget;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget\Stat;
use AlfaSix\AlfakitHealth\HealthPlugin;
use AlfaSix\AlfakitHealth\Support\HealthResults;

/**
 * A dashboard card summarising the latest run: "All checks passed", or how many checks fail
 * (and which), linking to the health page. Added by `HealthPlugin::make()->dashboardWidget()`.
 */
class HealthStatusWidget extends StatsOverviewWidget
{
    protected static bool $isDiscovered = false;

    /** @var int|string|array<string, int|string|null> */
    protected int|string|array $columnSpan = 1;

    /** @var int|array<string, int|null>|null */
    protected int|array|null $columns = 1;

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
        $plugin = HealthPlugin::get();
        $page = $plugin->getPage();
        $label = (string) __('alfakit-health::health.widget.label');
        $rows = HealthResults::rows();

        $stat = match (true) {
            HealthResults::latest() === null || $rows === [] => Stat::make($label, (string) __('alfakit-health::health.widget.never_ran'))
                ->color('gray')
                ->icon('heart-pulse'),
            default => $this->makeSummaryStat($label, $rows),
        };

        if ($page::canAccess()) {
            $stat->url($page::getUrl());
        }

        return [$stat];
    }

    /**
     * @param  array<string, array{id: string, name: string, label: string, status: string, summary: string, message: string, meta: array<string, mixed>}>  $rows
     */
    protected function makeSummaryStat(string $label, array $rows): Stat
    {
        $failing = array_filter($rows, static fn (array $row): bool => in_array($row['status'], ['failed', 'crashed'], true));
        $warnings = array_filter($rows, static fn (array $row): bool => $row['status'] === 'warning');

        if ($failing !== []) {
            return Stat::make($label, trans_choice('alfakit-health::health.widget.failing', count($failing), ['count' => count($failing)]))
                ->description(implode(', ', array_column($failing, 'label')))
                ->color('danger')
                ->icon('circle-x');
        }

        if ($warnings !== []) {
            return Stat::make($label, trans_choice('alfakit-health::health.widget.warnings', count($warnings), ['count' => count($warnings)]))
                ->description(implode(', ', array_column($warnings, 'label')))
                ->color('warning')
                ->icon('triangle-alert');
        }

        return Stat::make($label, (string) __('alfakit-health::health.widget.ok'))
            ->color('success')
            ->icon('circle-check');
    }
}
