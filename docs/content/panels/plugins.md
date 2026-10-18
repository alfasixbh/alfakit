---
title: Plugins
description: Package resources, pages and configuration for reuse.
---

# Plugins

A plugin bundles resources, pages, widgets, middleware or configuration so they can be dropped into any panel.

```php
use AlfaSix\Alfakit\Contracts\Plugin;
use AlfaSix\Alfakit\Panel;

class BlogPlugin implements Plugin
{
    public static function make(): static
    {
        return new static;
    }

    public function getId(): string
    {
        return 'blog';
    }

    public function register(Panel $panel): void
    {
        $panel->resources([PostResource::class, CategoryResource::class])
            ->widgets([BlogStats::class])
            ->navigationGroups(['Blog']);
    }

    public function boot(Panel $panel): void
    {
        // Runs on every panel request after the panel is resolved.
    }
}
```

Register it:

```php
$panel->plugin(BlogPlugin::make());
```

Retrieve it anywhere with `alfakit()->getPanel()->getPlugin('blog')`.

## Generating a plugin

```bash
php artisan make:alfakit-plugin Blog --vendor=acme --frontend=react
```

creates `packages/blog` with `composer.json` (PSR-4 autoload, a Laravel-discovered service provider and the [compatibility declaration](#declaring-compatibility) below), `src/BlogPlugin.php`, `src/BlogServiceProvider.php` (loads `resources/lang` and registers the plugin stylesheet), a README and, with `--frontend`, a small package exporting `components` for your renderer. Add the directory as a Composer path repository and `composer require acme/blog:@dev` to try it in your app.

## Declaring compatibility

Tell AlfaKit which versions your plugin supports in the `extra.alfakit` section of its `composer.json`:

```json
{
    "require": {
        "alfasix/alfakit": "^1.0"
    },
    "extra": {
        "alfakit": {
            "version": "^1.0",
            "frontend": "@acme/blog"
        }
    }
}
```

- `version` is a Composer constraint on `alfasix/alfakit` (`^1.0`, `~1.2`, `>=1.2 <3.0`, `^1.0 || ^2.0`…). Usually the same as the `require` entry; the generator fills both with the installed major (`^1.2`), or `*` on a development version.
- `frontend` (optional) names the npm package that ships your renderer components. Omit it (or set `null`) for a PHP-only plugin.

`php artisan alfakit:upgrade` reads these declarations from `vendor/composer/installed.json` after every update and reports each plugin as **compatible**, **incompatible** or **unknown** against the installed `alfasix/alfakit` version. A declared `frontend` package must also be in the application's `package.json` at the plugin's own major version (same minor for `0.x`), so a user who updated the Composer package but not the npm package sees it. Packages without `extra.alfakit`, development versions and unparsable constraints are reported as unknown, never as failures. The report never blocks an upgrade; `--strict` makes the command fail when something is incompatible, for CI. See [Stability and upgrades](../advanced/stability).

Release the PHP and npm packages of a plugin together with the same major version, exactly as AlfaKit does, so the check stays meaningful.

## Stylesheets and scripts

Plugins register CSS and JavaScript files with `Assets::register()`, usually in their service provider's `boot()`. They are added to the `<head>` of every panel page, before the application's own Vite entries so your CSS can override them:

```php
use AlfaSix\Alfakit\Support\Assets\Assets;
use AlfaSix\Alfakit\Support\Assets\Css;
use AlfaSix\Alfakit\Support\Assets\Js;

Assets::register([
    Css::make('blog', __DIR__.'/../resources/dist/blog.css'),
    Js::make('blog', __DIR__.'/../resources/dist/blog.js')->module(),
    Js::make('charts', 'https://cdn.example.com/charts.js'),
], package: 'acme/blog');
```

- Local files are copied to `public/vendor/alfakit/{package}/{id}.{css|js}` by `php artisan alfakit:assets` (also run by `alfakit:upgrade`), and linked with a version query string that changes when the file does. URLs (`https://…`, `//…`, `asset('…')`) are linked as they are.
- Scripts are deferred by default; `->module()`, `->async()` and `->defer(false)` change that. `Css::make()->media('print')` sets the media query.
- `panel: 'admin'` (or a list of ids) limits the assets to some panels.
- The tags carry Vite's CSP nonce when you use one (`Vite::useCspNonce()`).
- Asset ids may only contain letters, numbers, dots, dashes and underscores, and packages look like `vendor/name`, so a registration can't write outside `public/vendor/alfakit`.

Assets suit plain CSS and scripts. Renderer components (fields, widgets) belong in your frontend build, as below.

## Shipping a frontend

If your plugin needs custom fields or widgets, publish a JavaScript component and document that users must register it in their entry:

```ts
createAlfakit({ components: { 'blog-stats': BlogStats } })
```

Any schema component created with `View::make('blog-stats')` or a widget with `protected static ?string $component = 'blog-stats'` resolves through that registry. See [Custom components](../adapters/custom-components).

## Distributing a whole panel

A plugin adds to panels the app defines. To ship a complete panel instead (a billing portal, a support desk), put a `PanelProvider` in your package and let Laravel discover it:

```php
namespace Acme\Billing;

use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;

class BillingPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->id('billing')
            ->path(config('billing.path', 'billing'))
            ->login()
            ->discoverResources(in: __DIR__.'/Resources', for: 'Acme\\Billing\\Resources')
            ->discoverPages(in: __DIR__.'/Pages', for: 'Acme\\Billing\\Pages')
            ->discoverWidgets(in: __DIR__.'/Widgets', for: 'Acme\\Billing\\Widgets');
    }
}
```

```json
{
    "extra": {
        "laravel": {
            "providers": [
                "Acme\\Billing\\BillingPanelProvider",
                "Acme\\Billing\\BillingServiceProvider"
            ]
        },
        "alfakit": { "version": "^1.0" }
    }
}
```

- Keep the panel's id and path configurable (a published config file), so it can't clash with a panel of the app. Don't call `->default()`: the app's own panel should stay the default.
- The app customises your panel without forking it through `Panel::configureUsing()`, which runs after `panel()` so the id is known: `Panel::configureUsing(fn (Panel $panel) => $panel->getId() === 'billing' ? $panel->colors(['primary' => '#0f766e']) : null)`. Mention it in your README.
- Translations, views, migrations and assets go in a regular service provider (`loadTranslationsFrom()`, `Assets::register(..., panel: 'billing')`), as for any plugin.
- The panel renders with the app's frontend entry. If it needs custom components, ship them as a frontend package the app registers in `createAlfakit({ components })` (above), or give the panel its own stylesheet with `->viteTheme()`.
- Run `php artisan alfakit:optimize` in the app as usual; discovery inside `vendor/` is cached like the app's own.

Plugins commonly set defaults with `configureUsing()`:

```php
TextInput::configureUsing(fn (TextInput $input) => $input->maxLength(255));
Table::configureUsing(fn (Table $table) => $table->paginationPageOptions([25, 50]));
```
