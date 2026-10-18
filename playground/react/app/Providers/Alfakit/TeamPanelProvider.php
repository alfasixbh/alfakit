<?php

declare(strict_types=1);

namespace App\Providers\Alfakit;

use AlfaSix\Alfakit\Pages\Dashboard;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;
use AlfaSix\AlfakitTeams\TeamsPlugin;

/**
 * alfasix/alfakit-teams on its own panel (/team): the plugin turns on multi-tenancy (the
 * team is the tenant), which the admin panel doesn't use. Sign in with the seeded users;
 * each has a personal team, and the admin also owns "Playground HQ".
 */
class TeamPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->id('team')
            ->plugin(TeamsPlugin::make()->personalTeams())
            ->path('team')
            ->login()
            ->pages([Dashboard::class])
            ->brandName('AlfaKit Teams')
            ->brandLogo('/brand/alfakit-wordmark-color.svg')
            ->darkModeBrandLogo('/brand/alfakit-wordmark-reverse.svg')
            ->brandLogoHeight('2.25rem')
            ->favicon('/icons/favicon.svg')
            ->theme('alfakit')
            ->middleware(['web']);
    }
}
