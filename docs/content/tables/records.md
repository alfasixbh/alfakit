---
title: Pagination and data
description: Pagination modes, load more and infinite scroll, relationship aggregates and tables over custom (non-Eloquent) data.
---

# Pagination and data

## Pagination modes

```php
use AlfaSix\Alfakit\Tables\Enums\PaginationMode;

$table->paginationMode(PaginationMode::Simple);
```

| Mode                             | Query                                       | Renderer                                           |
| -------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| `PaginationMode::Default`        | `paginate()`: one extra `count(*)` per page | Numbered pages, "Showing 1–10 of 250"              |
| `PaginationMode::Simple`         | `simplePaginate()`: no count query          | Previous / next, "Showing 11–20"                   |
| `PaginationMode::Cursor`         | `cursorPaginate()`: no offset, no count     | Previous / next by an opaque `?cursor=` value      |
| `PaginationMode::LoadMore`       | Every record up to the requested page       | A **Load more** button appends the next page       |
| `PaginationMode::InfiniteScroll` | Every record up to the requested page       | The next page loads when the end scrolls into view |

`simplePaginated()` is a shortcut for `PaginationMode::Simple`. Page sizes still come from `paginationPageOptions()` and `defaultPaginationPageOption()`.

**Cursor** pagination needs a deterministic order: Alfakit appends the primary key to the sort so records never repeat or go missing between pages. Plain columns, relationship columns (`author.name`, sorted through a sub-select that cursor tables select under an alias) and aggregate columns (`comments_count`) all work. A `sortable(query: …)` closure that orders by a raw expression can't be encoded in a cursor: the table throws a `LogicException` naming the expression, so select the expression under an alias and order by the alias, or use another pagination mode. A tampered or stale cursor is ignored and the first page is shown.

**Load more** and **infinite scroll** stay server-driven: `?page=3` returns records 1–30, so a reload, a poll or an action keeps everything the user has loaded, with no client-side merging. At most 10,000 records are returned at once. When a request for the next page fails (network, server error), the renderer replaces "Loading more…" with a message and a **Retry** button; infinite scroll waits for the retry instead of requesting again. Because the total isn't counted in the simple, cursor and appending modes, "Select all" across pages is only offered in the default mode.

## Relationship aggregates

Name the column after the attribute Eloquent produces and call the aggregate; Alfakit adds `withCount()`, `withExists()` or `withAggregate()` to the table query:

```php
TextColumn::make('comments_count')->counts('comments')->sortable();
IconColumn::make('comments_exists')->exists('comments')->boolean();
TextColumn::make('comments_avg_rating')->avg('comments', 'rating')->numeric(decimalPlaces: 1);
TextColumn::make('order_items_sum_total')->sum('orderItems', 'total')->money('USD');
TextColumn::make('bids_min_amount')->min('bids', 'amount');
TextColumn::make('bids_max_amount')->max('bids', 'amount');

// A raw expression as the column (aliased, since Eloquent names it after the SQL):
TextColumn::make('order_total')->sum('orderItems as order_total', DB::raw('price * quantity'))->money('USD');

// Constrained, with an alias:
TextColumn::make('approved_comments_count')
    ->counts(['comments as approved_comments_count' => fn (Builder $query) => $query->where('approved', true)]);
```

Aggregate columns sort by the aggregate alias, and `searchable()` works on them too: an alias can't be used in `WHERE`, so the search runs against the same sub-select (`where (select count(*) …) like ?`), constraints included. `exists()` columns are booleans and are not searched. The aggregate sub-select runs on the related model's query, so its global scopes (soft deletes, your tenant scope) apply.

## Custom data

`records()` replaces the Eloquent query with any data: an API response, a config file, a computed report. For full create, edit, view and delete pages over such data, use an [API resource](../resources/api-resources) instead: it builds this table for you from a data source.

```php
$table
    ->records(fn (): array => Http::get('https://api.example.com/plans')->json('data'))
    ->columns([
        TextColumn::make('name')->searchable()->sortable(),
        TextColumn::make('price')->money('USD')->sortable(),
        TextColumn::make('tier')->badge()->searchable(isIndividual: true),
    ])
    ->recordUrl(fn (array $record): string => "/plans/{$record['id']}");
```

Rows can be arrays, objects or models. A row's record key is its array key when the data is keyed by strings, otherwise its `id`, otherwise its position. Column closures receive the row as `$record` (type it `array $record`).

When the closure returns an array or collection, the table searches (case-insensitively, over each searchable column's state), sorts (by the sorted column's state) and paginates the rows **on the server**, in every pagination mode except cursor (which falls back to numbered pages for in-memory data). For large or remote data, page in the source instead and return a paginator, which the table uses as is:

```php
$table->records(function (?string $search, ?string $sortColumn, ?string $sortDirection, int $page, int|string $recordsPerPage, array $filters): LengthAwarePaginator {
    $response = Http::get('https://api.example.com/plans', [
        'q' => $search,
        'sort' => $sortColumn,
        'direction' => $sortDirection,
        'page' => $page,
        'per_page' => $recordsPerPage,
        'tier' => $filters['tier']['value'] ?? null,
    ])->json();

    return new LengthAwarePaginator($response['data'], $response['total'], $recordsPerPage, $page);
});
```

