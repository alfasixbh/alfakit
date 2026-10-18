<?php

declare(strict_types=1);

namespace App\Demo;

use AlfaSix\AlfakitAnalytics\Models\Site as AnalyticsSite;
use AlfaSix\AlfakitCms\CmsPlugin;
use AlfaSix\AlfakitCms\Support\Menus;
use AlfaSix\AlfakitCms\Support\Site;
use App\Features\NewCheckout;
use App\Features\StorefrontLiveChat;
use App\Features\WholesaleEnquiries;
use App\Models\Store;
use App\Settings\MaisonSettings;
use Illuminate\Http\Request;
use Laravel\Pennant\Feature;
use Throwable;

/**
 * What the storefront layouts need from the plugins, shared as the `plugins` prop: the
 * analytics site key, the live chat (a feature flag per store), the CMS menu of the
 * renderer's site, the house announcement (settings) and the flagged links.
 */
final class StorefrontPlugins
{
    /** The CMS site of a storefront renderer: that panel's plugin, the shop's store. */
    public static function cmsSite(string $renderer, ?string $locale = null): ?Site
    {
        $store = Shop::store();

        if ($store === null || ! alfakit()->hasPanel($renderer)) {
            return null;
        }

        $panel = alfakit()->getPanel($renderer);
        $plugin = $panel->hasPlugin(CmsPlugin::ID) ? $panel->getPlugin(CmsPlugin::ID) : null;

        return $plugin instanceof CmsPlugin ? new Site($panel, $plugin, $store, $locale ?? $plugin->getDefaultLocale()) : null;
    }

    public static function active(string $feature, ?Store $store = null): bool
    {
        $store ??= Shop::store();

        try {
            return $store !== null && Feature::for($store)->active($feature);
        } catch (Throwable) {
            return false;
        }
    }

    /** @return array<string, mixed> */
    public static function shared(Request $request): array
    {
        $store = Shop::store();
        $renderer = Renderer::current($request);
        $locale = app()->getLocale() === 'ar' ? 'ar' : 'en';
        $site = self::cmsSite($renderer, $locale);
        $menu = null;

        if ($site !== null) {
            try {
                $menu = Menus::resolveMany(['main'], $site, '/'.ltrim($request->path(), '/'))['main'] ?? null;
            } catch (Throwable) {
                $menu = null;
            }
        }

        $settings = null;

        try {
            $settings = app(MaisonSettings::class);
        } catch (Throwable) {
            $settings = null;
        }

        $analytics = $store === null ? null : AnalyticsSite::query()
            ->where('tenant_type', $store->getMorphClass())
            ->where('tenant_id', (string) $store->getKey())
            ->where('is_active', true)
            ->value('key');

        return [
            'analyticsKey' => $analytics,
            'chat' => self::active(StorefrontLiveChat::class, $store),
            'newCheckout' => self::active(NewCheckout::class, $store),
            'wholesale' => self::active(WholesaleEnquiries::class, $store),
            'announcement' => $settings?->storefront_announcement,
            'menu' => is_array($menu) ? $menu['items'] : [],
            'links' => [
                'wholesale' => '/'.$renderer.'/wholesale',
                'support' => '/support/contact',
            ],
            'copy' => __('plugins.storefront'),
        ];
    }
}
