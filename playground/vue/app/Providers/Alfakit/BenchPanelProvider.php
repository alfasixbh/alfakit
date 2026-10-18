<?php

declare(strict_types=1);

namespace App\Providers\Alfakit;

use AlfaSix\Alfakit\Pages\Dashboard;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;
use App\Alfakit\Resources\Benchmark\BenchBigRecordResource;
use App\Alfakit\Resources\Benchmark\BenchmarkRecordResource;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\AuthenticateSession;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

/**
 * The lean benchmark panel (/bench): only the benchmark resources, no plugins, and the same
 * middleware as a fresh Filament panel (benchmarks/filament-app), so scripts/bench/big.mjs
 * can compare the two like for like. The admin panel serves the same resources with every
 * playground plugin, its navigation and the `web` group.
 */
class BenchPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->id('bench')
            ->path('bench')
            ->login()
            ->brandName('AlfaKit Bench')
            ->resources([
                BenchBigRecordResource::class,
                BenchmarkRecordResource::class,
            ])
            ->pages([Dashboard::class])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                PreventRequestForgery::class,
                SubstituteBindings::class,
            ]);
    }
}
