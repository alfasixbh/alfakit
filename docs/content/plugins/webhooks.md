---
title: Webhooks
description: Outgoing webhooks managed in the panel, with signed queued deliveries, retries, SSRF protection, a deliveries log with replay and tenant isolation.
---

# Webhooks

`alfasix/alfakit-webhooks` lets the users of your panel send your application's events to other systems. They add endpoints (a URL and the events it wants), your code dispatches events, and the plugin delivers them: queued, signed, retried, logged and protected against server-side request forgery.

| Class / command             | Does                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `WebhooksPlugin`            | Registers the resource, the event registry and every option                                       |
| `Webhooks`                  | The facade: `Webhooks::dispatch('order.paid', $payload)`, `sendTest()`, `replay()`, `fake()`      |
| `WebhookEndpointResource`   | Endpoints: URL, description, subscribed events, custom headers, signing secret, enable / disable  |
| `DeliveriesRelationManager` | The deliveries log on each endpoint's edit page: status, response code, duration, attempt, replay |
| `SendTestWebhookAction`     | Sends a signed `ping` event right away and shows the response                                     |
| `RotateWebhookSecretAction` | A new signing secret (shown once), with an optional grace period for the old one                  |
| `alfakit-webhooks:prune`    | Deletes old deliveries; schedule it                                                               |

Everything is built from AlfaKit's resources, tables, forms, infolists and actions, so it renders in React, Vue and Svelte; there is no frontend package. It uses Laravel's HTTP client and queues and has no other dependencies.

## Installation

```bash
composer require alfasix/alfakit-webhooks
php artisan vendor:publish --tag=alfakit-webhooks-migrations
php artisan migrate
```

Deliveries are queued jobs, so run a queue worker (`php artisan queue:work`). With the `sync` driver they are sent during the request that dispatches the event, retries included, which is only suitable for development.

Schedule the pruning of old deliveries:

```php
// routes/console.php
use Illuminate\Support\Facades\Schedule;

Schedule::command('alfakit-webhooks:prune')->daily();
```

The auto-disable notification is a database notification: create Laravel's `notifications` table (`php artisan make:notifications-table`) and turn on `->databaseNotifications()` on the panel to show it in the bell.

## Register the plugin

```php
use AlfaSix\AlfakitWebhooks\WebhooksPlugin;

$panel->plugin(
    WebhooksPlugin::make()
        ->events([
            'order.paid' => 'Order paid',
            'order.refunded' => ['label' => 'Order refunded', 'description' => 'A full or partial refund was issued.'],
            'invoice.sent', // labelled "Invoice Sent"
        ])
        ->modelEvents([Customer::class])
        ->navigationGroup('Developers')
        ->authorize(fn (User $user): bool => $user->is_admin),
);
```

Labels and descriptions can be closures, resolved when they are shown, so they follow the user's language: `'order.paid' => fn () => __('webhooks.events.order_paid')`. The labels of `modelEvents()` (":model created") are translated by the plugin, with the model's label from your `models` translation group.

The endpoints are at `/{panel}/webhooks`.

## Dispatching events

```php
use AlfaSix\AlfakitWebhooks\Webhooks;

Webhooks::dispatch('order.paid', [
    'order' => $order->only(['id', 'number', 'total', 'currency']),
]);
```

`dispatch(string $event, array|Arrayable|JsonSerializable $payload = [], Model|false|null $tenant = null, ?string $id = null)`:

- Finds the **enabled** endpoints that subscribe to the event (or to all events) and creates one queued delivery per endpoint. When no endpoint wants the event, nothing is stored and `null` is returned; otherwise it returns the stored `WebhookEvent`.
- Jobs are dispatched **after the current database transaction commits**, so a rolled-back order never sends `order.paid`.
- `$tenant`: whose endpoints receive the event. `null` (the default) uses the panel's current tenant, a model sends it as that tenant, `false` sends it without a tenant. See [Tenancy](#tenancy).
- `$id`: your own event id (default `evt_` and a lowercase ULID). It is sent in the `X-Webhook-Id` header of every attempt and replay, so receivers can ignore duplicates.

You may dispatch event names that are not in the registry; only endpoints that subscribe to all events receive them. `ping` and `*` are reserved.

### Model events

```php
WebhooksPlugin::make()
    ->modelEvents([Customer::class, Order::class])                // customer.created, customer.updated, customer.deleted, order.*
    ->modelEvents(Invoice::class, events: ['created'], prefix: 'billing.invoice')  // billing.invoice.created
    ->modelEvents(Ticket::class, tenant: fn (Ticket $ticket) => $ticket->project->team);
```

