---
title: Analytics
description: Privacy-first, cookieless web analytics for your app's public site, viewed in the panel, with goals, sources, comparisons, realtime visitors, exports and shared links.
---

# Analytics

`alfasix/alfakit-analytics` counts the visits of your application's public pages, in the spirit of Plausible and Fathom, and shows them in your panel. It does not use cookies, browser storage or any persistent identifier, never stores IP addresses or user agents, and keeps everything in your own database.

| Piece                               | Does                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Snippet (`@alfakitAnalytics`)       | A script under 2 KB: page views (also client-side navigations), custom events, `data-alfakit-event` clicks          |
| `<AlfakitAnalytics />`              | The same tracker as a React, Vue or Svelte component for Inertia pages, plus `trackAnalyticsEvent()`                |
| `Analytics::track()` / `pageview()` | Server-side events and page views, attributed to the visitor of the current request                                 |
| `alfakit-analytics` middleware      | Page views recorded on the server, without JavaScript                                                               |
| `AnalyticsPlugin`                   | The dashboard page and the sites resource in a panel                                                                |
| `AnalyticsDashboard`                | KPIs with "visitors now", the visitors chart, top lists, filters, comparisons, period picker, export and share link |
| `SiteResource`                      | Tracked sites: domains, timezone, goals, the snippet and the shared link                                            |
| `alfakit-analytics:aggregate`       | Daily rollups, retention and salt rotation; scheduled hourly by the plugin                                          |

The dashboard is built from AlfaKit's stats, chart and widget components plus a top-list card (`analytics:breakdown`) that every renderer ships, so it renders in React, Vue and Svelte. There are no new Composer or npm dependencies.

Works on an [admin panel](../getting-started/installation) and on a [starter kit](../getting-started/starter-kits) panel (`->starterKit()`), where its pages are listed in your app's sidebar. It needs a panel, so it doesn't apply to [standalone](../standalone/overview) components.

## Installation

```bash
composer require alfasix/alfakit-analytics
php artisan vendor:publish --tag=alfakit-analytics-migrations
php artisan migrate
```

Exports use AlfaKit's exporter, so its tables must exist (`php artisan vendor:publish --tag=alfakit-import-export-migrations`, already there if you export anything else). Publish the config to change routes, retention or limits:

```bash
php artisan vendor:publish --tag=alfakit-analytics-config
```

