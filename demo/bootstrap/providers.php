<?php

declare(strict_types=1);
use App\Providers\Alfakit\ReactPanelProvider;
use App\Providers\Alfakit\SveltePanelProvider;
use App\Providers\Alfakit\VuePanelProvider;
use App\Providers\AppServiceProvider;
use App\Providers\PlatformServiceProvider;

return [
    AppServiceProvider::class,
    PlatformServiceProvider::class,
    ReactPanelProvider::class,
    VuePanelProvider::class,
    SveltePanelProvider::class,
];
