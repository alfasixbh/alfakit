<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Clusters;

use AlfaSix\Alfakit\Clusters\Cluster;

/**
 * Groups the feature showcase pages under one navigation item (and verifies clusters + sub-navigation).
 */
class Showcase extends Cluster
{
    protected static ?string $navigationIcon = 'flask-conical';

    protected static ?int $navigationSort = 80;

    public static function getNavigationLabel(): string
    {
        return __('playground.nav.showcase');
    }
}