The payload is `{"object": …}`; `updated` events add `"previous_attributes"` with the old values of the changed attributes (an update that only touches `updated_at` sends nothing). `object` is the model's `toWebhookPayload(string $event)` when it defines one, else `toArray()`, so `$hidden` attributes stay out:

```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    public function toWebhookPayload(string $event): array
    {
        return $this->only(['id', 'number', 'status', 'total']);
    }

    // The tenant whose endpoints receive this model's events (else the current tenant).
    public function getWebhookTenant(): ?Team
    {
        return $this->team;
    }
}
```

The listeners are registered when the panels are built, which the plugin's service provider makes sure happens at boot, so model events also fire from queue workers, console commands and with cached routes.

## What a delivery looks like

```http
POST /webhooks/alfakit HTTP/1.1
Content-Type: application/json
User-Agent: AlfaKit-Webhooks/1.0
X-Webhook-Id: evt_01jb7x9m4c2v6s3kz8p5f0qg1h
X-Webhook-Event: order.paid
X-Webhook-Timestamp: 1767225600
X-Webhook-Signature: t=1767225600,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
X-Webhook-Attempt: 1
Authorization: Bearer token-from-the-custom-headers

{"id":"evt_01jb7x9m4c2v6s3kz8p5f0qg1h","type":"order.paid","created_at":"2026-01-01T00:00:00Z","data":{"order":{"id":42,"total":1999}}}
```

- The body is identical for every attempt and replay of an event.
- The endpoint must answer with a **2xx** status within the timeout. Anything else (including **3xx: redirects are never followed**), a timeout or a connection error is a failed attempt.
- `headerPrefix('X-Acme')` renames the headers (`X-Acme-Id`, `X-Acme-Signature`…). `userAgent()` changes the user agent.

## Verifying signatures