On SQLite (a new Laravel app's default), give the connection a busy timeout (`'busy_timeout' => 5000` for `sqlite` in `config/database.php`): hits are stored after each response, and without it two page views close together can fail with "database is locked" and be lost.

The plugin schedules `alfakit-analytics:aggregate` hourly; make sure the Laravel scheduler runs (`php artisan schedule:work` locally, a cron entry in production).

## Register

```php
use AlfaSix\AlfakitAnalytics\AnalyticsPlugin;
use App\Models\User;

$panel->plugin(
    AnalyticsPlugin::make()
        ->authorize(fn (User $user): bool => $user->is_admin)
        ->navigationGroup('Marketing'),
);
```

`$user->is_admin` stands for your own check: a new Laravel app's `users` table has no such column, so use a role, a gate or a column you add. The closure's `bool` return type is strict: SQLite returns `0`/`1` and a model created without the attribute holds `null`, so cast the column to `boolean` and give it a default, or return `(bool) $user->is_admin`.

Then open **Analytics → Sites**, add a site (name and domain) and copy its snippet.

## Collecting visits

### The snippet

In a Blade layout of your public site:

```blade
<head>
    @alfakitAnalytics('your-site-key')
</head>
```

Without an argument it uses the `default_site` config key. `Analytics::script($site, ['nonce' => $nonce])` returns the same tag with extra attributes (`data-local` also counts `localhost`, which is skipped by default).

The script reports page views on load and after `history.pushState` navigations (Inertia, Turbo, SPAs), once per path. Custom events:

```html
<button data-alfakit-event="Download" data-alfakit-prop-file="guide.pdf">Download</button>

<script>
    window.alfakit.track('Signup', { plan: 'pro' })
</script>
```

### React, Vue and Svelte

On Inertia public pages, mount the component once in your layout; it follows Inertia navigations:

```tsx
// React
import { AlfakitAnalytics, trackAnalyticsEvent } from '@alfakit/react'

;<AlfakitAnalytics siteKey="your-site-key" />

trackAnalyticsEvent('Signup', { plan: 'pro' })
```

```vue
<!-- Vue -->
<script setup lang="ts">
import { AlfakitAnalytics } from '@alfakit/vue'
</script>

<template>
    <AlfakitAnalytics site-key="your-site-key" />
</template>
```

```svelte
<!-- Svelte -->
<script lang="ts">
    import { AlfakitAnalytics } from '@alfakit/svelte'
</script>

<AlfakitAnalytics siteKey="your-site-key" />
```

Props: `siteKey`, `endpoint` (default `/alfakit-analytics/event`) and `trackLocalhost`. `trackAnalyticsEvent()` is exported by every renderer (from `@alfakit/core`) and does nothing on the server, before the component mounts, or when the visitor opted out.

### On the server

```php
use AlfaSix\AlfakitAnalytics\Analytics;

// A custom event for the visitor of the current request (same visit as their page views)
Analytics::track('Signup', ['plan' => 'pro']);

// Another site, request or URL
Analytics::track('Purchase', ['total' => 49], site: 'shop-key', url: 'https://shop.example.com/checkout');

// A page view without JavaScript
Analytics::pageview();
```

Or record page views with the middleware (successful `GET` requests for HTML pages and Inertia visits; prefetches, partial reloads and JSON calls are skipped; the hit is stored after the response is sent):

```php
Route::middleware('alfakit-analytics')->group(function () { /* … */ });        // default site
Route::middleware('alfakit-analytics:your-site-key')->group(function () { /* … */ });
```

Events tracked from queued jobs or commands have no visitor and are recorded as they are.

### What is dropped

- browsers that send Do Not Track (`DNT: 1`) or Global Privacy Control (`Sec-GPC: 1`), both in the snippet and on the server (`respect_do_not_track`);
- bots: crawlers, previews, monitors, headless browsers and HTTP libraries, from a built-in list plus `bot_patterns`;
- hostnames other than the site's `domain` and `domains` (`*.example.com` allows subdomains; an empty domain accepts any);
- paths matching `exclude_paths` (`'/admin*'`), and paused sites.

The collection endpoint answers `202` for every valid hit, counted or not.

## The dashboard

**Analytics** shows one site at a time (a site switcher appears with several):

- **Visitors now** (the last `realtime_window` minutes) and the period's visitors, page views, views per visit, bounce rate and visit duration, each with a sparkline. On `realtime()` panels the cards refresh as visits are recorded; elsewhere they poll at `realtimePollingInterval()`.
- **Visitors over time**: hours for a single day, days, or months for ranges over 120 days. The chart's dropdown picks the metric.
- **Top lists**: pages (top, entry, exit), sources (source, channel, referrer), campaigns (UTM campaign, source, medium, content, term), locations, devices (device, browser, operating system), custom events and goals with conversion rates.
- **Period**: today, yesterday, last 7 or 30 days, this or last month, this year, last 12 months, or a custom range.
- **Compare** adds the previous period: changes on the cards and rows, and a dashed line on the chart.
- **Filters**: click any row to filter the whole dashboard by it (only visitors from Google, only `/pricing`, only mobile…). Filters combine; each shows as a button in the header that removes it. Filtering by a custom event adds a tab per property of that event.

Everything lives in the URL (`?site=1&period=7d&compare=1&filter[source]=Google`), so any view can be bookmarked or shared with colleagues.

**Export top list** (in the ⋮ menu) exports any list, with the current period and filters, through AlfaKit's exporter: CSV or XLSX on the queue, with a download link in the notification bell.

### Goals

Each site has goals (in its form): a **page visit** (`/checkout/thanks`, or `/blog/*` with a wildcard) or a **custom event** (`Signup`), with an optional display name. The goals card lists conversions (unique visitors who reached the goal) and the conversion rate.

## Sites and multi-tenancy

On tenancy panels, every tenant manages its own sites; sites, the dashboard and exports are scoped to the current tenant and a site of another tenant can't be opened, whatever the URL says. `scopeToTenant(false)` shares panel-wide sites instead.

Each site has a public **key** (sent by the snippet; it is not a secret), a **timezone** (days and hours are counted in it) and can be **paused**.

## Shared dashboards

Turn on **Public link** on a site to give anyone a read-only dashboard, served by your app outside the panel (no sign-in, no panel assets): KPIs, the chart and the top lists, with the period picker, comparison and click-to-filter.

```php
$url = Analytics::shareUrl($site);                       // or from the dashboard's ⋮ → Share link
$url = Analytics::shareUrl($site, now()->addWeek());     // expires
```

Links are signed and carry the site's share token. **Rotate share link** (sites table) or turning sharing off revokes every link handed out; `AnalyticsPlugin::make()->sharing(false)` disables the feature. Shared pages send `noindex` and `Referrer-Policy: no-referrer`, and are rate limited.

## Authorisation

- `authorize()` on the plugin decides who may open the dashboard and manage sites.
- A policy registered for `AlfaSix\AlfakitAnalytics\Models\Site` is honoured too: `viewAny` (the page and the resource), `view` (a site's dashboard and exports), `update` (sharing), and the usual resource abilities.

```php
Gate::policy(Site::class, SitePolicy::class);
```

The collection endpoint is public and stateless by design: it accepts hits for any active site key, validates them and rate limits them per IP address (`rate_limit`, 120 per minute by default).

## Options

```php
AnalyticsPlugin::make()
    ->authorize(fn (User $user): bool => $user->can('view analytics'))
    ->scopeToTenant()                       // each tenant has its own sites (default)
    ->sharing()                             // allow shared links (default)
    ->topListLimit(10)                      // rows per top list
    ->realtimePollingInterval('15s')        // without realtime(); null turns polling off
    ->siteResource()                        // register the sites resource (default)
    ->usingPage(MyAnalyticsDashboard::class)
    ->usingSiteResource(MySiteResource::class)
    ->navigationLabel('Analytics')
    ->navigationGroup('Marketing')
    ->navigationIcon('chart-line')
    ->navigationSort(5)
    ->registerNavigation();
```

`config/alfakit-analytics.php`:

| Key                     | Default             | Meaning                                                                   |
| ----------------------- | ------------------- | ------------------------------------------------------------------------- |
| `route_prefix`          | `alfakit-analytics` | Prefix of the collection, script and share routes                         |
| `middleware`            | `[]`                | Extra middleware of those routes                                          |
| `rate_limit`            | `120`               | Hits per minute per IP address                                            |
| `default_site`          | `null`              | Site key used when none is given                                          |
| `respect_do_not_track`  | `true`              | Drop hits from browsers sending DNT or GPC                                |
| `session_timeout`       | `30`                | Minutes of inactivity that end a visit                                    |
| `realtime_window`       | `5`                 | Minutes a visitor counts as "now"                                         |
| `raw_retention_days`    | `60`                | Days raw visits and events are kept (filters and hourly charts need them) |
| `rollup_retention_days` | `null`              | Days daily rollups are kept (`null`: forever)                             |
| `schedule`              | `true`              | Schedule `alfakit-analytics:aggregate` hourly                             |
| `country_header`        | `null`              | Header with the visitor's country, e.g. `CF-IPCountry`                    |
| `bot_patterns`          | `[]`                | Extra user-agent fragments treated as bots                                |
| `exclude_paths`         | `[]`                | Paths never recorded (`*` wildcard)                                       |
| `max_properties`        | `30`                | Properties per custom event                                               |

## Storage, rollups and retention

Hits are stored as raw **visits** (sessions) and **events** (page views and custom events, with their properties). `alfakit-analytics:aggregate` writes **daily rollups** per site, local date, dimension and value; the dashboard reads rollups for finished days and raw data for today (and any day not aggregated yet), so the numbers are identical either way. Filtered views always read raw data, so they cover `raw_retention_days`; the dashboard says so when a range reaches further back.

```bash
php artisan alfakit-analytics:aggregate                     # last 3 finished days, then retention
php artisan alfakit-analytics:aggregate --days=30
php artisan alfakit-analytics:aggregate --from=2026-01-01 --to=2026-01-31 --site=your-site-key
php artisan alfakit-analytics:aggregate --no-prune
```

Re-aggregate a range after changing a site's goals or timezone (while its raw data is kept). Before raw data is pruned, days without rollups are aggregated, so nothing is lost. It works on MySQL, PostgreSQL and SQLite.

Unique visitors are counted per day (see below), so the visitors of a range are the sum of each day's.

## Countries

No GeoIP database is bundled. Either let your CDN or proxy add a header and set `country_header` (`CF-IPCountry` on Cloudflare, `CloudFront-Viewer-Country` on CloudFront), or bind a resolver:

```php
use AlfaSix\AlfakitAnalytics\Contracts\ResolvesCountry;
use GeoIp2\Database\Reader;
use Illuminate\Http\Request;

// composer require geoip2/geoip2, then download GeoLite2-Country.mmdb from MaxMind (free account)
class MaxMindCountryResolver implements ResolvesCountry
{
    public function __construct(private Reader $reader) {}

    public function resolve(?string $ip, ?Request $request): ?string
    {
        try {
            return $ip === null ? null : $this->reader->country($ip)->country->isoCode;
        } catch (\Throwable) {
            return null;
        }
    }
}

// AppServiceProvider::register()
$this->app->singleton(Reader::class, fn () => new Reader(storage_path('app/geoip/GeoLite2-Country.mmdb')));
$this->app->bind(ResolvesCountry::class, MaxMindCountryResolver::class);
```

Only the two-letter code is stored; the IP address is used in memory and discarded.

## Privacy

What is **collected** for each hit:

- the page's hostname and path (the query string and fragment are dropped, except the five `utm_*` parameters and `ref`/`source`);
- the referring site and path (without its query string), turned into a source and a channel;
- browser name, operating system and device type, parsed from the user agent, which is then discarded;
- the country (only if you configure a resolver or header);
- custom event names and the properties your code sends;
- an anonymous visitor id: the first 64 bits of an HMAC-SHA256 of the site, the IP address and the user agent, keyed with a random salt that is replaced every UTC day. The previous salt is deleted when it is replaced, so ids can't be recomputed, can't be linked across days, and say nothing about the person.

What is **not** collected or stored: IP addresses, full user agents, cookies, local or session storage, fingerprints, any persistent identifier, query strings or form data. Visitors who send Do Not Track or Global Privacy Control are not counted at all. The data stays in your database; nothing is sent to third parties.

**GDPR and cookie banners.** Because the plugin sets no cookies, reads nothing from the visitor's device and keeps no persistent identifier, many sites using this kind of analytics conclude that they don't need consent for it; Plausible and Fathom take the same approach. Whether that holds for you depends on your jurisdiction, your other tools and how you use the data (custom event properties included: never send personal data such as emails or names). Mention the analytics in your privacy policy, and consult your own legal advice before deciding not to ask for consent.

## Security notes

- The site key is public; protection comes from validation, hostname checks, bot filtering and per-IP rate limiting. Hits from other hostnames are dropped when the site has a domain.
- Request bodies are capped at 8 KB, event names at 64 characters, properties at `max_properties` scalar values of 256 characters.
- The collection and script routes run without sessions, cookies or CSRF; the rate limiter key is a hash of the IP address.
- Dashboards authorise every request from the panel's context token; tenant isolation is enforced on sites, the dashboard, filters and exports.
- Shared links are signed (optionally expiring) and revocable; the period and filters are the only unsigned parameters.

## Testing

```php
use AlfaSix\AlfakitAnalytics\Models\Site;
use AlfaSix\AlfakitAnalytics\Support\Hit;
use AlfaSix\AlfakitAnalytics\Analytics;

$site = Site::create(['name' => 'Example', 'domain' => 'example.com']);

Analytics::record($site, new Hit('pageview', 'https://example.com/pricing', userAgent: 'Mozilla/5.0 (…) Chrome/126.0 Safari/537.36', ip: '203.0.113.7'));
```

`AlfaSix\AlfakitAnalytics\Support\Stats::for($site, Period::preset('7d', 'UTC'))` returns the numbers the dashboard shows (`totals()`, `timeseries()`, `breakdown('source')`).

## "Powered by" credit

The pages and emails your customers see carry no AlfaKit or Alfa Six branding by default. To credit AlfaKit, turn on the small "Powered by AlfaKit · Alfa Six" line for shared dashboard links:

```php
AnalyticsPlugin::make()->poweredBy();
```

Without `poweredBy()`, the plugin follows `config('alfakit.credit.public_pages')` and `config('alfakit.credit.emails')`, both `false` by default. See [Credits](../panels/configuration#credits).
