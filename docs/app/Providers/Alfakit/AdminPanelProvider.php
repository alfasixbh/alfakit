<?php

declare(strict_types=1);

namespace App\Providers\Alfakit;

use AlfaSix\Alfakit\Pages\Dashboard;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;
use AlfaSix\AlfakitAnalytics\AnalyticsPlugin;
use AlfaSix\AlfakitForms\FormsPlugin;
use AlfaSix\AlfakitHelpdesk\HelpdeskPlugin;
use App\Support\Site\Dogfood;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            ->passwordReset()
            ->profile()
            ->brandName('AlfaKit')
            ->brandLogo('/brand/alfakit-wordmark-color.svg')
            ->darkModeBrandLogo('/brand/alfakit-wordmark-reverse.svg')
            ->brandLogoHeight('2.25rem')
            ->favicon('/icons/favicon.svg')
            ->theme('alfakit')
            ->discoverResources(in: app_path('Alfakit/Resources'), for: 'App\\Alfakit\\Resources')
            ->discoverPages(in: app_path('Alfakit/Pages'), for: 'App\\Alfakit\\Pages')
            ->pages([
                Dashboard::class,
            ])
            ->discoverWidgets(in: app_path('Alfakit/Widgets'), for: 'App\\Alfakit\\Widgets')
            ->widgets([
                //
            ])
            ->middleware([
                'web',
            ])
            ->databaseNotifications()
            // The AlfaKit plugins the website runs on, when turned on (config docs.dogfood).
            ->plugins(array_values(array_filter([
                Dogfood::enabled('forms') ? FormsPlugin::make()->navigationGroup('Website') : null,
                Dogfood::enabled('analytics') ? AnalyticsPlugin::make()->navigationGroup('Website') : null,
                Dogfood::enabled('helpdesk') ? HelpdeskPlugin::make()->navigationGroup('Website') : null,
            ])));
    }
}