The signature header is `t={timestamp},v1={signature}` (Stripe's scheme). The signature is the lowercase hex HMAC-SHA256 of `"{timestamp}.{raw body}"` with the endpoint's signing secret as the key. During a secret rotation there are two `v1` entries; accept the request when either matches. Reject timestamps older than a few minutes to stop replayed requests, and compare in constant time.

### PHP (Laravel)

```php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;

Route::post('/webhooks/alfakit', function (Request $request) {
    $secret = config('services.alfakit.webhook_secret'); // whsec_…
    $body = $request->getContent();                      // the raw body, not the decoded JSON
    $timestamp = null;
    $signatures = [];

    foreach (explode(',', (string) $request->header('X-Webhook-Signature')) as $part) {
        [$key, $value] = array_pad(explode('=', trim($part), 2), 2, '');

        if ($key === 't' && ctype_digit($value)) {
            $timestamp = (int) $value;
        } elseif ($key === 'v1' && $value !== '') {
            $signatures[] = $value;
        }
    }

    abort_if($timestamp === null || abs(time() - $timestamp) > 300, 400, 'Invalid timestamp.');

    $expected = hash_hmac('sha256', $timestamp.'.'.$body, $secret);
    $valid = collect($signatures)->contains(fn (string $signature): bool => hash_equals($expected, $signature));

    abort_unless($valid, 400, 'Invalid signature.');

    $event = json_decode($body, true);

    // Each event id is processed once, whatever the retries and replays.
    if (Cache::add('webhooks:'.$event['id'], true, now()->addDays(7))) {
        ProcessWebhookEvent::dispatch($event);
    }

    return response()->noContent();
})->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class); // ValidateCsrfToken::class on Laravel 11 and 12
```

The receiver is a `POST` from another server, so it must skip CSRF protection. Laravel 13's `web` group protects with `PreventRequestForgery`: excluding the older `VerifyCsrfToken` class there leaves the check on and every delivery gets a `419`. Alternatively list the path in `bootstrap/app.php`: `$middleware->preventRequestForgery(except: ['webhooks/alfakit'])` (Laravel 13) or `$middleware->validateCsrfTokens(except: ['webhooks/alfakit'])` (Laravel 11 and 12).

When the receiver also has this package installed, `AlfaSix\AlfakitWebhooks\Support\Signature::verify($header, $body, $secret, tolerance: 300)` does the same check.

### Node.js (Express)

```js
import crypto from 'node:crypto'
import express from 'express'

const app = express()
const secret = process.env.ALFAKIT_WEBHOOK_SECRET // whsec_…

// The raw body: re-serialised JSON would not match the signature.
app.post('/webhooks/alfakit', express.raw({ type: 'application/json' }), (req, res) => {
    const body = req.body.toString('utf8')
    let timestamp = null
    const signatures = []

    for (const part of (req.get('X-Webhook-Signature') ?? '').split(',')) {
        const [key, value] = part.trim().split('=')

        if (key === 't' && /^\d+$/.test(value)) timestamp = Number(value)
        if (key === 'v1' && value) signatures.push(value)
    }

    if (timestamp === null || Math.abs(Date.now() / 1000 - timestamp) > 300) {
        return res.status(400).send('Invalid timestamp')
    }

    const expected = Buffer.from(
        crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex'),
    )
    const valid = signatures.some((signature) => {
        const given = Buffer.from(signature)

        return given.length === expected.length && crypto.timingSafeEqual(given, expected)
    })

    if (!valid) {
        return res.status(400).send('Invalid signature')
    }

    const event = JSON.parse(body)
    // Deduplicate on event.id, then handle event.type…

    res.sendStatus(204)
})
```

## Endpoints

The form has four sections:

- **Endpoint**: the URL (checked by the [SSRF guard](#ssrf-protection)), a description and the enabled toggle.
- **Events**: "All events" (including events added later) or a searchable, bulk-toggleable checklist of the registered events with their labels and descriptions.
- **Custom headers**: name / value pairs sent with every request (an `Authorization` header the receiver expects, for instance). They are stored encrypted. Names must be valid header names; `Host`, `Content-Type`, `Content-Length`, `User-Agent`, `Cookie`, hop-by-hop headers and the plugin's own `X-Webhook-*` headers can't be set. Values can't contain line breaks. At most 20.
- **Signing secret**: the masked secret (`whsec_••••••••Ab3d`).

The signing secret is generated when the endpoint is created (`whsec_` and 40 random characters) and stored encrypted with the application key. It is **shown once**: after creating the endpoint (or rotating the secret) the edit page shows it in a callout with a copy button, on that page load only. Edit pages also have:

- **Send test event**: posts a signed `ping` event to the endpoint now, even when it is disabled, and shows the response status, time and body in a notification. Test deliveries are logged (marked "Test") but never retried and never count towards auto-disabling. The `data` of a ping is `{"message": "…", "endpoint": {"id": 1, "url": "…"}}`.
- **Rotate secret**: generates a new secret. "Keep signing with the old secret for" (none, 1 hour, 24 hours or 7 days) sends both signatures meanwhile, so you can update the receiver without dropping events.
- **Enable / Disable**, and **Delete** (which deletes the endpoint's deliveries too).

The table lists the URL and description, the state (enabled, disabled, or "disabled after failures" with the reason in a tooltip), the events, the failures in a row and the last delivery, with an "Enabled" filter and the test, enable / disable and delete actions per row.

## Deliveries log

Every attempt is a row of the endpoint's **Deliveries** table (newest first, refreshed every 15 seconds): the event, the status (pending, succeeded, failed, skipped), the response code, the attempt number (and "Replay"), the duration, the error and the date. Filter by status, event and test deliveries. **View** opens the details in a slide-over: the URL, the event id, when it was sent and retried, and the request and response headers and bodies.

Request and response bodies are **redacted and truncated** before they are stored: values of keys such as `password`, `secret`, `token`, `api_key`, `authorization`, `card_number` or `cvv` (at any depth of a JSON body) and of `Authorization`, `Cookie` and signature headers become `[redacted]`, and bodies are cut at 16 KB. The event payload itself is stored as you dispatched it, because retries and replays send it again.

```php
WebhooksPlugin::make()
    ->redact(['iban', 'date_of_birth'])  // more keys to mask
    ->maxLoggedBodySize(4096);           // bytes of each body to keep
```

**Replay** (one delivery, or the selected ones in bulk) sends the event again, with the same event id, as a new delivery. Pending deliveries, test deliveries and deliveries of a disabled endpoint can't be replayed.

## Retries and auto-disable

A failed attempt is retried as a new delivery with exponential backoff: by default 5 retries (6 attempts) after about 1 minute, 4 minutes, 16 minutes, 1 hour and 4 hours. Blocked URLs are not retried (a host name that doesn't resolve is, since DNS can recover).

After 15 failed attempts in a row (test deliveries excluded) the endpoint is disabled: it stops receiving events, its queued retries are skipped, the table shows why, the `WebhookEndpointDisabled` event fires and the users of `notifyOnDisable()` (by default, the user who created the endpoint) get a database notification, plus an email in the [AlfaKit mail theme](/docs/advanced/emails) with `mailOnDisable()` (editable as `webhooks.endpoint-disabled`). Any success resets the count; enabling the endpoint again (toggle or action) clears it.

```php
WebhooksPlugin::make()
    ->retries(8)
    ->backoff(base: 30, multiplier: 3, max: 43200)          // 30 s, 90 s, 4.5 min… at most 12 h, plus up to 10% jitter
    ->backoffUsing(fn (int $attempt): int => [10, 60, 600][$attempt - 1] ?? 3600)
    ->timeout(15, connectTimeout: 5)                        // seconds
    ->disableAfterConsecutiveFailures(20)                   // null: never
    ->notifyOnDisable(fn (WebhookEndpoint $endpoint) => User::where('is_admin', true)->get())
    ->mailOnDisable()                                       // email them too
    ->queue('webhooks', connection: 'redis');
```

## Tenancy

On panels with tenancy each tenant manages its own endpoints (`tenant_type` / `tenant_id` on the endpoint, set when it is created): the list, the edit pages and the deliveries only show the current tenant's endpoints, and other tenants' endpoints answer 404.

Delivery follows the same rule: an event dispatched for a tenant (the current tenant by default, or `tenant:`) goes to that tenant's endpoints, plus the endpoints without a tenant (created on a panel without tenancy, e.g. an internal admin panel). An event without a tenant only goes to endpoints without a tenant.

```php
WebhooksPlugin::make()
    ->globalEndpointsReceiveTenantEvents(false) // endpoints without a tenant only get events without a tenant
    ->scopeToTenant(false);                     // on a tenancy panel: list every endpoint, create endpoints without a tenant
```

## Authorisation

Without options the `WebhookEndpoint` policy decides (`viewAny`, `create`, `update`, `delete`), and everyone may when there is none (unless the panel uses `strictAuthorization()`). `authorize()` replaces it for every page and action:

```php
WebhooksPlugin::make()->authorize(fn (User $user): bool => $user->can('manage-webhooks'));
```

Sending test events, rotating secrets, enabling / disabling and replaying need the right to update the endpoint. An endpoint of another tenant is never accessible, whatever the policy says.

## SSRF protection

Endpoint URLs are user input that makes your server send requests, so they are checked when the endpoint is saved **and again before every attempt**:

- The scheme must be `https` (`http` is accepted in the `local` environment, or with `allowInsecureUrls()`).
- No user name or password in the URL.
- The host can't be `localhost`, `*.localhost`, `*.internal` or a cloud metadata host (`metadata.google.internal`, `instance-data`…), nor a numeric host name that resolvers read as an IP address (`2130706433`, `0x7f.1`, `127.1`).
- **Every** address the host resolves to must be public: no private (10/8, 172.16/12, 192.168/16, fc00::/7), loopback, link-local (169.254/16, including the 169.254.169.254 metadata service, fe80::/10), carrier-grade NAT, multicast, reserved or documentation range, nor an IPv4-mapped, NAT64 or 6to4 IPv6 form of those.
- The connection is **pinned** to the address that was just checked (cURL's `CURLOPT_RESOLVE`), so a DNS rebinding between the check and the request can't reach an internal address.
- Redirects are never followed.

```php
WebhooksPlugin::make()
    ->allowInsecureUrls(app()->isLocal())
    ->allowPrivateNetworks(app()->isLocal())   // reach *.test sites while developing; never in production
    ->allowedHosts(['hooks.internal.acme.com']) // trusted hosts that may resolve to private addresses
    ->blockedHosts(['*.acme-staging.com']);     // never send there
```

Bind your own `AlfaSix\AlfakitWebhooks\Contracts\ResolvesHosts` implementation to change how host names are resolved.

## Events

| Event                      | Fired                                                              |
| -------------------------- | ------------------------------------------------------------------ |
| `WebhookDeliverySucceeded` | After an attempt got a 2xx response (`$delivery`)                  |
| `WebhookDeliveryFailed`    | After a failed attempt (`$delivery`, `$willRetry`)                 |
| `WebhookEndpointDisabled`  | When an endpoint is disabled after too many failures (`$endpoint`) |

They are in `AlfaSix\AlfakitWebhooks\Events` and are not fired for test deliveries.

## Testing your application

```php
use AlfaSix\AlfakitWebhooks\Webhooks;

it('sends order.paid when an order is paid', function () {
    $fake = Webhooks::fake();

    $order->markAsPaid();

    $fake->assertDispatched('order.paid', fn (array $payload): bool => $payload['order']['id'] === $order->id);
    $fake->assertDispatchedTimes('order.paid', 1);
    $fake->assertNotDispatched('order.refunded');
});
```

The fake records `dispatch()` calls (model events included) and sends nothing. `$fake->dispatched('order.paid')` returns the recorded calls.

## Customising

Extend the resource and register your class to change the form, the table or the relation managers:

```php
use AlfaSix\AlfakitWebhooks\Resources\WebhookEndpointResource;
use AlfaSix\AlfakitWebhooks\WebhooksPlugin;

class WebhookEndpoints extends WebhookEndpointResource
{
    public static function getRelations(): array
    {
        return [...parent::getRelations(), AuditRelationManager::class];
    }
}

WebhooksPlugin::make()->resourceClass(WebhookEndpoints::class);
```

The models are `WebhookEndpoint`, `WebhookEvent` (one row per dispatched event, with its payload) and `WebhookDelivery` (one row per attempt). `Webhooks::sendTest($endpoint)` and `Webhooks::replay($delivery)` are the actions' code paths, usable from your own.

## Options

| Method                                                                                                                                                  | Default                    | Does                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------- |
| `events(array)` / `event($name, $label, $description)`                                                                                                  | none                       | The subscribable events                                       |
| `modelEvents($models, $events, $prefix, $tenant)`                                                                                                       | none                       | Send `created` / `updated` / `deleted` model events           |
| `authorize(bool\|Closure)`                                                                                                                              | the policy                 | Who may manage webhooks                                       |
| `scopeToTenant(bool\|Closure)`                                                                                                                          | `true`                     | Tenant-owned endpoints on tenancy panels                      |
| `globalEndpointsReceiveTenantEvents(bool)`                                                                                                              | `true`                     | Endpoints without a tenant also get tenant events             |
| `retries(int)`                                                                                                                                          | `5`                        | Retries after a failed attempt                                |
| `backoff($base, $multiplier, $max, $jitter)`                                                                                                            | `60`, `4`, `21600`, `true` | Exponential backoff in seconds                                |
| `backoffUsing(?Closure)`                                                                                                                                | none                       | Your own delay per failed attempt number                      |
| `timeout($seconds, $connectTimeout)`                                                                                                                    | `10`, `5`                  | Request and connection timeouts                               |
| `disableAfterConsecutiveFailures(?int)`                                                                                                                 | `15`                       | Auto-disable threshold                                        |
| `notifyOnDisable(?Closure)`                                                                                                                             | the endpoint's creator     | Users notified when an endpoint is disabled                   |
| `mailOnDisable(bool\|Closure)`                                                                                                                          | `false`                    | Also email those users                                        |
| `queue($queue, $connection)`                                                                                                                            | the defaults               | Where delivery jobs go                                        |
| `headerPrefix(string)`                                                                                                                                  | `X-Webhook`                | Prefix of the delivery headers                                |
| `userAgent(?string)`                                                                                                                                    | `AlfaKit-Webhooks/1.0`     | The `User-Agent` header                                       |
| `allowInsecureUrls(bool\|Closure\|null)`                                                                                                                | only in `local`            | Accept `http://` URLs                                         |
| `allowPrivateNetworks(bool\|Closure)`                                                                                                                   | `false`                    | Accept private and loopback addresses                         |
| `allowedHosts(array)` / `blockedHosts(array)`                                                                                                           | none                       | Host (or `*.domain`) allow and block lists                    |
| `redact(array)` / `maxLoggedBodySize(int)`                                                                                                              | common secrets, `16384`    | What the deliveries log masks and keeps                       |
| `pruneAfterDays(int)`                                                                                                                                   | `30`                       | Retention of `alfakit-webhooks:prune` (`--days` overrides it) |
| `resourceClass()`, `label()`, `pluralLabel()`, `navigationLabel()`, `navigationGroup()`, `navigationIcon()`, `navigationSort()`, `registerNavigation()` |                            | The resource and its navigation item                          |

## Security notes

- Secrets and custom headers are encrypted with `APP_KEY`; rotating the application key without re-encrypting makes them unreadable. Secrets are only revealed once, through the session of the user who created or rotated them.
- The SSRF guard covers the URL and DNS; if your servers reach the internet through a proxy, make sure the proxy also refuses internal destinations.
- Receivers should verify the signature, check the timestamp and deduplicate on the event id: retries and replays deliver the same event more than once.
- Payloads are stored in `alfakit_webhook_events` for retries and replays until they are pruned; don't put data in them that you wouldn't keep in your database.
