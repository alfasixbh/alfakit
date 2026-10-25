---
title: Large tables
description: How tables behave on millions of rows, what pagination, sorting and search cost, and a measured 1,000,000-row benchmark.
---

# Large tables

An AlfaKit table never loads every record. Every query is built and run in PHP and only the current page (10 rows by default, `paginationPageOptions()` sets the choices) is sent to the browser, so the page size the user sees stays the same at 1,000 or 1,000,000 rows. What grows with the table is the work the **database** does to find that page. This page explains where that work goes and how to keep it small.

## Where the time goes

**Counting.** The default numbered pagination shows "Showing 1 to 25 of 1,000,000" and the page links, so each page runs a `select count(*)` over the filtered query as well as the page query. On an indexed table that is cheap (a few milliseconds for 1M rows on SQLite), but with filters on unindexed columns, joins or a slow database it scans every matching row on every page.

**Deep offsets.** Page 10,000 is `limit 25 offset 249975`: the database reads and throws away the first 249,975 rows of the sorted result. Ordered by the primary key this is fast; ordered by anything else, the cost grows with the page number.

**Unindexed sorts.** Sorting by a column without an index means sorting every matching row to return 25. It is the slowest scenario below in both AlfaKit and Filament.

**Search.** `searchable()` columns are matched with `like '%term%'`, which can't use an index: the database scans rows until it fills the page (or the whole table, when few rows match).

## Pagination modes

```php
use AlfaSix\Alfakit\Tables\Enums\PaginationMode;

$table->paginationMode(PaginationMode::Simple); // previous / next, no count(*)
$table->paginationMode(PaginationMode::Cursor); // previous / next by ?cursor=, no count, no offset
```

- **Numbered** (default): page links and a total. One extra `count(*)` per page and an offset that grows with the page number.
- **Simple** (`simplePaginated()`): previous / next only. No count query; the offset still grows.
- **Cursor**: previous / next with an opaque `?cursor=` value. The next page is `where (sort, id) > (last values)`, so page 10,000 costs the same as page 2 when the sort column is indexed. There are no page numbers to jump to, and every sort must name a column (see [Records](/docs/tables/records)).

## Deferred totals

`deferTotals()` keeps numbered pagination but takes the `count(*)` (and the [summaries](/docs/tables/summaries)) out of the page response. The rows render first, with previous / next links and a placeholder for the total; the total, the page numbers and the summary rows load right after from `POST /{panel}/_alfakit/table/totals`:

```php
public static function table(Table $table): Table
{
    return $table
        ->columns([...])
        ->deferTotals();
}
```

- Paging, sorting, filtering and searching are partial reloads of the `page` prop: none of them count. The renderer keeps the totals while only the page or the sort changes, and asks again when the filters, the search, the tab, the view or the page size change (or the page and sort, when a page summary is shown).
- After an action, an inline edit or a reorder the totals are fetched again in the background; the old ones stay on screen meanwhile.
- A page past the end is still counted at once, to show the last page instead.
- Polled and `live()` tables keep their totals inline. Turn it on everywhere with `Table::configureUsing(fn (Table $table) => $table->deferTotals())`.

## Prefetching

Navigation links prefetch their page when hovered, and hovering or focusing a table's "next" button prefetches the next page with the same partial reload the click makes, so the click is answered from memory. Prefetched pages are kept for 10 seconds (`PREFETCH_CACHE_FOR` in `@alfakit/core`) and dropped after every action, form save, inline edit or reorder. `prefetchTablePage(identifier, { page: 3 })` prefetches a page from your own components.

## Indexes

Index the columns you sort and filter by. In the benchmark below the indexed sort (`created_at`) costs about the same as the first page, and the unindexed one (`unit_price`) adds about 40 ms per request on 1,000,000 rows. Select filters on an indexed column (`status`) cost nothing measurable. Composite indexes that match a common filter + sort (`(status, created_at)`) help when both are used together.

## Search on large tables

For codes, SKUs or emails, match a prefix with a range on an indexed column instead of `like '%…%'`:

```php
use Illuminate\Database\Eloquent\Builder;

TextColumn::make('sku')->searchable(
    query: fn (Builder $query, string $search): Builder => $query
        ->where('sku', '>=', $search)
        ->where('sku', '<', $search."\u{10FFFF}"),
);
```

For free text over large tables, use your database's full-text index (`whereFullText()` on MySQL / PostgreSQL) in the same `query:` closure, or Laravel Scout: search Scout for the matching keys and constrain the table query with `whereIn('id', …)`.

## Benchmark: 1,000,000 rows

