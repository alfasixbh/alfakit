---
title: Assets
description: Stylesheets, scripts, CSS variables and script data that the app or a plugin adds to panels, loaded in the head or on request.
---

# Assets

AlfaKit's own CSS and JavaScript come from your Vite build. `Assets` adds files that are not part of it, usually from a plugin: stylesheets and scripts in the panel's `<head>`, files a component loads only when it renders, CSS variables and data for scripts. Register them in a service provider's `boot()`.

## Stylesheets and scripts

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

- Local files are copied to `public/vendor/alfakit/{package}/{id}.{css|js}` by `php artisan alfakit:assets` and linked with a version query string that changes with the file. URLs (`https://…`, `//…`, `asset('…')`) are linked as they are.
- Scripts are deferred by default; `->module()`, `->async()` and `->defer(false)` change that. `Css::make()->media('print')` sets the media query.
- `panel: 'admin'` (or a list of ids) limits the assets to some panels.
- The tags carry Vite's CSP nonce when you use one (`Vite::useCspNonce()`).
- `Js::make('analytics')->html('<script>…</script>')` renders inline markup instead of a file (no path needed, nothing to publish). `<script>` tags without a `nonce` get the CSP nonce, unlike Filament where you add it yourself; plain JavaScript without a tag is wrapped in one. It takes a string, an `Htmlable` or a closure, and the markup is trusted, so never build it from user input.
- Asset ids may only contain letters, numbers, dots, dashes and underscores, and packages look like `vendor/name`, so a registration can't write outside `public/vendor/alfakit`.

## Publishing on deploy

`alfakit:install` adds `@php artisan alfakit:upgrade` to the `post-autoload-dump` scripts of `composer.json`, so every `composer install` or `update` republishes the files (and clears AlfaKit's caches). Without it, run `php artisan alfakit:assets` (or `alfakit:upgrade`) in your deploy script. `public/vendor/alfakit` is generated: add it to `.gitignore`.

## Loading on request

A stylesheet or script that only one component needs (a chart library, a map widget's CSS) doesn't have to load on every page. Mark it `loadedOnRequest()`: it is published as usual but left out of `<head>`. Send its URL to the component in its schema props and load it there:

```php
Assets::register([
    Css::make('map-picker', __DIR__.'/../resources/dist/map-picker.css')->loadedOnRequest(),
    Js::make('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js')->loadedOnRequest(),
], package: 'acme/maps');
```

```php
namespace Acme\Maps\Forms\Components;

use AlfaSix\Alfakit\Forms\Components\Field;
use AlfaSix\Alfakit\Support\Assets\Assets;

class MapPicker extends Field
{
    protected ?string $type = 'map-picker';

    protected function getSchemaProps(): array
    {
        return [
            'styleHref' => Assets::getStyleHref('map-picker', package: 'acme/maps'),
            'scriptSrc' => Assets::getScriptSrc('leaflet', package: 'acme/maps'),
        ];
    }
}
```

```tsx
import { loadScript, loadStyle } from '@alfakit/core'

useEffect(() => {
    void Promise.all([loadStyle(component.styleHref), loadScript(component.scriptSrc)]).then(() =>
        setReady(true),
    )
}, [component.styleHref, component.scriptSrc])
```

`loadStyle(href)` and `loadScript(src, { module: true })` add the tag once (repeated calls share the request, and a tag already in the page counts), copy the page's CSP nonce, and resolve when the file has loaded; a failed load rejects and removes the tag so it can be retried. They do nothing during server-side rendering. `Assets::getStyleHref()` / `getScriptSrc()` return null for an unknown id. These are AlfaKit's equivalent of Filament's `x-load-css` / `x-load-js`.

## CSS variables

```php
Assets::registerCssVariables([
    'blog-accent' => '#ff5500',
    'blog-banner' => 'url('.asset('images/banner.jpg').')',
], package: 'acme/blog');
```

They are set on `:root` in a `<style>` in the panel's `<head>` (`--blog-accent`, `--blog-banner`), with the CSP nonce, before the plugin and app stylesheets. Names may only contain letters, digits, dashes and underscores (with or without the leading `--`); values containing `;`, `{`, `}`, `<` or `>` are dropped. `panel:` limits them to some panels.

## Data for scripts

```php
Assets::registerScriptData([
    'blog' => ['perPage' => 10, 'endpoint' => route('blog.search')],
], package: 'acme/blog');
```

The data is merged into `window.alfakitData` by an inline script that runs before the registered scripts. Read it with `getScriptData()` from `@alfakit/core`:

```ts
import { getScriptData } from '@alfakit/core'

const blog = getScriptData<{ perPage: number; endpoint: string }>('blog')
```

The JSON is escaped for HTML (`<`, `>`, `&` and quotes). It is part of the page, so never put secrets in it, and it is written with the first page load: data that changes between Inertia visits belongs in page props. `panel:` limits it to some panels.

## Tailwind CSS in plugins

Renderer components use Tailwind classes, and the app's Tailwind build only generates classes it finds. For a plugin with frontend components, pick one:

- **Ship the plugin's components as source and let the app scan them.** Document an `@source` line for the app's panel stylesheet (`resources/css/alfakit.css`), next to the one for `@alfakit/*`:

    ```css
    @source '../../vendor/acme/blog/resources/js';
    /* or, for an npm package: */
    @source '../../node_modules/@acme/blog/dist';
    ```

    Classes then come from the app's theme, so the plugin follows the panel's colours, radius and dark mode.

- **Ship prebuilt CSS.** Build the plugin's stylesheet with its own Tailwind config and register it with `Assets::register()` (or `->loadedOnRequest()`). Use AlfaKit's tokens (`var(--primary)`, `var(--radius)`, `var(--alfakit-primary-500)` when the panel sets a palette) rather than fixed colours, scope rules under a plugin class or `[data-slot]` hook, and don't include Tailwind's preflight, which the panel already has.

Composed class names (`'grid-cols-' + n`) are never found by a scan: spell classes out in full, or list them with `@source inline(...)`.
