<?php

declare(strict_types=1);

namespace App\Providers\Alfakit;

use AlfaSix\Alfakit\Pages\Dashboard;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;
use App\Alfakit\Resources\Benchmark\BenchmarkRecordResource;
use App\Alfakit\Resources\TagResource;

/**
 * A small panel (/alerts) with `unsavedChangesAlerts()` on: leaving a form that has unsaved
 * changes asks first. The admin panel leaves it off, so the browser tests of its forms are
 * not interrupted by the question; this panel is where the e2e suite exercises it.
 */
class AlertsPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->id('alerts')
            ->path('alerts')
            ->login()
            // A resource with create and edit pages (page forms) and one with modal forms.
            ->resources([BenchmarkRecordResource::class, TagResource::class])
            ->pages([Dashboard::class])
            ->unsavedChangesAlerts()
            ->brandName('AlfaKit Alerts')
            ->theme('alfakit')
            ->middleware(['web']);
    }
}
