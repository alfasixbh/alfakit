<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use AlfaSix\Alfakit\Support\Credit;
use App\Alfakit\Standalone\NewsletterForm;
use App\Demo\DemoPanel;
use App\Demo\Renderer;
use App\Demo\Storefront;
use App\Demo\StorefrontPlugins;
use Illuminate\Http\Request;
use Inertia\Middleware;

/**
 * Storefront pages (outside the panels). Panel pages use AlfaKit's own middleware and root view.
 */
class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'storefront.app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'renderer' => Renderer::current($request),
            'locale' => fn (): string => app()->getLocale(),
            'storefront' => fn (): array => [
                'brand' => __('demo.storefront.title'),
                'tagline' => __('demo.tagline'),
                'demo' => __('demo.meta.site'),
                'switcherLabel' => __('demo.switcher.label'),
                'nav' => __('demo.storefront.nav'),
                'footer' => __('demo.storefront.footer'),
                'renderers' => Renderer::links($request),
                'adminUrl' => '/'.Renderer::current($request).'/admin',
                'docsUrl' => DemoPanel::docsUrl(),
                // The shop's own pages show the panels' "Developed by Alfa Six" line. The plugin
                // pages (CMS, public forms, helpdesk portal) stand for what an app shows its
                // customers: the opt-in "Powered by AlfaKit · Alfa Six" line, turned on for the
                // demo in config/alfakit.php (`credit.public_pages`).
                'credit' => ($request->routeIs('storefront.*.page', 'alfakit-cms.*', 'alfakit-forms.*', 'alfakit-helpdesk.*') ? Credit::poweredByWhen() : null) ?? Credit::html(),
                'locales' => Storefront::locales($request),
                'localeLabel' => __('shop.locale.label'),
                'strip' => __('shop.strip'),
                'newsletter' => __('shop.newsletter'),
            ],
            // First-party plugins on the storefront: chat, analytics, CMS menu, announcement.
            'plugins' => fn (): ?array => $request->routeIs('storefront.*', 'alfakit-helpdesk.*', 'alfakit-forms.*', 'alfakit-cms.*') ? StorefrontPlugins::shared($request) : null,
            // The footer newsletter form, on storefront pages only (panels have their own chrome).
            'newsletter' => fn (): ?NewsletterForm => $request->routeIs('storefront.*') ? NewsletterForm::make() : null,
        ];
    }
}
