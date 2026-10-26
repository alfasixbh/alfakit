---
title: Installable app (PWA)
description: Turn a panel into an installable app with an offline page, update prompts and Web Push notifications.
---

# Installable app (PWA)

`pwa()` turns a panel into a Progressive Web App. Users can install it on their desktop or home screen, it opens in its own window, keeps working (with an offline page) when the connection drops, and tells users when a new version is deployed. It is off by default.

```php
public function panel(Panel $panel): Panel
{
    return $panel
        // ...
        ->pwa();
}
```

With `pwa()` the panel gets:

- a **web app manifest** at `/admin/manifest.webmanifest`;
- a **service worker** at `/admin/sw.js` that controls everything under the panel path;
- an **offline page** at `/admin/offline`, translated and in your brand colours;
- `<head>` tags: the manifest link, light and dark `theme-color`, and `apple-touch-icon`;
- an **Install app** item in the user menu and the command palette, shown once the browser offers to install the app. On iOS and iPadOS Safari, which have no install prompt, the item explains how to use **Share › Add to Home Screen**;
- a **"A new version is available — Reload"** toast after a deploy.

Nothing is added to panels without `pwa()`: no routes, no tags, no script.

On a [starter kit panel](../getting-started/starter-kits) AlfaKit's pages render in your app's root view, so add the head tags yourself, in the `<head>` of `resources/views/app.blade.php`:

```blade
@alfakitPwa
```

