---
title: Per-role and per-page design
description: Switch the layout, theme, density or stylesheet of one panel per user, role, page or tenant with closures that run once per request.
---

# Per-role and per-page design

These settings belong to admin panels: a [starter kit](../getting-started/starter-kits#styles-and-theme) panel and [components outside panels](../standalone/customizing) use your app's own styles, so the closures below have nothing to switch there.

Every design setting of a panel accepts a closure instead of a value: `theme()`, `design()` (and its `layout()` shorthand), `sidebarVariant()`, `density()`, `radius()`, `font()`, `headingFont()` and `viteTheme()`. The closure runs once per request, with the request's context injectable by parameter name:

| Parameter  | Value                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `$user`    | The authenticated user of the panel's guard, or `null` on guest pages (login, registration).                                  |
| `$panel`   | The `Panel`.                                                                                                                  |
| `$page`    | The class of the page being rendered (`App\Alfakit\Resources\PostResource\Pages\EditPost`), or `null` outside a page request. |
| `$route`   | The current `Illuminate\Routing\Route`.                                                                                       |
| `$request` | The current request.                                                                                                          |
| `$tenant`  | The current tenant model, or `null`.                                                                                          |

Type-hinted dependencies resolve from the container as usual, so `fn (Request $request)` works too.

## Per role

A sidebar for administrators, a top bar for everyone else. `hasRole()` comes from a roles package such as spatie/laravel-permission (the [Shield plugin](../plugins/shield) installs it) and `prefersCompactUi()` stands for your own preference column; a fresh `User` model has neither, so swap in your own checks:

```php
use App\Models\User;

$panel
    ->theme('alfakit')
    ->design(
        layout: fn (?User $user) => $user?->hasRole('admin') ? 'sidebar' : 'topbar',
        nav: fn (?User $user) => $user?->hasRole('admin') ? 'pill' : 'underline',
    )
    ->density(fn (?User $user) => $user?->prefersCompactUi() ? 'compact' : 'comfortable');
```

Both the first paint and later navigations follow the result: the root view writes the resolved values into the `data-layout`, `data-nav`, `data-density` (…) attributes of `<html>`, and the shared `alfakit.theme` prop carries the same values so the renderer keeps `<html>` in sync after Inertia visits. Static values are validated when you call `design()`; a closure's result is validated when it runs, with the same error listing the valid values.

## Per page

Give one page a different look, for example a distraction-free editor:

```php
use App\Alfakit\Resources\PostResource\Pages\EditPost;

$panel
    ->layout(fn (?string $page) => $page === EditPost::class ? 'topbar' : 'sidebar')
    ->viteTheme(fn (?string $page) => $page === EditPost::class
        ? ['resources/css/alfakit.css', 'resources/css/editor.css']
        : 'resources/css/alfakit.css');
```

`$page` is a class name, so `is_subclass_of($page, EditRecord::class)` matches every edit page, and `$page::getResource()` is available on resource pages.

## Per tenant

```php
$panel->theme(fn (?Team $tenant) => $tenant?->theme ?? 'neutral');
```

For colours alone, `colors()` takes a closure too: `->colors(fn (?Team $tenant) => ['primary' => $tenant?->brand_color ?? '#2563eb'])`. Pass a `Theme` instance to register one on the fly: `fn ($tenant) => Theme::make("tenant-{$tenant->id}")->extends('alfakit')->colors(['primary' => $tenant->brand_color])`.

## How often closures run

The values are resolved once per request and cached on the panel: the root Blade view, the shared `alfakit` prop and `getViteEntries()` read the same result, so a closure that queries the database runs one query, not three. `SetUpPanel` flushes the cache at the start of every panel request, and every setter (`theme()`, `design()`, …) flushes it too. Call `$panel->flushThemeCache()` yourself when you change what a closure depends on during a request (switching the tenant in a test, for example).

Every closure that ran during a request, with its source location, is listed in the [debug panel](/docs/advanced/debug-panel) while it is enabled.
