<?php

declare(strict_types=1);

namespace App\Providers\Alfakit;

use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;
use App\Demo\DemoPanel;

/**
 * The Svelte panel at /svelte/admin. See App\Demo\DemoPanel for the shared configuration.
 */
class SveltePanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return DemoPanel::configure($panel, 'svelte');
    }
}
