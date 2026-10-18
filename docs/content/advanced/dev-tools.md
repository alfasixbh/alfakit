---
title: Schema inspector
description: A floating developer button that shows the current page's schema JSON, its context token identity, timings, payload size and editor links.
---

# Schema inspector

While you develop, a small round button in the bottom corner of every panel page opens the schema inspector, a drawer that shows:

- **Server time and payload size**: the server time AlfaKit reports in its `Server-Timing` header (for the page load and, after that, the latest Inertia visit or internal request) and the size of the page props.
- **Context token**: what the page's encrypted context token identifies: panel, page class, route parameters (record key, tenant…), component, whether it is bound to the signed-in user, when it was issued and when it expires (`alfakit.token_lifetime`). The token itself, the user id and the encryption key are never sent.
- **Classes**: the page class, its resource and the resource's model, each with an "open in editor" link.
- **Schema**: every page prop the renderer received (the page schema, the panel description, flash data…) as a collapsible JSON tree. The search box matches keys and values and opens the branches that contain a match; **Copy JSON** copies the whole payload.

It complements the [debug panel](./debug-panel), which shows what PHP resolved (visibility, authorisation, closures); the inspector shows exactly what the browser got.

## Enabling it

The inspector is on when `app.debug` is on and the panel enables it; it is enabled by default in the `local` environment.

```php
$panel->devTools();                                   // whenever app.debug is on
$panel->devTools(fn (?User $user) => $user?->isDeveloper());
$panel->devTools(false);                              // never, even locally
```

Its data travels in an extra Inertia prop, `alfakitDevTools` (`Page::DEV_TOOLS_PROP`), which PHP adds only while `Panel::hasDevTools()` is true. With `app.debug` off the prop is never added and the `Server-Timing` header is not sent, whatever the panel says. The renderers mount a tiny slot that renders nothing without the prop; the inspector's code is a separate chunk loaded only on pages that carry it, so it never weighs on your production bundle.

## Editor links

Links use the same setting as Laravel's error page: `config('app.editor')` (the `APP_EDITOR` env variable in a default `config/app.php`), falling back to Ignition's `ignition.editor`.

```php
// config/app.php
'editor' => env('APP_EDITOR'),               // vscode, phpstorm, cursor, sublime, zed…

// or a custom URL, and a path mapping when PHP runs in a container
'editor' => [
    'href' => 'vscode://file/{file}:{line}',
    'base_path' => '/Users/me/code/app',
],
```

Without an editor the inspector lists the classes and explains how to turn the links on.

## Replacing it

The button and drawer are one component, registered as `panel:dev-tools`; replace it like any panel part: `createAlfakit({ components: { 'panel:dev-tools': MyInspector } })`. It reads `usePage().props.alfakitDevTools` (`DevToolsSchema` in `@alfakit/core`); `@alfakit/core` also exports the helpers the built-in inspector uses: `searchJson()`, `jsonEntries()`, `inspectableProps()`, `latestServerTiming()` and `prettyJson()`.