It renders the manifest link, the light and dark `theme-color` and the iOS icon of the `pwa()` panel (the current one, else your starter kit panel; `@alfakitPwa('admin')` names one), and nothing for a panel without `pwa()`. AlfaKit's pages register the service worker; its scope is the panel path (`/admin`), so your own pages outside it are not cached or controlled. Your app owns the user menu there, so **Install app** is offered in the command palette of [`<AlfakitSearch />`](../getting-started/starter-kits#search-notifications-and-tenants-in-the-header) while an AlfaKit page is open (and by the browser's own install button); on your own pages it is offered only with `push: true`, whose bell starts the PWA runtime on every page. With Web Push (`push: true`), the menu of the header bell, [`<AlfakitNotifications />`](../getting-started/starter-kits#search-notifications-and-tenants-in-the-header), has a **Turn on notifications** button (`data-slot="pwa-push"`) on every page of the app; `togglePushNotifications()`, `subscribeToPush()` and `unsubscribeFromPush()` from `@alfakit/core` are there for your own buttons (see [Customising](#customising)).

## The manifest

The manifest is built from the panel:

| Member                     | Value                                          |
| -------------------------- | ---------------------------------------------- |
| `name`                     | The brand name (`brandName()`)                 |
| `short_name`               | The name, cut to 12 characters                 |
| `start_url`, `scope`, `id` | The panel path (`/admin`)                      |
| `display`                  | `standalone`                                   |
| `theme_color`              | The panel's `primary` colour, converted to hex |
| `background_color`         | `#ffffff`                                      |
| `lang`, `dir`              | The panel's current locale and its direction   |
| `icons`                    | See below                                      |

Change any of it with named arguments:

```php
$panel->pwa(
    name: 'Acme Field Service',
    shortName: 'Acme',
    description: 'Jobs, customers and invoices on the go',
    themeColor: '#0f766e',        // manifest and the light theme-color (any CSS colour)
    darkThemeColor: '#042f2e',    // the dark theme-color (default: the dark page background)
    backgroundColor: '#ffffff',   // splash screen background
    manifest: [                   // extra members, merged last
        'categories' => ['business', 'productivity'],
    ],
);
```

Built-in themes set their primary colour in CSS, so the manifest can't see it; pass `themeColor:` to match the theme (for the `alfakit` theme: `oklch(0.359 0.116 256.3)`). Every argument also accepts a closure.

## Icons

Pass your own icons as `sizes => url` pairs or as full manifest icon arrays:

```php
$panel->pwa(icons: [
    '192x192' => '/icons/icon-192.png',
    '512x512' => '/icons/icon-512.png',
    ['src' => '/icons/maskable-512.png', 'sizes' => '512x512', 'purpose' => 'maskable'],
]);
```

Without `icons:` AlfaKit builds a set for you:

- an SVG favicon or brand logo is listed as-is (`sizes: any`);
- 192 px, 512 px and a maskable 512 px PNG are generated (with the GD extension) from a PNG, JPEG or WebP favicon or logo in `public/`, or else from the brand's initial on the theme colour. They are served from `/admin/pwa/icon-*.png` and cached in `storage/framework/cache/alfakit-pwa`.

The largest PNG icon is also used as the `apple-touch-icon`, because iOS ignores manifest icons. Chrome only offers to install an app with a 192 px and a 512 px icon, so keep both if you pass your own.

## Offline and caching

The service worker has no dependencies and is generated per panel. It:

- **precaches the app shell**: the panel's Vite entries (from `public/build/manifest.json`) with their CSS and static imports, the icons and the offline page;
- serves **built assets cache-first** (anything under the build directory, plus fonts, styles and scripts under `/vendor/`); lazy-loaded chunks are cached the first time they load;
- loads **pages network-first** and never stores them, since they hold the user's data. Offline, a full page load shows the offline page, and an Inertia visit redirects there. The offline page retries as soon as the connection is back;
- **never touches internal endpoints** (`/_alfakit/*`), so actions, tables, uploads and notifications always go to the server.

The cache name contains a hash of the Vite manifest, so every `npm run build` ships a new worker. The new worker waits until the user clicks **Reload** in the toast, so a page is never served half from an old build and half from a new one. Old caches are deleted when the new worker takes over. Open tabs check for a new build every hour.

While the Vite dev server runs (`public/hot` exists) nothing is precached.

## Web Push notifications

With `push: true`, users can turn on notifications per browser from the user menu, and every AlfaKit database notification is also delivered to their subscribed devices, even when the app is closed:

```php
$panel
    ->databaseNotifications()
    ->pwa(push: true);
```

Web Push needs a VAPID key pair and a table for the subscriptions:

```bash
php artisan alfakit:pwa-keys
php artisan vendor:publish --tag=alfakit-pwa-migrations
php artisan migrate
```

`alfakit:pwa-keys` writes `ALFAKIT_PWA_VAPID_PUBLIC_KEY` and `ALFAKIT_PWA_VAPID_PRIVATE_KEY` to `.env` (`--show` prints them instead, `--force` replaces existing keys, after which every browser has to subscribe again). Set `ALFAKIT_PWA_VAPID_SUBJECT` to a `mailto:` address or your site URL; push services use it to contact you. Without keys the menu item stays hidden.

Sending needs no extra Composer package: AlfaKit encrypts payloads (RFC 8291, `aes128gcm`) and signs VAPID tokens (RFC 8292) with PHP's OpenSSL extension and posts them with Laravel's HTTP client. Messages go out after the response is sent (immediately in queued jobs and commands). Subscriptions the push service reports as gone (404 or 410) are deleted.

```php
use AlfaSix\Alfakit\Notifications\Actions\Action;
use AlfaSix\Alfakit\Notifications\Notification;

Notification::make()
    ->title('Job assigned')
    ->body('Replace the pump at 12 Harbour Road')
    ->actions([Action::make('open')->url(JobResource::getUrl('view', ['record' => $job]))])
    ->sendToDatabase($technician);
```

The push shows the title and the plain-text body. Clicking it opens the first action's URL (or the panel) in the app. To push something that isn't a database notification:

```php
use AlfaSix\Alfakit\Pwa\PushNotifications;

PushNotifications::send($user, [
    'title' => 'Shift starts in 15 minutes',
    'body' => 'Warehouse B',
    'url' => '/admin/shifts/42',
]);
```

`PushNotifications::send()` returns how many devices accepted the message. To use another sender, bind your own subclass of `AlfaSix\Alfakit\Pwa\WebPush` in the container.

## Requirements and limits

- Service workers need HTTPS, or `localhost` / `*.localhost` during development.
- Each panel is its own app with its own scope. Two panels on one domain install separately.
- Installing works in Chromium browsers (desktop and Android), Edge, and Safari 17+ on macOS (**File › Add to Dock**). iOS and iPadOS install through **Share › Add to Home Screen**, and Web Push there needs iOS 16.4+ and the installed app.
- If your app uses its own root view instead of `alfakit::app`, add `{{ $alfakitPanel->renderPwaHeadTags() }}` to its `<head>`.

## Customising

- The menu items are `<PwaMenuItems />` in the user menu, with `data-slot="pwa-install"` and `data-slot="pwa-push"`. Their icons are the aliases `alfakit::panels.user-menu.install-app-item`, `push-on-item` and `push-off-item`.
- The offline page is the Blade view `alfakit::pwa.offline` (`php artisan vendor:publish --tag=alfakit-views`). It uses `data-slot="pwa-offline"`.
- The browser state (`installable`, `updateAvailable`, `push`, …) is in `pwaStore` from `@alfakit/core`, along with `promptPwaInstall()`, `applyPwaUpdate()`, `subscribeToPush()` and `unsubscribeFromPush()` for your own buttons.
