---
title: Notifications
description: Toasts and database notifications.
---

# Notifications

Toasts and database notifications work the same in admin panels and starter kit panels (where the bell is `<AlfakitNotifications />` in your header, see [Inside a starter kit](../getting-started/starter-kits#search-notifications-and-tenants-in-the-header)). Outside panels, toasts come from `<AlfakitToaster />` (mounted automatically unless your layout places one); database notifications need a panel. See [Widgets and notifications outside panels](../standalone/widgets-and-notifications).

```php
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Notifications\Actions\Action;

Notification::make()
    ->title('Post published')
    ->body('It is now visible to everyone.')
    ->success()                  // warning(), danger(), info(), or status()/icon()/iconColor()
    ->seconds(5)                 // duration(ms) or persistent()
    ->actions([
        Action::make('view')->label('View')->url(PostResource::getUrl('view', ['record' => $post]))->button(),
        Action::make('undo')->dispatch('post-unpublish', ['id' => $post->id])->close(),
    ])
    ->send();
```

The body is rendered as HTML, so plain strings are escaped (`->body($comment->body)` is safe). Pass an `HtmlString` for markup you trust: `->body(new HtmlString('<strong>Saved</strong>'))`.

`send()` flashes the notification through Inertia; it appears as a toast after the next response (redirect, action run, form submit). Flash data is not persisted in browser history, so toasts never replay.

### Closing a notification

Every notification has an id: a random one (read it with `$notification->getId()` after sending), or your own with `Notification::make('greeting')`. Close the toast from JavaScript with `closeNotification(id)`, exported by `@alfakit/core` and every adapter:

```ts
import { closeNotification } from '@alfakit/react' // or @alfakit/vue, @alfakit/svelte

closeNotification('greeting')
```

It dispatches an `alfakit:close-notification` window event with `{ id }`; Filament's `close-notification` event works too. From PHP, a notification action can close another toast with `->dispatch('alfakit:close-notification', ['id' => 'greeting'])`. Unknown ids are ignored. Prefer random ids: several toasts sharing one id replace each other.

### Colour, date and action buttons

```php
Notification::make()
    ->title('Backup finished')
    ->success()
    ->color('success')                 // tint the background (toast and bell menu); any panel colour
    ->date(now()->toIso8601String())   // shown (relative) in the database notifications menu
    ->actions([
        Action::make('download')
            ->label('Download')
            ->icon('download')         // icon before the label
            ->color('success')         // applied to the button's style
            ->size(Size::Small)        // ExtraSmall (default), Small, Medium, Large, ExtraLarge
            ->button(),                // or ->link() (default)
    ])
    ->send();
```

`color()` only tints the background; `status()` (`success()`, …) still picks the icon and `iconColor()` its colour. Database notifications get their `date` from the record's `created_at` automatically.

### Showing a toast from JavaScript

`showToast()` (exported by `@alfakit/react`, `@alfakit/vue` and `@alfakit/svelte`) shows a toast without a server round trip. It takes the same shape PHP sends (`NotificationSchema` from `@alfakit/core`):

```ts
import { showToast } from '@alfakit/react' // or @alfakit/vue, @alfakit/svelte

showToast({
    id: crypto.randomUUID(),
    title: 'Copied to the clipboard',
    status: 'success',
    icon: 'circle-check',
    duration: 3000, // or 'persistent'
    format: 'alfakit',
})
```

The body is inserted as HTML, so escape text you didn't write. Close it with `closeNotification(id)`.

### Testing notifications

`Notification::assertNotified()` checks notifications sent with `send()` during the test, also outside a page test (in a job, a listener, a service). Without an argument it passes when any notification was sent; with a title, when one with that title was; with a `Notification`, when one with its title and body was:

```php
Notification::fake();              // record send() calls instead of flashing them

$service->import($file);

Notification::assertNotified('Import finished');
Notification::assertNotified(Notification::make()->title('Import finished')->body('3 rows imported.'));
Notification::assertNotNotified('Import failed');
```

Without `Notification::fake()` the assertions read the notifications flashed to the session in the current test. Each test starts without the fake. Page tests have their own `assertNotified()` (see [Testing](../advanced/testing)); don't combine them with `Notification::fake()`, which stops the flashing those read.

## Database notifications

```php
Notification::make()->title('New comment')->body($comment->body)
    ->actions([Action::make('open')->url($url)->markAsRead()])
    ->sendToDatabase($post->author);
```

Enable the bell menu with `->databaseNotifications(pollingInterval: '30s')` on the panel (requires the `notifications` table). The menu lists, marks as read and clears notifications through internal endpoints.

The bell sits in the top bar. To put it in the sidebar instead (under the brand or tenant menu, as a full-width row with a label and the unread count):

```php
use AlfaSix\Alfakit\Support\Enums\DatabaseNotificationsPosition;

$panel->databaseNotifications(position: DatabaseNotificationsPosition::Sidebar);
// or: $panel->databaseNotificationsPosition('sidebar')
```

Without a top bar (`topbar(false)`) the bell moves to the sidebar on its own; `position: DatabaseNotificationsPosition::Topbar` keeps it out of the sidebar then. A collapsed (icon) sidebar shows just the bell with its badge, and the menu opens beside the sidebar on the reading side (left of it in right-to-left panels). The top navigation layout has no sidebar, so it always keeps the bell in its bar. The panel schema carries the choice as `databaseNotifications.position: 'sidebar'`.

Notification actions with `markAsUnread()` mark the notification as unread again from the panel (`->markAsRead()` does the opposite).

### Opening the panel from code

Call `openDatabaseNotifications()` from `@alfakit/core` (in a custom component or a keyboard shortcut), or give an action `->openDatabaseNotifications()`: clicking it opens the panel instead of running anything.

```php
Action::make('inbox')->icon('inbox')->openDatabaseNotifications()
```

```ts
import { openDatabaseNotifications } from '@alfakit/core'

openDatabaseNotifications()
```

The menu component (`NotificationsMenu`) takes `variant="sidebar"` for a full-width trigger with a label, for layouts that place the bell in the sidebar.

### Custom Laravel notifications

A notification class of your own can store or broadcast the same payload the bell and the toasts read:

```php
use AlfaSix\Alfakit\Notifications\Notification;

public function toDatabase(User $notifiable): array
{
    return Notification::make()->title('Invoice paid')->success()->getDatabaseMessage();
}

public function toBroadcast(User $notifiable): BroadcastMessage
{
    return Notification::make()->title('Invoice paid')->getBroadcastMessage();
}
```

On [tenancy panels](../panels/tenancy#notifications-and-uploads-per-tenant) database notifications belong to the tenant they were sent in; use `->tenant($team)` or `->forAllTenants()` to choose.

## Realtime notifications

With Laravel broadcasting set up, notifications can arrive while the page is open instead of after the next request or poll. Opt in on the panel:

```php
$panel->databaseNotifications()->realtimeNotifications();
```

```php
// A toast in every open tab of the user, right away:
Notification::make()->title('Export ready')->success()->broadcast($user);

// Store it for the bell and tell open tabs to reload the bell now:
Notification::make()->title('New comment')->sendToDatabase($user, isEventDispatched: true);
```

Both use Laravel's `broadcast` notification channel on the user's private channel, `App.Models.User.{id}` by default (Laravel's `receivesBroadcastNotificationsOn()` changes it), which your `routes/channels.php` must authorise:

```php
Broadcast::channel('App.Models.User.{id}', fn ($user, $id) => (int) $user->id === (int) $id);
```

The renderers subscribe only when the panel opts in and [Laravel Echo](https://laravel.com/docs/broadcasting#client-side-installation) is available as `window.Echo`; set it up in your panel entry before `createAlfakit()`:

```ts
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher
window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
})
```

Import that file only in the browser entry, not in the SSR entry.

Nothing happens during a server render or without Echo, so the option is safe to enable before broadcasting is configured. The panel shares the channel as `realtime.channel`; `subscribeToNotifications()`, `getEcho()` and `onDatabaseNotificationsSent()` from `@alfakit/core` are available for custom components. Broadcasting goes through your queue unless the queue connection is `sync`.

## Toast position

```php
use AlfaSix\Alfakit\Support\Enums\ToastPosition;

$panel->toastPosition(ToastPosition::BottomEnd); // or 'bottom-end'
```

`TopStart`, `TopCenter`, `TopEnd` (default), `BottomStart`, `BottomCenter` and `BottomEnd`. `start` and `end` follow the reading direction, so `TopEnd` is the top right in English and the top left in Arabic.

## Custom toasts

`->view('my-toast', ['level' => 'critical'])` renders a component registered in `createAlfakit({ components: { 'my-toast': MyToast } })` instead of the default toast. The component receives one prop, `notification` (the `NotificationSchema`: `title`, `body`, `status`, `actions`, …), with the data you passed in `notification.viewData` (`notification.viewData.level`). A component file in `resources/js/alfakit/components/` (`my-toast.vue`) registers itself under its file name.

## Action notifications

Prebuilt actions send success notifications automatically. A custom action sends one when you give it `successNotificationTitle()` or `successNotification()` and its handler didn't send a notification itself. Customise with `successNotificationTitle()`, `successNotification(fn (Notification $notification) => $notification->warning())`, or `failureNotification()`.