Server time to first byte of a full page load of a 25-row table over 1,000,000 rows, median of 5 runs after one warm-up, one request at a time. Every app runs the same table (6 columns, a select filter, one indexed and one unindexed sort, prefix search on an indexed `sku`) on SQLite. "Deferred" is numbered pagination with `deferTotals()` (`?mode=deferred` in the playgrounds): the page response skips the `count(*)`, which follows in a separate request.

| Scenario        | React numbered | React deferred | React simple | React cursor | Vue numbered | Vue deferred | Svelte numbered | Svelte deferred | Filament numbered | Filament simple | Filament cursor |
| --------------- | -------------: | -------------: | -----------: | -----------: | -----------: | -----------: | --------------: | --------------: | ----------------: | --------------: | --------------: |
| First page      |          32 ms |          24 ms |        27 ms |        26 ms |        28 ms |        23 ms |           31 ms |           26 ms |             32 ms |           26 ms |           26 ms |
| Page 2          |          30 ms |          24 ms |        28 ms |        39 ms |        28 ms |        23 ms |           31 ms |           25 ms |             32 ms |           26 ms |             n/a |
| Page 10,000     |          36 ms |          29 ms |        34 ms |          n/a |        35 ms |        27 ms |           35 ms |           30 ms |             36 ms |           32 ms |             n/a |
| Sort, indexed   |          30 ms |          28 ms |        26 ms |        29 ms |        32 ms |        22 ms |           30 ms |           25 ms |             32 ms |           27 ms |           26 ms |
| Sort, unindexed |          73 ms |          74 ms |        70 ms |        77 ms |        68 ms |        64 ms |           70 ms |           67 ms |             74 ms |           68 ms |           68 ms |
| Select filter   |          30 ms |          29 ms |        26 ms |        26 ms |        27 ms |        22 ms |           29 ms |           27 ms |             30 ms |           26 ms |           25 ms |
| Prefix search   |          25 ms |          26 ms |        27 ms |        25 ms |        23 ms |        23 ms |           25 ms |           27 ms |             25 ms |           28 ms |           27 ms |

On an idle machine full page loads cost about the same in AlfaKit and Filament (within a few milliseconds either way); `deferTotals()` takes 5 to 8 ms off most pages by leaving out the count, about as much as simple pagination does. Response size per page: AlfaKit 64 to 68 KB of HTML (18 to 19 KB gzipped), Filament about 306 KB (18 KB gzipped). Cursor pagination has no page 10,000; Filament's cursor page 2 is not measured because its next cursor is not a link in the HTML (it is a Livewire call). Single medians of 5 vary by a few milliseconds between runs.

Measured on 2026-10-18 on an Apple M5 MacBook (Mac17,2, 10 cores: 4 performance + 6 efficiency, 16 GB), macOS 27.0, PHP 8.4.23 (FPM, OPcache on, `APP_DEBUG=false` in every app, Inertia devtools off, no config or route cache) under Laravel Herd 1.30.2, Node 22.23.0, Laravel 13.35, Filament 5.10.1, with the machine otherwise idle (load average 2.6 before and 2.5 after the run, on 10 cores). The previous run (2026-10-15) was taken on a busy machine (load 7 to 9) and showed AlfaKit well ahead; on an idle machine the two are on par for full page loads, and AlfaKit's advantage is in the interactions (see [Performance](/docs/getting-started/performance)). **Results vary by hardware**, database and data; run it yourself:

```bash
# in playground/react (and playground/vue, playground/svelte) and in benchmarks/filament-app
php artisan migrate
php artisan db:seed --class="Database\Seeders\Benchmark\BenchBigRecordsSeeder"   # ~3 s for 1M rows

node scripts/bench/big.mjs --runs=5   # --targets=react,vue,svelte,filament (default react,filament); APP_DEBUG off for the run; writes benchmarks/results/suite/1m-<date>.{json,md}
```

The same queries straight against SQLite (median of 5, same machine) show how small the database part is: `count(*)` 5.6 ms, page 10,000 by id 3.8 ms, sort by the indexed `created_at` under 0.1 ms, sort by the unindexed `unit_price` 40 ms, `count(*)` for the status filter 3.7 ms, prefix range search under 0.1 ms. The rest of each request is the framework rendering the page.

## Guidance

- Up to a few hundred thousand rows with indexed sorts and filters, the default numbered pagination is fine.
- Beyond that, or on a slow database, use `deferTotals()` so the rows never wait for the `count(*)`, switch to `PaginationMode::Simple` to drop it, or `PaginationMode::Cursor` when users page far into the table.
- Make every `sortable()` column you expect users to click an indexed column, or remove `sortable()` from the rest.
- Replace `like '%…%'` search with prefix ranges, full-text indexes or Scout for big tables.
- Keep the page size small (25 to 50); for long scrolling lists use `PaginationMode::LoadMore` / `InfiniteScroll`, which cap at 10,000 loaded records.
