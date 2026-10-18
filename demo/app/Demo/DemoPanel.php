<?php

declare(strict_types=1);

namespace App\Demo;

use AlfaSix\Alfakit\Auth\MultiFactor\App\AppAuthentication;
use AlfaSix\Alfakit\Auth\MultiFactor\Email\EmailAuthentication;
use AlfaSix\Alfakit\Auth\Pages\Login;
use AlfaSix\Alfakit\Navigation\MenuItem;
use AlfaSix\Alfakit\Navigation\NavigationGroup;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\Theming\Slot;
use AlfaSix\Alfakit\Theming\Themes;
use App\Alfakit\Auth\EditProfile;
use App\Alfakit\Billing\DemoBillingProvider;
use App\Alfakit\Pages\Dashboard;
use App\Alfakit\Tenancy\EditStore;
use App\Alfakit\Tenancy\RegisterStore;
use App\Enums\StaffRole;
use App\Models\Store;
use App\Models\User;

/**
 * One configuration for the three demo panels. The React, Vue and Svelte panels differ only
 * by id, path and Vite entries; everything else (resources, pages, widgets, clusters, slots,
 * tenancy, localization) is identical, so a feature added here appears in all three.
 *
 * Other agents: add resources, pages, widgets and clusters under app/Alfakit/* (discovered
 * below), register navigation groups in `Nav`, and only touch this file for panel-wide options.
 */
final class DemoPanel
{
    public const SESSION_THEME = 'demo.theme';

    public const SESSION_MOBILE = 'demo.mobile';

    /** The public documentation, from `demo.site_url` (`ALFAKIT_SITE_URL`). */
    public static function docsUrl(string $path = ''): string
    {
        return config('demo.site_url').'/docs'.($path === '' ? '' : '/'.ltrim($path, '/'));
    }

