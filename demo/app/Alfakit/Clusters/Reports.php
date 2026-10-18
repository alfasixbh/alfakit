<?php

declare(strict_types=1);

namespace App\Alfakit\Clusters;

use AlfaSix\Alfakit\Clusters\Cluster;
use AlfaSix\Alfakit\Navigation\SubNavigationPosition;
use App\Demo\Nav;

/**
 * Sales, inventory and customers reports under one navigation item; the pages appear as
 * sub-navigation at the top of each report (`App\Alfakit\Pages\Reports\*`).
 */
class Reports extends Cluster
{
    protected static ?string $navigationIcon = 'demo::reports';

    protected static ?int $navigationSort = 10;

    protected static ?SubNavigationPosition $subNavigationPosition = SubNavigationPosition::Top;

    public static function getNavigationLabel(): string
    {
        return __('platform.reports.cluster');
    }

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::REPORTS);
    }
}
