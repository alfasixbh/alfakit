---
title: Panel configuration
description: Everything you can configure on a Panel.
---

# Panel configuration

A panel is one admin area with its own URL prefix, authentication guard, branding and set of resources. Panels are declared in a `PanelProvider`:

```php
namespace App\Providers\Alfakit;

use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel->default()->id('admin')->path('admin')->login();
    }
}
```

Create additional panels with `php artisan make:alfakit-panel shop` — each gets its own provider, routes (`/shop`) and, by default, its own namespace (`App\Alfakit\Shop\…`).

## In a starter kit, and outside panels

A [starter kit panel](../getting-started/starter-kits) (`->starterKit()`) renders inside your app's layout, so only part of this page applies there:

- **Applies:** identity and routing (`path()`, `middleware()`, `authMiddleware()`, `routes()`), components (resources, pages, widgets, discovery), features (database notifications, global search, plugins, tenancy, transactions, authorization, error notifications), `unsavedChangesAlerts()`, `spa()` / `spaUrlExceptions()`, and languages, currency and timezone (users switch language with [`<AlfakitLanguageSwitcher />`](../getting-started/starter-kits#search-notifications-and-tenants-in-the-header)).
- **Doesn't apply:** AlfaKit's own sign-in pages (off unless you call them after `starterKit()`), design and themes, branding (name, logo, favicon, font; `colors()` only feeds the `success`, `warning` and `info` statuses), light and dark mode (your appearance setting owns it), the layout options (sidebar, top bar, breadcrumbs, user menu: your layout owns them) and the credit line (not shown).

Components [outside panels](../standalone/overview) are served by a hidden `standalone` panel that you don't configure; their options live on the components themselves.

## Identity and routing

| Method                                                | Description                                                                                                                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id('admin')`                                         | Unique id; used in route names (`alfakit.admin.*`) and middleware parameters                                                                                           |
| `path('admin')`                                       | URL prefix. Use `''` to mount at the root                                                                                                                              |
| `domain('admin.example.com')`                         | Restrict the panel to a domain                                                                                                                                         |
| `domains(['admin.example.com', 'admin.example.org'])` | Serve the panel on several domains; links point to the domain of the current request (the first one outside a request)                                                 |
| `default()`                                           | The panel used by `alfakit()->getPanel()` when no panel is current (e.g. in CLI)                                                                                       |
| `homeUrl(fn () => …)`                                 | Where `/admin` redirects to; defaults to the dashboard                                                                                                                 |
| `middleware([...])`                                   | Middleware for every panel route (add `web`)                                                                                                                           |
| `authMiddleware([...])`                               | Extra middleware for authenticated routes                                                                                                                              |
| `routes(fn (Router $router, Panel $panel) => …)`      | Extra routes in the panel's route group (path, `alfakit.{id}.` names, panel middleware), open to guests; route names are relative (`->name('auth.invitation.accept')`) |
| `authenticatedRoutes(fn (Router $router) => …)`       | The same behind the panel's auth middleware, under the tenant prefix on tenancy panels                                                                                 |

## Authentication

```php
$panel->authGuard('web')
    ->login()            // /admin/login
    ->registration()     // /admin/register
    ->passwordReset()    // request + reset pages, emails via the panel's broker
    ->emailVerification()
    ->profile(isSimple: true);
```

Pass your own page class to any of these (`->login(CustomLogin::class)`). See [Authentication](authentication).

## Design

```php
$panel->theme('alfakit');   // neutral, alfakit, minimal, soft, corporate, filament
```

Themes change the structure (sidebar, top navigation or icon rail), navigation, page headers, cards, inputs, buttons, tables, spacing, fonts and colours. Override parts with `->design(...)`, `->density()`, `->radius()`, `->font()` and `->headingFont()`, add content with `->slot()`, and give a panel its own stylesheet with `->viteTheme()`. See [Themes](../design/themes), [Design options](../design/design-options), [Slots](../design/slots) and [Customizing](../design/customizing).

## Branding

```php
$panel->brandName('Acme')
    ->brandLogo(asset('logo.svg'))
    ->darkModeBrandLogo(asset('logo-dark.svg'))
    ->brandLogoHeight('2rem')
    ->favicon(asset('favicon.ico'))
    ->font('Inter')
    ->colors(['primary' => '#2563eb', 'danger' => 'oklch(0.63 0.24 27)'])
    ->darkMode(true, isForced: false);
```

### Credits

Every panel shows a small "Developed by Alfa Six" line with the Alfa Six emblem at the bottom of its pages, including the sign-in pages. Remove it, decide per request or point it elsewhere:

```php
$panel->credit(false);
$panel->credit(fn (): bool => ! app()->isProduction());
$panel->creditUrl('https://example.com/about');
```

The pages your customers see outside the panel (the CMS site, public forms, the helpdesk portal and chat widget, shared analytics dashboards, invoice links and documents) and AlfaKit's emails never show a credit unless you turn it on. When it's on, they end with "Powered by AlfaKit · Alfa Six":

```php
// config/alfakit.php (or ALFAKIT_POWERED_BY=true / ALFAKIT_POWERED_BY_EMAILS=true)
'credit' => [
    'public_pages' => true, // public pages of every plugin
    'emails' => true,       // panel, helpdesk, invoice, forms and team invitation emails
],

// Or per plugin, overriding the config (pages and emails of that plugin):
CmsPlugin::make()->poweredBy();
HelpdeskPlugin::make()->poweredBy(fn (): bool => ! app()->isProduction());
InvoicesPlugin::make()->poweredBy(false);
```

The line is translated (`alfakit::ui.powered_by`), works right to left and in dark mode, and is styled by `[data-slot='powered-by']` in the theme CSS. Render it on your own pages with `AlfaSix\Alfakit\Support\Credit::poweredBy()` (an `HtmlString`).

### Light and dark mode

```php
use AlfaSix\Alfakit\Theming\ThemeMode;

$panel->defaultThemeMode(ThemeMode::Dark)   // Light, Dark or System (default)
    ->themeSwitcher(false);                 // hide the light/dark/system switcher
```

`defaultThemeMode()` is the scheme users start with until they pick one with the switcher. With `themeSwitcher(false)` the switcher disappears and every user gets the default mode; dark mode support stays on (unlike `darkMode(false)`). `darkMode(isForced: true)` still wins over both. Both `darkMode()` arguments take closures, resolved per request: `->darkMode(fn (): bool => ! request()->is('*/print/*'))`. The server resolves the mode for every request (the `HandleInertiaRequests` middleware reads the `alfakit_appearance` cookie through `$panel->resolveAppearance()`), so the root view renders the first paint in the right scheme, including with SSR; you don't need to call it yourself.

Colours accept any CSS colour and override the theme's (`--primary`, `--destructive`, …); pass a closure to pick them per request (`->colors(fn (?Team $tenant) => [...])`), or use `Colors::register()` for every panel. `gray` tints the neutral tokens, and any other name becomes a colour you can use with `->color('brand')`; see [Themes](../design/themes#colours). `font()` loads the font from Bunny Fonts automatically, or from your own stylesheet with `font('Inter', url: asset('fonts/inter.css'))`. See [Themes](../design/themes).

## Layout

| Method                                                    | Description                                                                                                                                                                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sidebarCollapsibleOnDesktop()`                           | Collapse to icons (default `true`)                                                                                                                                                                                                             |
| `sidebarFullyCollapsibleOnDesktop()`                      | Hide the sidebar entirely                                                                                                                                                                                                                      |
| `topNavigation()`                                         | Navigation across the top instead of a sidebar (same as `design(layout: 'topbar')`)                                                                                                                                                            |
| `topbar(false)`                                           | No top bar in the sidebar layouts (breadcrumbs and the theme switcher go with it; global search, notifications and the user menu move to the sidebar); phones keep a slim bar with the sidebar toggle. The top navigation layout keeps its bar |
| `maxContentWidth(Width::SevenExtraLarge)`                 | Content container width                                                                                                                                                                                                                        |
| `breadcrumbs(false)`                                      | Hide breadcrumbs                                                                                                                                                                                                                               |
| `breadcrumbs(hasNavigationHierarchy: true)`               | Start breadcrumbs with the page's navigation group and parent item                                                                                                                                                                             |
| `subNavigationPosition(SubNavigationPosition::Top)`       | Default sub-navigation position (`Start`, `End`, `Top`) for pages, clusters and resources that don't set `$subNavigationPosition`                                                                                                              |
| `userMenu(position: UserMenuPosition::Topbar)`            | Show the user menu in the top bar instead of the sidebar footer (sidebar layouts; `userMenuPosition()` alone sets just the position)                                                                                                           |
| `unsavedChangesAlerts()`                                  | Warn before leaving a dirty form                                                                                                                                                                                                               |
| `sidebarWidth('18rem')` / `collapsedSidebarWidth('4rem')` | Width of the open sidebar and of the icon-only sidebar (CSS lengths: `px`, `rem`, `em`, `ch`, `vw`, `%`; anything else is ignored)                                                                                                             |
| `collapsibleNavigationGroups(false)`                      | Keep every navigation group open, without toggles                                                                                                                                                                                              |
| `simplePageMaxContentWidth(Width::Large)`                 | Width of login, registration and other `auth` layout pages (default `md`)                                                                                                                                                                      |
| `spaUrlExceptions([url('/reports/live'), '*/exports/*'])` | URLs that load with a full page request instead of an Inertia visit (`*` matches anything)                                                                                                                                                     |
| `spa(false)`                                              | Load every page with a full request                                                                                                                                                                                                            |

## Components

```php
$panel->resources([PostResource::class])
    ->discoverResources(in: app_path('Alfakit/Resources'), for: 'App\\Alfakit\\Resources')
    ->pages([Dashboard::class])
    ->discoverPages(in: app_path('Alfakit/Pages'), for: 'App\\Alfakit\\Pages')
    ->widgets([BlogStats::class])
    ->discoverWidgets(in: app_path('Alfakit/Widgets'), for: 'App\\Alfakit\\Widgets');
```

Configurable pages register one page class several times with its own options, like [configurable resources](../resources/overview#configurable-resources) (see [Configurable pages](#configurable-pages)).

Set `protected static bool $isDiscovered = false;` on a resource, page or widget to keep it out of discovery (you can still register it by hand). Discovery scans the filesystem on every request in development. Run `php artisan alfakit:optimize` in production to cache the results (and `alfakit:optimize-clear` to reset).

## Features

| Method                                                            | Description                                                                                                                                  |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `databaseNotifications(pollingInterval: '30s')`                   | Bell menu backed by Laravel's `notifications` table                                                                                          |
| `globalSearch(keyBindings: ['mod+k'])`                            | Command palette searching every resource; see [Global search](#global-search)                                                                |
| `defaultAvatarProvider(InitialsAvatarProvider::class)`            | Avatars for users and tenants without one; see [Navigation](navigation#user-name-and-avatar)                                                 |
| `userMenuItems([Action::make('docs')->url('…')->icon('book')])`   | Extra entries in the user menu; see [Navigation](navigation#user-menu)                                                                       |
| `tenant(Team::class)`                                             | Multi-tenancy — see [Tenancy](tenancy)                                                                                                       |
| `plugin(...)` / `plugins([...])`                                  | See [Plugins](plugins)                                                                                                                       |
| `bootUsing(fn (Panel $panel) => …)`                               | Runs once per request after the panel is resolved                                                                                            |
| `databaseTransactions()`                                          | Run every action and page save in a database transaction; see [Actions](../actions/overview#database-transactions)                           |
| `strictAuthorization()`                                           | Missing policies and policy methods deny instead of allow; see [Authorization](../resources/authorization)                                   |
| `errorNotifications(false)`                                       | Keep Inertia's error modal instead of error notifications                                                                                    |
| `registerErrorNotification('Not allowed', 'Ask an admin.', 403)`  | Title and body of the error notification for a status (or for all others when the status is omitted)                                         |
| `hiddenErrorNotification(403)` / `disabledErrorNotification(503)` | Catch a status without a notification / leave it to the default handling; see [Error notifications](#error-notifications)                    |
| `readOnlyRelationManagersOnResourceViewPagesByDefault(false)`     | Let relation managers on View pages create, edit and delete; see [Relation managers](../resources/relation-managers#read-only-on-view-pages) |
| `discoverClusters(in: …, for: …)`                                 | Discover [clusters](clusters) (they are pages)                                                                                               |

### Global search

```php
$panel->globalSearch(keyBindings: ['mod+k'])
    ->globalSearchKeyBindings(['mod+k', 'ctrl+/'])   // same as the keyBindings argument
    ->globalSearchDebounce('500ms')                  // '1s', or milliseconds; default 250ms
    ->globalSearchFieldSuffix(fn (): string => 'Ctrl K') // text at the end of the field
    ->globalSearchFieldKeyBindingSuffix(false)       // hide the ⌘K / Ctrl K hint (shown by default)
    ->globalSearchResourceOptIn();                   // only resources that opt in

$panel->globalSearch(position: GlobalSearchPosition::Sidebar); // or ->globalSearchPosition('sidebar')
```

`GlobalSearchPosition::Sidebar` moves the field from the top bar into the sidebar header in the sidebar layouts (the top navigation layout keeps it in its bar); without a top bar (`topbar(false)`) it moves there on its own.

With `globalSearchResourceOptIn()`, only resources that declare `protected static bool $isGloballySearchable = true;` themselves are searched. Order a resource's results with `protected static ?int $globalSearchSort = 1;` (lower first; resources without one follow in panel order), and search the whole phrase instead of each word with `protected static ?bool $shouldSplitGlobalSearchTerms = false;`. See [Global search](../resources/global-search).

### Error notifications

When `app.debug` is off, a page visit or action that fails with an HTTP error (403, 404, 500…) shows a notification instead of Inertia's full-screen error modal. In debug mode the modal stays, so you still see the exception. The defaults are translated ("Something went wrong", "Access denied", "Not found"); override them per status:

```php
$panel
    ->registerErrorNotification(title: 'Something broke', body: 'We have been notified.')
    ->registerErrorNotification(title: 'Not allowed', body: 'Ask an admin for access.', statusCode: 403);
```

Expired pages (419) still reload to get a fresh token.

Hide the notification of a status (the error is still caught, nothing is shown), or disable it so the default handling applies (Inertia's error modal for page visits, the generic "The request failed." toast for internal requests):

```php
$panel
    ->hiddenErrorNotification(403)
    ->disabledErrorNotification(503);
```

Action requests (an action or modal submit, a field action, a select's create-option modal), live form refreshes and wizard step validation never fail silently: a failed one shows the same notification for its status, and when error notifications are off or no text matches (in debug mode, for example) a generic "The request failed." toast with the server's message, so a 500 behind a modal button is visible instead of a modal that just stays open. Validation errors (422) are shown on the fields as before.

#### Per page

A page can turn error notifications on or off for itself, or change them, while the panel's apply everywhere else:

```php
use AlfaSix\Alfakit\Pages\Page;

class Reports extends Page
{
    protected ?bool $hasErrorNotifications = false; // null (default) follows the panel

    // Or decide at runtime:
    public function hasErrorNotifications(): bool
    {
        return Feature::active('quiet-reports');
    }

    protected function setUpErrorNotifications(): void
    {
        $this->registerErrorNotification(title: 'Report unavailable', body: 'Try again in a minute.', statusCode: 503);
        $this->hiddenErrorNotification(404);
        $this->disabledErrorNotification(500);
    }
}
```

The page's entries are merged over the panel's and replace them while the page is open (its actions, forms and tables included). Like the panel's, they are only sent when `app.debug` is off.

### SPA URL exceptions

Every link is an Inertia visit by default. Pages that need a fresh document (a page with third-party scripts, a different app on the same domain) can be loaded with a full request:

```php
$panel->spaUrlExceptions(fn (): array => [
    ReportsPage::getUrl(),
    url('/admin/exports').'*',
]);
```

Patterns are matched against the full URL; `*` matches anything. Visits that stay on the same path (table paging, polling, partial reloads) are never turned into full loads.

### Panel assets

```php
use AlfaSix\Alfakit\Support\Assets\Css;
use AlfaSix\Alfakit\Support\Assets\Js;

$panel->assets([
    Css::make('admin-overrides', resource_path('css/admin.css')),
    Js::make('admin-tools', 'https://cdn.example.com/tools.js')->module(),
], package: 'app/admin');
```

The assets load on this panel's pages only (`Assets::register([...], panel: 'admin')`). Local files are published to `public/vendor/alfakit/{package}/` by `php artisan alfakit:assets`.

### Configurable pages

Register a page class several times, each with its own options, URL and navigation item. Give the page a configuration class extending `PageConfiguration` and read it with `static::getConfiguration()`:

```php
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Pages\PageConfiguration;

class SettingsPageConfiguration extends PageConfiguration
{
    protected ?string $category = null;

    public function category(string $category): static
    {
        $this->category = $category;

        return $this;
    }

    public function getCategory(): ?string
    {
        return $this->category;
    }
}

class SettingsPage extends Page
{
    protected static ?string $configurationClass = SettingsPageConfiguration::class;

    public ?string $category = null;

    public function mount(mixed ...$parameters): void
    {
        $this->category = static::getConfiguration()?->getCategory();
    }

    public static function getNavigationLabel(): string
    {
        return 'Settings: '.static::getConfiguration()?->getCategory();
    }
}

$panel->pages([
    SettingsPage::make('general')->category('general'),                              // /admin/settings-page/general
    SettingsPage::make('advanced')->slug('advanced-settings')->category('advanced'), // /admin/advanced-settings
]);
```

- A configuration lives at `{page-slug}/{key}`, or at its `slug()`. Keys may contain letters, numbers, dashes and underscores.
- The configuration is active while it serves a request, including the page's actions and live updates. `SettingsPage::withConfiguration('advanced', fn () => SettingsPage::getUrl())` links to another one.
- `make()` on a page class always returns a configuration; register the plain class too (`SettingsPage::class`) when it should also be reachable without one.

## Languages, currency and timezone

```php
$panel
    ->locales(['en', 'ar', 'fr'])                 // language menu appears automatically
    ->defaultLocale('en')
    ->persistLocaleUsing(fn (User $user, string $locale) => $user->update(['locale' => $locale]))
    ->currency('EUR')                             // default for money columns and MoneyInput
    ->timezone(fn () => auth()->user()?->timezone); // display timezone, per user
```

| Method                                                        | Description                                                                |
| ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `locales(array\|Closure)`                                     | Languages users can pick: codes, `code => label` pairs or `Locale` objects |
| `defaultLocale(?string)`                                      | Fallback when nothing else matches (defaults to `app.locale`)              |
| `localeSwitcher(bool)`                                        | Show or hide the language menu (on when there are several locales)         |
| `detectBrowserLocale(bool)`                                   | Use `Accept-Language` for first-time visitors (on by default)              |
| `persistLocaleUsing(Closure)` / `resolveLocaleUsing(Closure)` | Save the user's choice / take over resolution                              |
| `frontendTranslations(array)`                                 | Share extra translation groups with custom frontend components             |
| `currency(string\|Closure)`                                   | Default ISO 4217 currency                                                  |
| `timezone(string\|Closure)`                                   | Timezone dates are shown and entered in                                    |

See [Localization](../localization/overview) and [Currencies, numbers and dates](../localization/currencies-and-numbers).

## Accessing the current panel

```php
alfakit()->getCurrentPanel();        // null outside panel requests
alfakit()->getPanel('admin');
alfakit()->getTenant();
$panel->route('resources.posts.index');
$panel->getUrl();
```

## Configuring panels from elsewhere

`Panel::configureUsing()` registers a callback that runs for every panel, for example from a module's or plugin's service provider. For panels built by a `PanelProvider`, callbacks run after the provider's `panel()` method, so `$panel->getId()` is the panel's real id and you can target one panel:

```php
use AlfaSix\Alfakit\Panel;

Panel::configureUsing(function (Panel $panel): void {
    if ($panel->getId() !== 'admin') {
        return;
    }

    $panel->discoverResources(in: base_path('modules/Billing/Resources'), for: 'Modules\\Billing\\Resources');
});
```

Because they run last, callbacks can also override settings made in `panel()`. Register them in a service provider's `register()` method, or anywhere that runs before the panel providers register.
