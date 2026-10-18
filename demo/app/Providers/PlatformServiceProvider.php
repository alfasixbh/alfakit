<?php

declare(strict_types=1);

namespace App\Providers;

use AlfaSix\Alfakit\Support\Icons;
use App\Models\Store;
use App\Policies\TenantPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

/**
 * Platform area of the demo: the brand's own icon names and the tenant policy.
 *
 * Icon aliases are resolved on the server, so a page can say `demo::bottle` and every
 * renderer receives the Lucide name it maps to. The same mechanism replaces AlfaKit's own
 * icons (`alfakit::*`), a few of which are swapped here to show it.
 */
class PlatformServiceProvider extends ServiceProvider
{
    /** @var array<string, string> alias => Lucide icon */
    public const ICONS = [
        // Maison Alfa's vocabulary, used by navigation, widgets and notifications.
        'demo::overview' => 'layout-dashboard',
        'demo::bottle' => 'spray-can',
        'demo::store' => 'store',
        'demo::staff' => 'users-round',
        'demo::revenue' => 'banknote',
        'demo::reports' => 'chart-column',
        'demo::inventory' => 'boxes',
        'demo::customers' => 'contact',
        'demo::settings' => 'settings-2',
        'demo::notifications' => 'bell',
        'demo::billing' => 'credit-card',
        'demo::security' => 'shield-check',

        // AlfaKit's own aliases, replaced for the whole panel.
        'alfakit::notifications.success' => 'badge-check',
        'alfakit::tables.empty-state' => 'package-search',
        'alfakit::schemas.empty-state' => 'package-search',
    ];

    public function boot(): void
    {
        Icons::register(self::ICONS);

        // `App\Policies\StorePolicy` is the abstract ladder shared by the sales policies, so
        // the tenant model gets its policy explicitly instead of by naming convention.
        Gate::policy(Store::class, TenantPolicy::class);
    }
}
