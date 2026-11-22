<?php

use App\Providers\AppServiceProvider;
use App\Providers\FortifyServiceProvider;

return [
    AppServiceProvider::class,
    FortifyServiceProvider::class,
    App\Providers\Alfakit\AdminPanelProvider::class,
    App\Providers\Alfakit\TeamPanelProvider::class,
    // The lean benchmark panel (/bench), see scripts/bench/big.mjs.
    App\Providers\Alfakit\BenchPanelProvider::class,
    App\Providers\Alfakit\PortalPanelProvider::class,
    // `unsavedChangesAlerts()` on a panel of its own (/alerts), for the browser tests.
    App\Providers\Alfakit\AlertsPanelProvider::class,
    App\Providers\AuthKitServiceProvider::class,
];
