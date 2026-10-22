---
title: Performance
description: Why AlfaKit pages and interactions are light, the reproducible benchmark suite (React, Vue, Svelte and Filament v5) with the hardware it ran on, and how to run it yourself.
---

# Performance

Admin panels spend most of their life on two things: loading a table and reacting to a click. AlfaKit's architecture is built so that both stay small, and we measure it with a public, reproducible harness.

## Why it is fast

- **The schema is JSON, sent once.** PHP serialises a page (its table, form, actions and widgets) into a plain array. The renderer receives it as Inertia props and keeps it in memory. There is no server-rendered HTML to re-send on every interaction.
- **Interactions are Inertia partial reloads.** Sorting, searching, filtering, paging and toggling columns change the query string and reload only the `page` prop. The response is the table's records as JSON, not the HTML of the whole component. Browser state (scroll position, selection, open menus) is preserved.
- **State lives in the browser.** Form values, table selection and notifications are held by `@alfakit/core` stores. A `live()` field posts the form state to a small endpoint, PHP re-evaluates your closures, and the response contains only the components whose fingerprint changed ([Reactivity](../forms/reactivity#partial-refreshes)).
- **Polling is component-scoped.** A polled table or widget refreshes its own schema through one shared request per interval and pauses while the tab is hidden; the rest of the page is untouched.
- **Widgets are lazy by default.** The first response carries placeholders; the widget data arrives in a single deferred Inertia request right after, so a dashboard paints before its queries finish ([Widgets](../widgets/overview)).
- **Heavy editors are code-split.** The rich editor, the code editor, Chart.js and the components of first-party plugins (calendar, kanban, tree and the rest) ship as separate chunks that load only on pages that use them. A plugin you don't install adds nothing to what the browser downloads. The renderer package still lists their libraries (TipTap, FullCalendar, Chart.js) as npm dependencies, so `npm install` fetches them either way; they just never reach your bundle unless a page uses them.
- **SSR is optional.** Pages render on the client by default; enable Inertia SSR when first paint matters more than payload size ([Server-side rendering](../advanced/ssr)). For very large forms SSR adds more to the response than it gives back, as the numbers below show.
- **All queries, validation and authorisation stay in PHP.** The frontend never duplicates server logic, so there is nothing to keep in sync and nothing extra to download.

## Benchmark suite

`pnpm bench` measures the three AlfaKit playgrounds (React, Vue, Svelte) and, when it is served locally, the Filament v5 app in [`benchmarks/filament-app`](https://github.com/alfasixbh/alfakit/tree/main/benchmarks/filament-app) on the same scenarios, data (10,000 generated rows, two relationships) and definitions:

| Scenario                      | Page                                   | Interaction measured                                           |
| ----------------------------- | -------------------------------------- | -------------------------------------------------------------- |
| Table, 50 rows, with filters  | `/admin/benchmark-records?perPage=50`  | Sort by name (Inertia partial reload / Livewire update)        |
| Table, 500 rows, with filters | `/admin/benchmark-records?perPage=500` | Sort by name                                                   |
| Form, 100 fields + repeater   | `/admin/form-benchmark`                | Type into a `live()` field until the dependent field updates   |
| Dashboard, 6 widgets          | `/admin/dashboard-benchmark`           | (load only: two stats overviews, three charts, a table widget) |
| Global search                 | `/admin/benchmark-records?perPage=10`  | Type a SKU until its record shows in the results               |

For each target and scenario it records, as medians after warm-up runs:

- **Server**: time to first byte and size (uncompressed and gzip) of the full HTML page, and the response time and size of the request behind the interaction (and of the dashboard's deferred widget data in AlfaKit), with one sequential HTTP client.
- **Browser** (Chrome through Playwright, headless): time to interactive (the page is usable, meaning rows rendered, 100 fields mounted or all six widgets loaded, and the main thread has been free of long tasks for 500 ms), total blocking time, first contentful paint, DOM node count, JS heap and transferred bytes; and the interaction latency from the input until the result is painted.
- **The machine**: CPU model, cores, memory, OS, PHP and Node versions, the browser version, and what each app reports through `GET /benchmark/info` (PHP-FPM version, OPcache, Laravel, debug mode, config cache, Inertia SSR, package versions). Targets are measured in turn within each run, so load on the machine affects them alike.

The tables below are written by the suite from the latest results file; nothing in them is typed by hand.

<!-- bench:results:start -->

<!-- Generated by `pnpm bench --update-docs` / `pnpm bench:docs` from benchmarks/results/suite/2026-10-21-m5-0.1.6.json. Do not edit by hand. -->

### Benchmark results (2026-10-21, label `m5-0.1.6`)

|                           |                                                                                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CPU                       | Apple M5 (Mac17,2)                                                                                                                                                                  |
| Cores                     | 10 (4 performance + 6 efficiency)                                                                                                                                                   |
| Memory                    | 16 GB                                                                                                                                                                               |
| Operating system          | macOS 27.0 (26A428) (arm64)                                                                                                                                                         |
| PHP (CLI)                 | 8.4.23                                                                                                                                                                              |
| Node                      | v22.23.0                                                                                                                                                                            |
| Browser                   | Chrome 155.0.8059.85 (headless, 1440×900, Playwright)                                                                                                                               |
| AlfaKit (React) server    | PHP 8.4.23 (fpm-fcgi, OPcache on), Laravel 13.35.0, APP_DEBUG false, config and route cache on, sqlite, Inertia SSR off; alfasix/alfakit dev-main, inertiajs/inertia-laravel v3.5.1 |
| AlfaKit (Vue) server      | PHP 8.4.23 (fpm-fcgi, OPcache on), Laravel 13.35.0, APP_DEBUG false, config and route cache on, sqlite, Inertia SSR off; alfasix/alfakit dev-main, inertiajs/inertia-laravel v3.5.1 |
| AlfaKit (Svelte) server   | PHP 8.4.23 (fpm-fcgi, OPcache on), Laravel 13.35.0, APP_DEBUG false, config and route cache on, sqlite, Inertia SSR off; alfasix/alfakit dev-main, inertiajs/inertia-laravel v3.5.1 |
| Filament v5 server        | PHP 8.4.23 (fpm-fcgi, OPcache on), Laravel 13.35.0, APP_DEBUG false, config and route cache on, sqlite; filament/filament v5.10.1, livewire/livewire v4.4.7                         |
| Method                    | 2 warm-up + 7 measured runs per scenario, medians; 2026-10-21                                                                                                                       |
| Load average (1/5/15 min) | 2.93 / 3.14 / 3.26 at the start, 2.42 / 3.11 / 3.26 at the end                                                                                                                      |

#### Server: full page (median time to first byte, HTML size uncompressed / gzip)

| Scenario                      | AlfaKit (React)            | AlfaKit (Vue)              | AlfaKit (Svelte)           | Filament v5                 |
| ----------------------------- | -------------------------- | -------------------------- | -------------------------- | --------------------------- |
| Table, 50 rows, with filters  | 29 ms, 105.4 KB / 22.0 KB  | 28 ms, 101.8 KB / 21.6 KB  | 30 ms, 105.6 KB / 22.0 KB  | 72 ms, 1.46 MB / 44.7 KB    |
| Table, 500 rows, with filters | 145 ms, 501.6 KB / 54.2 KB | 128 ms, 496.2 KB / 53.8 KB | 130 ms, 502.7 KB / 54.3 KB | 382 ms, 13.41 MB / 281.0 KB |
| Form, 100 fields + repeater   | 19 ms, 89.1 KB / 22.5 KB   | 18 ms, 85.6 KB / 22.2 KB   | 20 ms, 89.1 KB / 22.6 KB   | 35 ms, 516.5 KB / 23.1 KB   |
| Dashboard, 6 widgets          | 16 ms, 60.2 KB / 16.8 KB   | 15 ms, 56.7 KB / 16.5 KB   | 17 ms, 60.3 KB / 16.9 KB   | 19 ms, 66.2 KB / 10.9 KB    |
| Global search                 | 20 ms, 70.4 KB / 18.6 KB   | 19 ms, 66.9 KB / 18.3 KB   | 23 ms, 70.5 KB / 18.6 KB   | 35 ms, 409.4 KB / 23.2 KB   |

#### Server: the request behind the interaction (median response time, response size)

| Scenario                                               | AlfaKit (React)  | AlfaKit (Vue)    | AlfaKit (Svelte) | Filament v5      |
| ------------------------------------------------------ | ---------------- | ---------------- | ---------------- | ---------------- |
| Table, 50 rows, with filters: sort by name             | 24 ms, 47.9 KB   | 24 ms, 47.7 KB   | 24 ms, 48.0 KB   | 74 ms, 1.46 MB   |
| Table, 500 rows, with filters: sort by name            | 132 ms, 445.8 KB | 132 ms, 443.9 KB | 133 ms, 446.8 KB | 459 ms, 13.75 MB |
| Form, 100 fields + repeater: `live()` field round trip | 14 ms, 4.6 KB    | 14 ms, 4.6 KB    | 13 ms, 4.6 KB    | 32 ms, 486.8 KB  |
| Dashboard, 6 widgets: widget data                      | 20 ms, 6.4 KB    | 20 ms, 6.4 KB    | 20 ms, 6.4 KB    | n/a              |
| Global search: type a SKU until results show           | 51 ms, 0.2 KB    | 51 ms, 0.2 KB    | 51 ms, 0.2 KB    | 50 ms, 7.1 KB    |

#### Browser: page load (median time to interactive; total blocking time; DOM nodes)

| Scenario                      | AlfaKit (React)               | AlfaKit (Vue)                 | AlfaKit (Svelte)              | Filament v5                        |
| ----------------------------- | ----------------------------- | ----------------------------- | ----------------------------- | ---------------------------------- |
| Table, 50 rows, with filters  | 196 ms; TBT 0 ms; 4,719 nodes | 228 ms; TBT 0 ms; 4,711 nodes | 278 ms; TBT 0 ms; 4,839 nodes | 279 ms; TBT 30 ms; 3,510 nodes     |
| Table, 500 rows, with filters | 290 ms; TBT 0 ms; 1,771 nodes | 285 ms; TBT 0 ms; 1,763 nodes | 324 ms; TBT 0 ms; 1,815 nodes | 2645 ms; TBT 1304 ms; 31,500 nodes |
| Form, 100 fields + repeater   | 174 ms; TBT 0 ms; 2,335 nodes | 208 ms; TBT 0 ms; 2,348 nodes | 215 ms; TBT 0 ms; 2,221 nodes | 164 ms; TBT 0 ms; 2,068 nodes      |
| Dashboard, 6 widgets          | 192 ms; TBT 0 ms; 1,076 nodes | 198 ms; TBT 0 ms; 1,073 nodes | 218 ms; TBT 0 ms; 1,094 nodes | 151 ms; TBT 0 ms; 496 nodes        |
| Global search                 | 123 ms; TBT 0 ms; 1,613 nodes | 135 ms; TBT 0 ms; 1,605 nodes | 162 ms; TBT 0 ms; 1,653 nodes | 114 ms; TBT 0 ms; 1,022 nodes      |

#### Browser: interaction latency (median, from the input until the result is painted)

| Scenario                                               | AlfaKit (React) | AlfaKit (Vue) | AlfaKit (Svelte) | Filament v5 |
| ------------------------------------------------------ | --------------- | ------------- | ---------------- | ----------- |
| Table, 50 rows, with filters: sort by name             | 118 ms          | 134 ms        | 148 ms           | 253 ms      |
| Table, 500 rows, with filters: sort by name            | 239 ms          | 229 ms        | 233 ms           | 2380 ms     |
| Form, 100 fields + repeater: `live()` field round trip | 227 ms          | 225 ms        | 226 ms           | 287 ms      |
| Global search: type a SKU until results show           | 371 ms          | 371 ms        | 351 ms           | 646 ms      |

Notes: Server times are measured over loopback with one sequential client (TTFB for pages, full response time for interaction requests). Time to interactive is when the page is usable (rows rendered, 100 fields mounted, all six widgets loaded, including the deferred widget data) and the main thread has been free of long tasks for 500 ms. Interaction latency is timed from the Playwright input until the change is painted and includes each stack’s default debounce: AlfaKit debounces typed `live()` fields by 150 ms (choices such as selects and toggles refresh at once) and global search by 250 ms; Filament’s global search field debounces by 500 ms and its `live()` fields use Livewire’s `wire:model.live` default. AlfaKit table rows and repeater items are virtualised, so the DOM holds the visible window of a 500-row table.

\* **Results vary by hardware**, configuration, data and versions, and between runs on the same machine; compare the columns of one run, not numbers from different machines, and run `pnpm bench` yourself.

<!-- bench:results:end -->

**Reading the 2026-10-21 run.** AlfaKit answers faster and sends less on every server measurement: the 500-row table page in 128–145 ms against Filament's 382 ms (about 54 KB gzip against 281 KB), its sort in 132–133 ms against 459 ms, and a `live()` round trip in 13–14 ms against 32 ms. In the browser AlfaKit is ahead on both tables and on every interaction (sorting 500 rows paints in about 230 ms against 2.4 s). Filament becomes interactive sooner on the three lighter pages, which render fewer DOM nodes: the 100-field form (164 ms against 174–215 ms), the dashboard (151 ms against 192–218 ms) and the search page (114 ms against 123–162 ms). The machine was quiet (1-minute load average about 2.5–3 on 10 cores). Expect a few per cent of noise between runs. The AlfaKit targets are the repository's playgrounds, which load AlfaKit from the repository, so their server rows say `alfasix/alfakit dev-main`; the run was taken on the code that was tagged 0.1.6 a few minutes later, hence the label `m5-0.1.6`.

An earlier run (2026-10-15) showed Filament ahead on the 500-row table's server time and the `live()` round trip. Three changes closed that: the benchmark stopped paying for Inertia's devtools (see below); table rows serialise about twice as fast (columns and record actions resolved once per page instead of once per row, each cell's state read once, cached ICU number formatters, policy lookups and resource URLs remembered for the request); and `live()` text fields debounce 150 ms like Livewire while choice fields refresh at once.

### Run it yourself

```bash
# once per app (the three playgrounds and benchmarks/filament-app): the shared 10,000-row data set
php artisan migrate && php artisan db:seed --class="Database\Seeders\Benchmark\BenchmarkSeeder"

pnpm bench                                   # every target that answers, 7 runs after 2 warm-ups
pnpm bench --runs 15 --warmup 3 --label ci   # more runs, a name for the results file
pnpm bench --targets react,filament --scenarios list-500,form
pnpm bench --no-browser                      # server measurements only
pnpm bench --update-docs                     # also rewrite the tables on this page (pnpm bench:docs from the latest file)
```

Results go to `benchmarks/results/suite/<date>-<label>.json` (every sample summary, the hardware and server details), `latest.json` and `latest.md`. During a run `APP_DEBUG` is set to `false` in each app's `.env` and Inertia's devtools are switched off (`INERTIA_DEVTOOLS_ENABLED=false`; Inertia v3 records every request in the `local` environment whatever `APP_DEBUG` says, which more than doubled the 500-row page's server time, and production apps never run them); both are restored afterwards (`--keep-debug` leaves the `.env` alone), so no target pays for debug tooling. Base URLs default to the Herd sites (`http://alfakit-react.localhost`, …, `http://filament-bench.localhost`) and can be changed with `BENCH_REACT_URL`, `BENCH_VUE_URL`, `BENCH_SVELTE_URL` and `BENCH_FILAMENT_URL`.

**Filament is optional.** If `benchmarks/filament-app` is not served, the suite skips it and reports the AlfaKit renderers only. To include it: `composer install` in `benchmarks/filament-app`, copy `.env.example` to `.env`, `php artisan key:generate`, migrate and seed it (`Database\Seeders\Benchmark\AdminUserSeeder` and `BenchmarkSeeder`), serve it (`herd link filament-bench`) and run `php artisan filament:optimize`. Any other app can be added as a target in `scripts/bench/targets.mjs`: it needs `GET /benchmark/login` and `GET /benchmark/info` and the same pages, and a `kind` whose selectors the suite knows (`alfakit` or `filament`).

## Focused comparison with Filament (run of 2026-10-11)

We compare AlfaKit with Filament v5.10 because it is the reference point most AlfaKit users know, and because the Filament team has put real work into performance: v5 is considerably faster than earlier versions (see [Help make Filament faster](https://laravel-news.com/help-make-filament-faster)). The comparison below is against that improved baseline. The two projects make different trade-offs (Livewire re-renders server HTML, AlfaKit sends JSON to a JavaScript renderer), and the numbers mostly show what those trade-offs cost and save for one specific scenario.

### Test setup of that run

| Setting          | Value                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hardware         | Apple M5, 16 GB RAM                                                                                                                                                                   |
| Operating system | macOS 27.0                                                                                                                                                                            |
| Server           | Laravel Herd 1.30.2: nginx + PHP-FPM                                                                                                                                                  |
| PHP              | 8.4.23 with OPcache enabled (warm)                                                                                                                                                    |
| Database         | SQLite, for both apps                                                                                                                                                                 |
| Laravel          | 13.35.0 in both apps, `APP_DEBUG=false`, `php artisan optimize` (config, route, event and view caches)                                                                                |
| AlfaKit          | `@alfakit/react` from the repository, Inertia 3 (`inertiajs/inertia-laravel` 3.5.1, `@inertiajs/react` 3.8.0, React 19.3.0), production build; SSR off unless a column says otherwise |
| Filament         | `filament/filament` 5.10.1, `livewire/livewire` 4.4.7, stock install with the default theme, `filament:optimize`                                                                      |
| Data             | The same 10,000-row data set (two `belongsTo` relationships), generated deterministically and loaded from the same CSV files                                                          |
| Resource         | 12 columns with two relationships, a badge and a toggle column, two searchable columns, a filter, record and bulk actions, 25 rows per page; the same repeater form in both apps      |
| Method           | Same machine, apps run back to back; `benchmarks/run.mjs` (Node 22.23.0, one sequential client) does 3 warm-ups, then 20 timed requests per scenario; medians reported                |
| Date             | 2026-10-11                                                                                                                                                                            |

### Results*

Median time to first byte; sizes are uncompressed response bodies (both servers gzip on the wire).

| Scenario                             | AlfaKit (SSR off) | AlfaKit (SSR on) | Filament v5.10  |
| ------------------------------------ | ----------------- | ---------------- | --------------- |
| List page, 25 rows                   | 53 ms, 39 KB      | 83 ms, 287 KB    | 131 ms, 811 KB  |
| List page, 100 rows                  | 133 ms, 104 KB    | 185 ms, 319 KB   | 205 ms, 2.78 MB |
| Sort a column                        | 48 ms, 25 KB      | 46 ms, 25 KB     | 128 ms, 789 KB  |
| Search                               | 48 ms, 25 KB      | 47 ms, 25 KB     | 126 ms, 792 KB  |
| Form with a 100-item repeater        | 86 ms, 81 KB      | 113 ms, 223 KB   | 147 ms, 1.77 MB |
| `live()` field update, 100-item form | 21 ms, 0.3 KB     | 20 ms, 0.3 KB    | 138 ms, 1.80 MB |
| Form with a 500-item repeater        | 292 ms, 340 KB    | 352 ms, 483 KB   | 380 ms, 8.65 MB |
| `live()` field update, 500-item form | 43 ms, 0.3 KB     | 45 ms, 0.3 KB    | 345 ms, 8.92 MB |

A rerun of the same harness on 2026-10-18 on an idle machine (load average about 2.5 on 10 cores; AlfaKit with SSR off, both apps with `APP_DEBUG=false` but without the config and route caches) measured lower times for both apps: list page, 25 rows 33 ms / 83 KB against 43 ms / 818 KB; sort 21 ms / 26 KB against 40 ms / 791 KB; search 22 ms against 40 ms; 100-item form 31 ms against 63 ms; its `live()` update 21 ms against 61 ms; 500-item form 64 ms / 384 KB against 294 ms / 8.65 MB; its `live()` update 47 ms against 249 ms (raw samples: `benchmarks/results/2026-10-18-z9-csr.json`). The homepage quotes this run.

In the browser (Chrome, five hand-taken samples per page, medians), the rendered 500-item repeater keeps 611 DOM nodes in the page in AlfaKit, because repeater items are [virtualised](../advanced/performance), and 33,515 in Filament, which renders every item; the page's `load` event fired at 485 ms (SSR on) and 422 ms (SSR off) in AlfaKit and at 2,523 ms in Filament, where Alpine initialises every node before `DOMContentLoaded`. First paint (FCP/LCP) was not measured in this run because the measuring tab was hidden, which makes Chromium defer painting; the benchmark README explains the gap.

\* **Results depend on hardware, configuration, data and versions; treat ratios as indicative and run `benchmarks/run.mjs` yourself.** This is one machine, one run of 20 per scenario, SQLite over a loopback connection. The AlfaKit playground panel has extra features switched on (multi-factor authentication, locales, a theme picker) that add to its payload; the Filament app is a stock install.

### Reading the numbers

- **Full page loads are close.** Filament's Blade rendering and AlfaKit's JSON serialisation cost about the same; SSR adds 30–60 ms of Node rendering on top of AlfaKit's numbers.
- **Interactions differ most.** A sort or search in AlfaKit is an Inertia partial reload that returns the table records as JSON, and a `live()` update returns only the components whose fingerprint changed; a Livewire update returns the component's re-rendered HTML.
- **Requests go the other way too.** A `live()` update in AlfaKit sends the form state (7 KB for 100 items, 34 KB for 500); Livewire sends the component snapshot (14 KB and 69 KB).

### Reproduce it

The harness, both apps, the data generator, the raw samples and every caveat are in the [`benchmarks/` directory](https://github.com/alfasixbh/alfakit/tree/main/benchmarks) of the repository. In short:

```bash
php benchmarks/data/generate.php          # the 10,000-row data set (already committed)
# seed playground/react and benchmarks/filament-app, set APP_DEBUG=false, run php artisan optimize
# (and php artisan filament:optimize in the Filament app), then from the repository root:
node benchmarks/run.mjs --runs 20 --warmup 3 --label mine
```

The README lists the exact commands for both apps, including the SSR and non-SSR runs.

### Corrections welcome

If you get different numbers, find a configuration we missed, or see something unfair to either project, please [open an issue](https://github.com/alfasixbh/alfakit/issues) with your setup and results. We will rerun the benchmark and update this page.

## Keeping your panel fast

- Prefer `deferLoading()` on tables whose first query is slow; the page paints and the records follow in a partial reload.
- Keep widgets lazy (the default) and give polled components a sensible `poll()` interval.
- Leave SSR off for form-heavy panels, or enable it per panel only where first paint on a cold load matters.
- Use `toggleable(isToggledHiddenByDefault: true)` for wide tables: columns the user has hidden are left out of the serialised records.
- In production, enable OPcache (`opcache.enable=1`, `opcache.validate_timestamps=0`, restarting PHP-FPM or Octane on deploy) and run `php artisan optimize`, which also caches AlfaKit's discovered resources, pages and widgets (`alfakit:optimize`). Panels are built from many small PHP classes, so most of a cold request without OPcache is spent compiling them. Laravel Octane keeps the panel in memory between requests; see [Deployment](../advanced/deployment).
- In local development, don't run `optimize` (discovery would go stale as you add resources; `php artisan optimize:clear` undoes it), keep Xdebug off unless you are stepping through code (it slows every request several times over), and expect the [debug panel](../advanced/debug-panel), which is on in `local`, to add the cost of recording closures and timings; `->debugPanel(false)` turns it off when you profile. Run `npm run dev` for hot reloading rather than rebuilding the renderer, and remember that the first visit to each page compiles its Vite chunks.
- The repository's Pest suite has payload budgets (`LargePayloadBudgetTest`) that keep a 500-item repeater and a 1,000-row table within fixed serialisation time and size limits.
