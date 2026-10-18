# AlfaKit vs Filament v5 benchmark

> **The benchmark suite** (`pnpm bench`, `scripts/bench/`) is the current harness: the React, Vue and Svelte playgrounds and this Filament app on five scenarios (tables of 50 and 500 rows with filters, a form with 100 fields and a repeater, a dashboard with six widgets, global search), server and browser (Playwright) measurements, and the hardware recorded with every result in `results/suite/`. See [Performance](../docs/content/getting-started/performance.md#benchmark-suite). The Filament app below serves its scenarios too (`app/Filament/Pages/FormBenchmark.php`, `DashboardBenchmark.php` and `Pages/Benchmark/Widgets/`, 500 rows per page and global search on the resource). This file documents the earlier focused run (`run.mjs`).

A reproducible comparison of the same admin scenario built with AlfaKit (React renderer, Inertia v3) and with Filament v5 (Livewire 4). Numbers in this file come from the runs recorded in `results/`; nothing here is estimated.

## Scenario

Identical data, schema and definitions in both apps:

- `benchmark_records`: 10,000 rows with two `belongsTo` relationships (`benchmark_vendors`, 50 rows; `benchmark_regions`, 12 rows). Generated deterministically by `data/generate.php` (seeded `mt_rand`) into `data/*.csv`; both seeders load the same CSV files, so the row contents are byte-identical.
- List page: 12 columns (`sku`, `name`, `vendor.name`, `region.name`, a `status` badge, an `is_active` toggle column, `quantity`, `unit_price` as money, `weight`, `rating`, `shipped_at`, `created_at`), two searchable columns, a status filter, edit/delete record actions, a delete bulk action, 25 rows per page by default (10/25/50/100 options).
- Form page: a `TextInput` with `live()` and `afterStateUpdated()` that writes to a second field, and a `Repeater` of N items (`?items=100`, `?items=500`) with four fields each.

| App                | Where                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| AlfaKit            | `playground/react`: `app/Alfakit/Resources/Benchmark/`, `app/Alfakit/Pages/Benchmark/`, `app/Models/Benchmark/`, `database/seeders/Benchmark/`, `routes/benchmark.php` |
| Filament v5        | `filament-app/` (scratch Laravel app, not part of the pnpm/composer workspaces): `app/Filament/`, `app/Models/Benchmark/`, `database/seeders/Benchmark/`                |

Both apps expose `GET /benchmark/login` (local environment only) which signs in `admin@example.com` so the driver never touches a login form.

## What is measured

`run.mjs` (Node 22, built-in `fetch`, one sequential client with a cookie jar) does 3 warm-up requests and then N = 20 timed requests per scenario and reports median and p95 of:

- **TTFB**: time from the start of `fetch()` until the response headers arrive.
- **Total**: until the whole body has been read.
- **Size**: body size in bytes (uncompressed, as produced by PHP; the servers gzip on the wire).

Scenarios:

| Scenario                | AlfaKit request                                                                                                                   | Filament request                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_25_html`          | `GET /admin/benchmark-records` (full HTML)                                                                                        | `GET /admin/benchmark-records` (full HTML)                                                                                                         |
| `list_100_html`         | `GET …?perPage=100`                                                                                                               | `GET …?perPage=100` (the Filament resource reads `perPage` from the query string for the first render; Filament itself keeps it in the component) |
| `sort_*`                | Inertia partial reload: `GET …?sort=name&direction=asc` with `X-Inertia-Partial-Data: page`, what the renderer sends on a header click | Livewire update: `POST /livewire/update` calling `sortTable('name', 'asc')` with the component snapshot of the rendered page                         |
| `search_*`              | Partial reload `GET …?search=alpha`                                                                                               | Livewire update setting `tableSearch = "alpha"`                                                                                                    |
| `form_{100,500}_html`   | `GET /admin/repeater-benchmark?items=N`                                                                                           | same                                                                                                                                               |
| `live_update_{100,500}` | `POST /_alfakit/schema/refresh` with the form state and fingerprints, path `title` (what a `live()` field sends)                   | Livewire update setting `data.title` (what `wire:model.live` sends)                                                                                |

Browser measurements (navigation timing, DOM node count, JS heap) are taken by hand, five samples per page, in Chrome driven through the Claude in Chrome extension (the first run used the Claude desktop app's browser pane, single samples). They are navigations of a real browser, not the harness, and are reported separately below.

## Environment (run of 2026-10-11)

- Apple M5, 16 GB, macOS 27.0; Laravel Herd 1.30.2 (nginx + PHP-FPM, PHP 8.4.23 with OPcache enabled), SQLite for both apps.
- Both apps: `APP_DEBUG=false`, `php artisan optimize` (config, route, event and view caches), warm OPcache, production asset builds, same machine, run back to back.
- AlfaKit: `laravel/framework` 13.35.0, `inertiajs/inertia-laravel` 3.5.1, `@inertiajs/react` 3.8.0, React 19.3.0, `@alfakit/react` from this repository (built with `pnpm --filter @alfakit/playground-react build:ssr`), SSR via `node bootstrap/ssr/ssr.js` (on port 13715 for the afternoon run, because another project's SSR server held 13714; `INERTIA_SSR_URL` pointed at it).
- Filament: `filament/filament` 5.10.1, `livewire/livewire` 4.4.7, `laravel/framework` 13.35.0, assets published by `filament:install`, `filament:optimize`.
- Driver: Node 22.23.0.

## Results

Medians over 20 runs; p95 in parentheses; sizes are uncompressed bodies. This is the run of 2026-10-11 (afternoon) after repeater and table row virtualisation landed; raw samples: `results/2026-10-11-virtualised-ssr.json` (AlfaKit with SSR and Filament) and `results/2026-10-11-virtualised-csr.json` (AlfaKit with SSR disabled). The morning run before virtualisation is kept in `results/2026-10-11-csr.json` (its SSR counterpart was overwritten by the afternoon run and is no longer available; its headline numbers are quoted below).

| Scenario                        | AlfaKit, SSR on          | AlfaKit, SSR off        | Filament v5                |
| ------------------------------- | ------------------------ | ----------------------- | -------------------------- |
| List, 25 rows: TTFB             | 83 ms (124)              | 53 ms (56)              | 131 ms (137)               |
| List, 25 rows: HTML size        | 287 KB                   | 39 KB                   | 811 KB                     |
| List, 100 rows: TTFB            | 185 ms (222)             | 133 ms (140)            | 205 ms (212)               |
| List, 100 rows: HTML size       | 319 KB                   | 104 KB                  | 2.78 MB                    |
| Sort (one interaction)          | 46 ms (49), 25 KB        | 48 ms (48), 25 KB       | 128 ms (132), 789 KB       |
| Search (one interaction)        | 47 ms (49), 25 KB        | 48 ms (51), 25 KB       | 126 ms (130), 792 KB       |
| Form, 100-item repeater: TTFB   | 113 ms (137), 223 KB     | 86 ms (88), 81 KB       | 147 ms (153), 1.77 MB      |
| Live field update, 100 items    | 20 ms (21), 0.3 KB back  | 21 ms (22), 0.3 KB back | 138 ms (140), 1.80 MB back |
| Form, 500-item repeater: TTFB   | 352 ms (359), 483 KB     | 292 ms (304), 340 KB    | 380 ms (387), 8.65 MB      |
| Live field update, 500 items    | 45 ms (46), 0.3 KB back  | 43 ms (51), 0.3 KB back | 345 ms (419), 8.92 MB back |

Request payloads of the live update: AlfaKit sends the form state (7 KB for 100 items, 34 KB for 500); Livewire sends the component snapshot (14 KB and 69 KB).

What virtualisation changed on the server side: with SSR on, Node now renders only the first window of repeater items and table rows, so the SSR HTML of the 500-item form went from 5.05 MB to 483 KB and its TTFB from 543 ms to 352 ms (for reference, Filament measured 375 ms in the morning run and 380 ms in the afternoon run on the same page). The 100-row list SSR HTML went from 967 KB to 319 KB. SSR-off numbers are unchanged within noise, as expected: the JSON payload is the same.

### Browser measurements (hand-driven, 5 samples each)

Taken right after the harness run, in Chrome 154 through the Claude in Chrome extension, same builds and `.env`. Each sample is a full navigation; values come from `performance.getEntriesByType('navigation')[0]` (ms since navigation start), `document.getElementsByTagName('*').length` and `performance.memory.usedJSHeapSize`, read 2–4 s after navigation. Raw samples and medians: `results/2026-10-11-virtualised-browser.json`.

| Page                         | TTFB   | DOM interactive | DOMContentLoaded | load    | DOM nodes | JS heap (min of 5)   |
| ---------------------------- | ------ | --------------- | ---------------- | ------- | --------- | -------------------- |
| AlfaKit list 25, SSR on      | 204 ms | 222 ms          | 229 ms           | 290 ms  | 2,253     | not recorded         |
| AlfaKit list 25, SSR off     | 104 ms | 121 ms          | 129 ms           | 193 ms  | 2,251     | not recorded         |
| AlfaKit form 500, SSR on     | 414 ms | 431 ms          | 437 ms           | 485 ms  | 611       | 14.3 MB (median 18.6)|
| AlfaKit form 500, SSR off    | 340 ms | 359 ms          | 365 ms           | 422 ms  | 609       | 23.8 MB (median 26.8)|
| Filament form 500            | 422 ms | 614 ms          | 2,460 ms         | 2,523 ms| 33,515    | 81.8 MB (then growing)|

The 500-item repeater now keeps about 610 DOM nodes in the page instead of the 29,696 measured before virtualisation (Filament renders all 33,515). Filament's DOMContentLoaded is late because Alpine and Livewire initialise all of those nodes on the main thread before the event fires; the AlfaKit page's DOMContentLoaded does not include the React render (Inertia loads the page module asynchronously), so compare `load` or the DOM node counts, not DOMContentLoaded alone. Heap figures are noisy because the same tab was reused and the heap grows across navigations until a garbage collection (Filament's samples went 82 → 138 → 195 → 228 → 255 MB; AlfaKit's stayed between 14 and 40 MB).

**First Contentful Paint and Largest Contentful Paint were still not measured.** Both browsers available to the agent (the Claude desktop app's browser pane and the Chrome extension tab) were occluded by other windows during the run (`document.visibilityState === 'hidden'` on every sample), and Chromium defers first paint for hidden documents: `performance.getEntriesByType('paint')` stayed empty until a screenshot forced a paint, at which point the FCP timestamp was the screenshot time (13–24 s), not the page's. Numbers taken that way would be meaningless, so none are reported. The browser TTFB above is higher than the harness TTFB because it includes the browser's connection setup and the extension's navigation overhead.

## Reading the numbers

- Interactions are where the architectures differ most. A sort or search in AlfaKit is an Inertia partial reload that returns the `page` prop as JSON (25 KB); Livewire re-renders the component and returns its HTML (about 790 KB for 25 rows). A `live()` field update in AlfaKit returns only the components whose fingerprint changed (332 bytes); Livewire returns the re-rendered form.
- Full page loads are closer. With SSR on, AlfaKit renders the React tree in Node and ships both the HTML and the JSON payload, so the HTML is larger than the JSON alone; since repeater items and table rows are virtualised, Node only renders the first window, which brought the 500-item form from 543 ms / 5.05 MB down to 352 ms / 483 KB (Filament measured 380 ms in the same run). With SSR off the same page is 292 ms and 340 KB. SSR is optional in AlfaKit; it still adds 30–60 ms of TTFB on every page (the Node render) in exchange for content in the first response.
- Filament v5 is itself much faster than v3/v4 thanks to the Filament team's own performance work (see [Help make Filament faster](https://laravel-news.com/help-make-filament-faster)); this comparison is against that improved baseline. The two projects make different architectural trade-offs, and these numbers describe one scenario, not either project as a whole.

## Caveats

- Results depend on hardware, configuration, data and versions; treat ratios as indicative and run `run.mjs` yourself. This is one machine, one run of 20 per scenario, SQLite, loopback network.
- Corrections are welcome: if your numbers differ or the setup is unfair to either project, open an issue at https://github.com/alfasixbh/alfakit/issues with your setup and results.
- Sizes are uncompressed. Both servers gzip responses; the compressed sizes were not recorded by the driver.
- The Filament app is a stock install with the default theme; the AlfaKit playground panel has extra features switched on (multi-factor, locales, theme picker) that add to its payload.
- AlfaKit's `perPage` query key and the `/benchmark/login` route are the only things the driver relies on; the Filament `defaultPaginationPageOption` closure reading `?perPage` exists only to make the 100-row first render possible without a Livewire round trip.
- The browser figures are five hand-taken samples per page from an occluded Chrome tab; they include no paint timings (see above) and the heap figures are affected by garbage-collection timing.

## Re-running

```bash
# Data (already committed; regenerate if you change the generator)
php benchmarks/data/generate.php

# AlfaKit playground
cd playground/react
php artisan migrate && php artisan db:seed --class="Database\Seeders\Benchmark\BenchmarkSeeder"
pnpm --filter @alfakit/playground-react build:ssr
# in .env: APP_DEBUG=false; optional INERTIA_SSR_ENABLED=false for the CSR run
# (if port 13714 is taken, change the port in bootstrap/ssr/ssr.js and set INERTIA_SSR_URL)
php artisan optimize && node bootstrap/ssr/ssr.js &

# Filament scratch app (first time: composer install, cp .env.example .env, php artisan key:generate)
cd benchmarks/filament-app
php artisan migrate && php artisan db:seed --class="Database\Seeders\Benchmark\AdminUserSeeder" && php artisan db:seed --class="Database\Seeders\Benchmark\BenchmarkSeeder"
herd link filament-bench          # serves http://filament-bench.localhost
# in .env: APP_DEBUG=false
php artisan optimize && php artisan filament:optimize

# Measure (from the repo root)
node benchmarks/run.mjs --runs 20 --warmup 3 --label ssr
ALFAKIT_URL=http://alfakit-react.localhost FILAMENT_URL=http://filament-bench.localhost node benchmarks/run.mjs --only alfakit --label csr
```

Afterwards restore the playground (`APP_DEBUG=true`, `php artisan optimize:clear`, stop the SSR server). The `benchmarks/` directory is excluded from the repository's lint, format and test commands.