    public static function configure(Panel $panel, string $renderer): Panel
    {
        $extension = $renderer === 'react' ? 'tsx' : 'ts';

        $panel
            ->id($renderer)
            ->path($renderer.'/admin')
            ->default($renderer === Renderer::DEFAULT)
            ->viteTheme(["resources/css/{$renderer}.css", "resources/js/{$renderer}/app.{$extension}"])

            // Authentication: login and profile; no password reset (the demo sends no mail).
            ->login()
            // Navigation badge counts load after the page, so they never slow down a visit.
            ->deferNavigationBadges()
            ->passwordReset(false)
            // The shared demo account can't change its e-mail, password or second factors.
            ->profile(EditProfile::class)
            // Second factors (authenticator app with recovery codes, or codes by email) are set
            // up on the profile page; the challenge page may trust a browser for 30 days.
            ->multiFactorAuthentication([
                AppAuthentication::make()->brandName('Maison Alfa')->recoverable(),
                EmailAuthentication::make(),
            ])
            ->multiFactorAuthenticationRememberDevice(30)
            ->emailChangeVerification()
            ->userName(fn (User $user): string => $user->name)
            ->userMenuItems([
                MenuItem::make()->label(fn (): string => __('demo.footer.docs'))->icon('book-open')->url(self::docsUrl(), shouldOpenInNewTab: true),
            ])

            // Branding: the AlfaKit brand kit (copied to public/brand and public/icons).
            ->brandName(fn (): string => __('demo.brand').' · '.__('demo.meta.site'))
            ->brandLogo('/brand/alfakit-wordmark-color.svg')
            ->darkModeBrandLogo('/brand/alfakit-wordmark-reverse.svg')
            ->brandLogoHeight('2rem')
            ->favicon('/icons/favicon.svg')
            // The `alfakit` theme already uses Alfa Navy (light) and Fox Orange (dark) as primary;
            // a fixed primary here would override dark mode and every other theme in the picker.
            // `secondary` only feeds `--alfakit-secondary`, the orange accent of the demo slots.
            ->colors([
                'secondary' => '#F47A22',
            ])

            // Design: any built-in theme from the top bar switcher; the mobile preset toggles the
            // bottom navigation on phones from a session flag (see routes/web.php).
            ->theme(fn (): string => self::theme())
            ->design(
                // Layout per role: owners (and guests) get the sidebar, managers and staff the
                // top bar, unless the Theming showcase has pinned a layout for the session.
                layout: fn (?User $user, ?Store $tenant): string => Design::value('layout')
                    ?? ($user === null || $tenant === null || $user->roleIn($tenant) === StaffRole::Owner ? 'sidebar' : 'topbar'),
                nav: fn (): ?string => Design::value('nav'),
                header: fn (): ?string => Design::value('header'),
                surfaces: fn (): ?string => Design::value('surfaces'),
                inputs: fn (): ?string => Design::value('inputs'),
                buttons: fn (): ?string => Design::value('buttons'),
                tables: fn (): ?string => Design::value('tables'),
                mobile: fn (): string => session(self::SESSION_MOBILE, false) ? 'bottom' : 'drawer',
            )
            ->density(fn (): ?string => Design::density())
            ->sidebarCollapsibleOnDesktop()
            ->collapsibleNavigationGroups()
            ->breadcrumbs()
            ->unsavedChangesAlerts()

            // Localization: the 13 AlfaKit locales (Arabic and Persian right to left); demo copy in lang/.
            // (the 13 panel locales and the language switcher are set in DemoPlugins)
            ->localeSwitcher()
            ->persistLocaleUsing(fn (User $user, string $locale) => $user->update(['locale' => $locale]))
            ->currency('USD')
            ->timezone(fn (): string => alfakit()->getTenant()?->getAttribute('timezone') ?? 'Asia/Bahrain')
            ->frontendTranslations(['demo', 'showcase'])

            // Multi-tenancy: a store per URL segment, switcher in the sidebar.
            ->tenant(Store::class, slugAttribute: 'slug', ownershipRelationship: 'store')
            ->tenantMenu()
            ->tenantUploadDirectory()
            // "Open a new store", "Store profile" and "Billing" in the store menu. Billing only
            // adds the menu entry and its page: no subscription is required to use the panel.
            ->tenantRegistration(RegisterStore::class)
            ->tenantProfile(EditStore::class)
            ->tenantBillingProvider(new DemoBillingProvider)
            ->requiresTenantSubscription(false)

            // Platform features.
            ->databaseNotifications()
            // Installable app: manifest, service worker, offline page and the "Install app" menu item.
            ->pwa(icons: [
                '192x192' => '/icons/icon-192.png',
                '512x512' => '/icons/icon-512.png',
                ['src' => '/icons/maskable-512.png', 'sizes' => '512x512', 'purpose' => 'maskable'],
            ], themeColor: 'oklch(0.359 0.116 256.3)')
            ->databaseTransactions()
            ->errorNotifications()
            ->strictAuthorization(false)
            ->globalSearch()
            ->debugPanel(false)
            ->spa()

            // Components shared by the three panels.
            ->discoverResources(in: app_path('Alfakit/Resources'), for: 'App\\Alfakit\\Resources')
            ->discoverPages(in: app_path('Alfakit/Pages'), for: 'App\\Alfakit\\Pages')
            ->discoverWidgets(in: app_path('Alfakit/Widgets'), for: 'App\\Alfakit\\Widgets')
            ->discoverClusters(in: app_path('Alfakit/Clusters'), for: 'App\\Alfakit\\Clusters')
            ->pages([
                Dashboard::class,
            ])
            ->navigationGroups(self::navigationGroups())

            // Demo chrome: renderer and design switchers, login hint, reset note.
            ->slot(Slot::TOPBAR_END, fn () => view('demo.slots.renderer-switcher', ['links' => Renderer::links()]))
            ->slot(Slot::TOPBAR_END, fn () => view('demo.slots.design-switcher', [
                'themes' => Themes::all(),
                'theme' => self::theme(),
                'mobile' => (bool) session(self::SESSION_MOBILE, false),
            ]))
            ->slot(Slot::SIDEBAR_FOOTER, fn () => view('demo.slots.reset-note', ['docs' => self::docsUrl()]))
            ->slot(Slot::PAGE_HEADER_BEFORE, fn () => Tour::banner(), scopes: Tour::scopes())
            ->slot(Slot::AUTH_BEFORE, fn () => view('demo.slots.login-hint', [
                'email' => User::DEMO_EMAIL,
                'password' => User::DEMO_PASSWORD,
            ]), scopes: [Login::class])

            ->middleware(['web']);

        // First-party plugins and core power features (app/Demo/DemoPlugins.php).
        return DemoPlugins::configure($panel, $renderer);
    }

    public static function theme(): string
    {
        $theme = (string) session(self::SESSION_THEME, 'alfakit');

        return Themes::has($theme) ? $theme : 'alfakit';
    }

    /** @return array<int, NavigationGroup> */
    public static function navigationGroups(): array
    {
        return array_map(
            fn (string $key): NavigationGroup => NavigationGroup::make(fn (): string => Nav::group($key))->icon(Nav::ICONS[$key]),
            [Nav::CATALOG, Nav::SALES, Nav::CUSTOMERS, Nav::SUPPORT, Nav::MARKETING, Nav::CONTENT, Nav::REPORTS, Nav::SETTINGS, Nav::SYSTEM, Nav::SHOWCASE],
        );
    }
}