The closure can also ask for `$columnSearches`.

### Grouping custom data

`groups()` works on `records()` rows too: `Group::make('status')` reads the row's `status` key, and the `getKeyFromRecordUsing()`, `getTitleFromRecordUsing()` and `getDescriptionFromRecordUsing()` closures receive the row as `array $record`. The table keeps each group's rows together (ordered by the group, then by the table's sort) before paging them, and `groupsOnly()` and `selectGroupsOnly()` work as for queries. Group summaries need a query, so custom data shows none. A paginator returned by `records()` is used as is, so sort it by the group yourself.

```php
$table
    ->records(fn (): array => [
        1 => ['title' => 'First', 'status' => 'active'],
        2 => ['title' => 'Second', 'status' => 'inactive'],
    ])
    ->columns([TextColumn::make('title'), TextColumn::make('status')])
    ->groups([Group::make('status')->getTitleFromRecordUsing(fn (array $record): string => ucfirst($record['status']))]);
```

### Filters on custom data

A `records()` closure that asks for `$filters` filters the rows itself, as in Filament: `$filters` holds each filter's form data by filter name (`$filters['featured']['isActive']` for a checkbox filter, `$filters['author']['value']` for a select filter, field names for a custom form). Validate it like any other user input.

When the closure doesn't ask for `$filters` (or `records()` gets a plain array), the table applies the filters to the rows before searching, sorting and paging them:

```php
$table
    ->records(fn (): array => config('plans'))
    ->filters([
        SelectFilter::make('tier')->options(['free' => 'Free', 'paid' => 'Paid']), // row['tier'] is one of the values
        TernaryFilter::make('featured'),                                           // row['featured'] is truthy / falsy
        TernaryFilter::make('archived')->attribute('archived_at')->nullable(),     // null / not null
        Filter::make('price')
            ->schema([TextInput::make('min')->numeric()])
            ->query(fn (Collection $records, array $data): Collection => $records
                ->filter(fn (array $row): bool => $row['price'] >= (int) $data['min'])),
    ]);
```

- `SelectFilter` keeps rows whose attribute (`attribute()`, the filter name by default) matches a selected value, compared as strings; relationship select filters need a query and leave rows alone.
- `TernaryFilter` compares its attribute as a boolean, or checks it for null with `nullable()`; `queries(true: …, false: …)` closures receive the rows like `query()`.
- A `query()` closure receives the rows as a `Collection` (`$records`, `$query` or any `Collection` parameter) and the form data as `$data`, and returns the rows to keep. Keep the collection's keys (`filter()`, `where()`, `whereNull()`; not `values()`): they are the record keys. A closure that type-hints an Eloquent `Builder` is skipped on custom data.
- A paginator returned by `records()` is used as is: page and filter in the source, reading `$filters`.

### Actions and inline edits on custom data

Rows of custom data carry record actions, bulk selection and inline-editable columns like models do. The renderer posts a row's key (the array key, `id` or position described above) and the table resolves the row again from the `records()` closure, under the same search, sort and filter state the page shows. Closures receive the row as `$record`: type it `array $record`, or leave it untyped. A closure typed `Model $record` receives `null` for an array row instead of failing, so shared actions can tell the two apart.

```php
$table
    ->records(fn (): array => Plans::all())
    ->recordActions([
        Action::make('archive')
            ->hidden(fn (array $record): bool => ! $record['active'])
            ->action(fn (array $record) => Plans::archive($record['id'])),
    ])
    ->bulkActions([
        BulkAction::make('export')->action(fn (Collection $records) => Plans::export($records->pluck('id'))),
    ])
    ->columns([
        TextInputColumn::make('price')
            ->rules(['integer', 'min:0'])
            ->updateStateUsing(fn (array $record, mixed $state) => Plans::setPrice($record['id'], (int) $state)),
    ]);
```

- **Bulk actions** receive the selected rows as a `Collection` of arrays (`$records`); "select all" passes every row matching the current search and filters. `authorizeIndividualRecords()` accepts a closure for array rows (there is no policy to check).
- **Inline edits** need `updateStateUsing()`: an array row has nothing to save to, so a column without it answers 400. Validation (`rules()`) and the `beforeStateUpdated()` / `afterStateUpdated()` hooks run as for models.
- **Modal forms** of an action on an array row start empty (`fillForm()` from `$record` if you need values); the form's model binding is for Eloquent records only.
- When loading every row to find one is wasteful (a remote API), give the table a cheaper lookup: `->resolveRecordUsing(fn (string $key): ?array => Http::get("…/plans/{$key}")->json())`. Return `null` for an unknown key and the request answers 404.
- A paginated API only returns the current page, so a bulk selection across pages needs `->resolveSelectedRecordsUsing(fn (array $keys): array => Arr::only($plans, $keys))`, returning rows keyed by record key. "Select all" calls it with `$isTrackingDeselectedKeys = true` (and an empty `$deselectedKeys`, as AlfaKit re-applies the filters instead of tracking deselections): return every matching row then. Only the requested keys are kept from what it returns, and `maxSelectableRecords()` still applies.
- Authorisation of record actions on array rows is the action's own `authorize()` / `visible()` logic plus the panel's policies on the table's model class, if any; a row itself has no policy.
