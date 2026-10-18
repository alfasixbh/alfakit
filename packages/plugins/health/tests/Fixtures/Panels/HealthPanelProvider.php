<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitHealth\Tests\Fixtures\Panels;

use AlfaSix\Alfakit\Pages\Dashboard;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;
use AlfaSix\AlfakitHealth\HealthPlugin;

class HealthPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->id('health')
            ->path('health-panel')
            ->login()
            ->middleware(['web'])
            ->pages([Dashboard::class])
            ->plugin(HealthPlugin::make()->navigationGroup('System')->navigationSort(9)->dashboardWidget());
    }
}
