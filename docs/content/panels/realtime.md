---
title: Real-time collaboration
description: Presence on records, edit-conflict detection, live tables and widgets, and instant notifications over Laravel broadcasting.
---

# Real-time collaboration

With one panel option, AlfaKit shows who else is on a record, warns before anyone overwrites somebody else's changes, keeps tables and widgets current without reloading, and pushes notifications to the bell as soon as they are stored.

```php
$panel->realtime();
```

Everything runs on [Laravel broadcasting](https://laravel.com/docs/broadcasting) (Reverb, Pusher or Ably) and Laravel Echo in the browser. Only keys travel over the WebSocket: the browser fetches the data again through the same authorised endpoints it always uses.

Real-time features are **off by default**. While they are off, AlfaKit registers no channel, route or model observer and loads nothing in the browser.

It works the same on a [starter kit panel](../getting-started/starter-kits): `alfakit:realtime` imports Echo in your app's own entry (`resources/js/app.*`), presence, edit conflicts and live tables work on AlfaKit's pages, and the bell in your app header updates live.

## Setup

```bash
php artisan alfakit:realtime
```

The [setup command](../getting-started/setup-wizard#realtime) installs Laravel Reverb, runs Laravel's `install:broadcasting`, writes the `REVERB_*` keys, creates `resources/js/alfakit/echo.ts` (Laravel Echo as `window.Echo`, browser only, which the panel entry loads when AlfaKit first needs Echo: `createAlfakit({ echo: () => import('./echo').then((module) => module.default()) })`) and turns on `->realtime()`. Then run the WebSocket server and a queue worker (broadcasts are queued):

```bash
php artisan reverb:start
php artisan queue:work
```

To set it up by hand:

1. `composer require laravel/reverb`, then `php artisan install:broadcasting --reverb` and `php artisan reverb:install`.
2. `npm install --save-dev laravel-echo pusher-js`.
3. Make Echo available, in one of three ways:
    - set it up as `window.Echo` before the panel boots (what `install:broadcasting` and `alfakit:realtime` do);
    - pass it to the renderer: `createAlfakit({ echo })`, an instance or a factory that receives the panel's options:

        ```ts
        import Echo from 'laravel-echo'
        import Pusher from 'pusher-js'

        createAlfakit({
            echo: (options) => new Echo({ ...options, broadcaster: 'reverb', Pusher }),
        })
        ```

    - or set the public Echo options in `config/alfakit.php` (`broadcasting.echo`); the renderer then imports `laravel-echo` and `pusher-js` itself, if your app installed them.

`laravel-echo` and `pusher-js` are optional: without them (or without a running WebSocket server) every page works as before, and live tables and widgets fall back to polling.

### Options

```php
$panel
    ->realtime()                          // bool|Closure, evaluated per request (e.g. per plan or user)
    ->broadcastConnection('reverb')       // a connection in config/broadcasting.php; the default when null
    ->broadcastModelChanges()             // broadcast the resource models' changes (on by default)
    ->detectConflicts();                  // optimistic concurrency on Edit pages (on by default, also without realtime)
```

`realtime()` includes [realtime notifications](../notifications/overview#realtime-notifications); you don't need `realtimeNotifications()` as well.

## Channels and authorisation

AlfaKit registers its channels on the panel's broadcasting connection, for the panel's auth guard, and authorises them itself. Echo authenticates at `/{panel}/_alfakit/broadcasting/auth` (behind the panel's auth middleware) when the renderer creates Echo; an Echo instance of your own uses Laravel's `/broadcasting/auth`, which authorises the same channels.

| Channel                                           | Who may join                                                                                    | Used for                           |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| `private-alfakit.{panel}.{tenant}.{model}`        | users who may list the model: the resource's `viewAny` policy ability                           | live tables and widgets            |
| `presence-alfakit.{panel}.{tenant}.{model}.{key}` | users who may `view` or `update` the record, found through the resource's (tenant-scoped) query | presence avatars, conflict banners |
| `App.Models.User.{id}` (Laravel's)                | the user                                                                                        | notifications                      |

- `{tenant}` is the current tenant's key on [tenancy panels](tenancy) for tenant-owned models, `_` otherwise. Joining a tenant's channel needs membership (`HasTenants::canAccessTenant()`, fails closed); another tenant's records are never found through your tenant's channel.
- `{model}` is the model class with `-` for `\` (`App-Models-Post`).
- Users must be able to access the panel (`CanAccessPanel`), as on every page.
- The user's notification channel is registered for you when the application doesn't define it in `routes/channels.php`.

## Presence

Record pages (View and Edit) show the avatars of the other users on the same record in the page header, using the panel's [avatar provider](navigation#user-name-and-avatar), with a dot for those editing (Edit page) rather than viewing. The list is labelled for screen readers ("Also on this record") and reads out each user and state ("Dana is editing").

Replace the avatars with `createAlfakit({ components: { 'page:presence': MyPresence } })`; the component receives `{ presence: { channel, state } }`.

## Edit conflicts

Edit pages detect conflicts in two ways:

- **Server side, always (`detectConflicts()`, on by default).** The page sends the version of the record its form was loaded from with the save; when somebody else saved the record meanwhile, saving is refused with an error notification and the conflict banner. The version is a keyed hash of the stored row, so changes within the same second count too, and it reveals nothing about the values. Turn it off per panel with `->detectConflicts(false)` or per page:

    ```php
    use AlfaSix\Alfakit\Resources\Pages\EditRecord;

    class EditPost extends EditRecord
    {
        protected static ?bool $detectsConflicts = false;
    }
    ```

    Saves made from code (`$page->save($data)`) aren't checked.

- **Live, with `realtime()`.** As soon as somebody else saves the record, a banner appears on the page: "Dana saved changes 10 seconds ago" (or "deleted this record"). Nothing is blocked; you keep typing.

The banner offers:

- **Review changes**: each field that changed since you opened the page, its saved value and your unsaved one ("Changed by both" when you edited it too), with "Use saved value" per field.
- **Reload**: load the saved record into the form (discarding your unsaved values).
- **Keep mine**: dismiss the banner; your next save overwrites the other changes.

The review is computed on the server (`POST /_alfakit/conflicts`, authorised like the page) from the form's own fields: hidden fields are never included. Replace the banner with `components: { 'page:conflict-banner': MyBanner }`; it receives `{ page }`.

## Live tables and widgets

```php
public static function table(Table $table): Table
{
    return $table
        ->columns([...])
        ->live(); // or ->liveUpdates()
}
```

When records of the table's model are created, updated or deleted, the table refreshes in place, debounced (`debounce: 500` milliseconds by default): selection, scroll, filters, sorting, pagination and open modals stay. Created records don't make the table jump: a "3 new records — show" pill appears above it (`newRecordsIndicator: false` refreshes right away instead). Updates of records on other pages are ignored.

```php
$table->live(
    debounce: 1000,
    newRecordsIndicator: false,
    fallbackPollingInterval: '30s',       // without Echo or realtime(); null to not poll
    models: [Post::class, Comment::class], // follow other models (or resources) too
);
```

Widgets follow models the same way:

```php
StatsOverview::make()->live([Order::class]);
```

```php
namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Widgets\ChartWidget;
use App\Models\Order;
use Closure;

class OrdersChart extends ChartWidget
{
    protected bool|Closure $hasLiveUpdates = true;

    protected array|Closure|null $liveModels = [Order::class];
}
```

A widget on a resource page follows the resource's model by default. Table widgets pass `live()` on to their table.

## Which changes are broadcast

With `realtime()`, the models of the panel's resources are observed automatically (`broadcastModelChanges(false)` turns that off). For models without a resource, add the trait:

```php
use AlfaSix\Alfakit\Realtime\BroadcastsToAlfakit;

class Comment extends Model
{
    use BroadcastsToAlfakit;

    // Optional: skip some changes.
    public function shouldBroadcastToAlfakit(string $event): bool
    {
        return $event !== 'updated' || $this->wasChanged('body');
    }
}
```

Each change dispatches one `AlfaSix\Alfakit\Realtime\RecordChanged` event per panel, after the database transaction commits, to the model channel and the record's presence channel of each tenant the record belongs to. Its payload is `{event, model, key, by, at}`: the change, the model, the record's key, the user who made it and when. **Attributes are never broadcast.** The browser tab that made the change is skipped (`X-Socket-ID`).

## Notifications

With `realtime()`, every database notification Laravel stores (`$user->notify()` with the `database` channel, `Notification::sendToDatabase()`) refreshes the user's bell in open tabs right away, and `Notification::broadcast()` toasts arrive instantly. See [Realtime notifications](../notifications/overview#realtime-notifications).

## Security notes

- Channel names are not secrets: every channel is private or presence and authorised on each subscription with the panel guard, panel access, tenant membership and the record's policy.
- Payloads carry keys only; data is fetched again through the endpoints that already apply your policies, tenant scopes and hidden fields.
- Presence members share their name and avatar with the other users who may see the record.
- `config('alfakit.broadcasting.echo')` is sent to the browser: put only public settings there (the Reverb/Pusher app key and host, never the secret).
- Broadcasts are queued (`ShouldBroadcast`); run a queue worker in production.

## Testing

Use Laravel's fakes: `Event::fake([RecordChanged::class])` records broadcasts, and `Notification::fake()` the bell refreshes.

```php
Event::fake([RecordChanged::class]);

$post->update(['title' => 'New']);

Event::assertDispatched(RecordChanged::class, fn (RecordChanged $event): bool => $event->broadcastWith()['key'] === $post->id);
```
