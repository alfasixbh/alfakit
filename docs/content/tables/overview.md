---
title: Tables
description: Query, state and configuration of data tables.
---

# Tables

A table combines an Eloquent query with columns, filters and actions. Resources define one in `table()`; pages, relation managers and widgets can define their own.

```php
public static function table(Table $table): Table
{
    return $table
        ->columns([...])
        ->filters([...])
        ->recordActions([...])
        ->bulkActions([...])
        ->headerActions([...])
        ->defaultSort('created_at', 'desc')
        ->striped()
        ->paginationPageOptions([10, 25, 50, 'all'])
        ->defaultPaginationPageOption(25)
        ->searchPlaceholder('Search posts…')
        ->poll('30s')
        ->emptyStateHeading('No posts yet')->emptyStateDescription('Write your first post.')->emptyStateIcon('pen')
        ->emptyStateActions([CreateAction::make()]);
}
```

`->poll('30s')` refreshes the table on an interval. A poll reloads only this table's schema (an Inertia partial reload of the `alfakitPoll` prop, with the `X-Alfakit-Poll` header naming the component), not the whole page, so forms and other state on the page are untouched. Tables and widgets polling on the same interval share one request, and polling pauses while the browser tab is hidden and catches up when it is shown again.

`pushColumns([...])` and `pushFilters([...])` add columns and filters after the ones from `columns()` / `filters()` without replacing them, handy in `Table::configureUsing()` for columns every table shares.

A table over plain arrays (no database): search, sort and paginate it.

```alfakit-example name="table-basic"

```

## Default sort

`defaultSort('created_at', 'desc')` sorts by a column until the user picks another sort; the column may be a closure returning a name. Like Filament, the closure may also order the query itself: it receives `$query` (and `$direction`, the second argument) and its own `orderBy()` calls are used.

```php
$table->defaultSort(fn (Builder $query): Builder => $query->orderBy('position')->orderBy('name'));
$table->defaultSort(fn (Builder $query, string $direction) => $query->orderBy('published_at', $direction), 'desc');
```

A closure is treated as a query modifier when it has a `$query` parameter or one typed `Builder`. Such a sort names no column, so no header shows a sort arrow.

## Toolbar and pagination options

```php
$table
    ->extremePaginationLinks()                 // first / last page buttons
    ->loadingSkeleton()                        // skeleton rows while sorting, searching, filtering or paging reloads the records
    ->defaultSortOptionLabel('Newest first')   // the "default" option of the sort select (content layouts)
    ->defaultKeySort(false)                    // no primary-key tiebreaker (see below)
    ->reorderRecordsTriggerAction(fn (Action $action, bool $isReordering) => $action->button()->label($isReordering ? 'Done' : 'Reorder'));
```

Sorts are followed by the primary key in the same direction (`defaultKeySort()`, on by default), so rows with equal values keep a stable order across pages; without any sort the table lists the newest key first. The skeleton is styled through `[data-slot="table-loading-skeleton"]`. Toolbar buttons are restyled with a closure receiving an `Action` (see [Filters](filters#customising-the-filter-buttons)).

## State

Sorting, searching, filters, pagination and toggled columns live in the **query string** (`?sort=title&direction=desc&search=…&filters[status][value]=published&page=2`). The renderer updates the URL with Inertia partial reloads, so table state is shareable, bookmarkable and survives a reload. The URL is replaced rather than pushed (as Livewire's `#[Url]` does in Filament), so each sort or page change doesn't add a history entry: the browser's back button leaves the page instead of stepping back through earlier table states. Several tables on one page get prefixed keys through `->queryStringIdentifier('comments')` (relation managers and widgets do this automatically). Grouping uses `group` and `groupDirection`; `persistInSession()` (or `persistFiltersInSession()`, `persistSearchInSession()`, `persistSortInSession()`, `persistRecordsPerPageInSession()`, `persistColumnsInSession()`, `persistGroupInSession()`) also remembers those values in the session ([Filters](/docs/tables/filters#remembering-the-table-state)).

## Query

```php
$table->query(Post::query()->with('author'))
      ->modifyQueryUsing(fn (Builder $query) => $query->where('team_id', auth()->user()->team_id));
```

Records are resolved with `withTrashed()` for actions, so restore/force-delete actions work on soft-deleted rows.

## Rows

| Method                                                                 | Description                                                                  |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `recordUrl(fn (Post $record) => …)`                                    | Row click target (`openRecordUrlInNewTab()`)                                 |
| `recordAction('edit')`                                                 | Run a record action on row click instead                                     |
| `recordClasses(fn ($record) => 'opacity-50')`                          | Extra row classes                                                            |
| `selectable(false)` / `checkIfRecordIsSelectableUsing()`               | Bulk selection (`selectable()` shows checkboxes without bulk actions)        |
| `maxSelectableRecords(50)`, `selectGroupsOnly()`                       | Selection limits ([Actions](/docs/tables/actions#bulk-selection-safeguards)) |
| `stackedOnMobile()`                                                    | Rows as cards with column labels below `md`                                  |
| `selectCurrentPageOnly()`                                              | Disable "select all N" across pages                                          |
| `deselectAllRecordsWhenFiltered(false)`                                | Keep the selection when filters, search or the list tab change               |
| `reorderable('sort', direction: 'desc')`                               | Drag-and-drop ordering persisted to a column (`asc` by default)              |
| `striped()`, `paginated(false)`, `simplePaginated()`, `deferLoading()` | Presentation                                                                 |
| `virtualize(false)`, `virtualizeThreshold(200)`                        | Windowed rows on long pages ([Performance](/docs/advanced/performance))      |

A clickable row (`recordUrl()` or `recordAction()`) is a mouse shortcut; keyboard and screen-reader users reach the same target through the first cell that holds no control of its own (not an editable or copyable column), which renders as a link or button. In reorder mode each row also gets Move up / Move down buttons, and the new position is announced. Sortable headers expose `aria-sort`, and the "select page" checkbox shows a mixed state when only some rows are selected.

The bulk selection is cleared whenever the filters, search, column searches or list tab change (`deselectAllRecordsWhenFiltered()`, on by default), so a bulk action never runs on records the user can no longer see. Sorting, paging and polling keep it.

`stackedOnMobile()` renders each row as a card below the `md` breakpoint: every cell shows its column label, and the selection checkbox and record actions stay in the card. It is plain CSS (the same markup as the table), so it works with server-side rendering and right-to-left layouts. Columns with `visibleFrom()` / `hiddenFrom()` keep their breakpoints. The mobile preset (`Panel::mobile()`) does something similar for every table on phones.

### Reordering

```php
$table
    ->reorderable('sort')
    ->paginatedWhileReordering()          // keep the pages in reorder mode (off by default)
    ->beforeReordering(fn (array $order) => Log::info('Reordering', $order))
    ->afterReordering(fn (array $order) => Cache::forget('menu'));
```

As in Filament, reorder mode turns pagination off: the toggle reloads the table with `?reordering=1` (prefixed with the table's query-string identifier) and the server lists every record, so records can move between pages. Clicking **Done** saves the order and reloads the table with its pages. `paginatedWhileReordering()` keeps the pages instead; records then only move within the current page.

A reorderable table is listed in its saved order (the `reorderable()` column and direction) also outside reorder mode, so the order users set is the order they see; it takes the place of `defaultSort()`, which only applies to tables that aren't reorderable. Clicking a sortable header still sorts by that column.

`beforeReordering()` and `afterReordering()` receive `array $order`, the moved record keys (as strings) in their new order, and run around saving it, after the authorisation checks (the `reorder` ability and `update` on every moved record). A closure can also type-hint `Table $table`.

Saving only moves the records the renderer sends: they swap the positions they already hold, so records that were not listed keep their order. If the positions are missing or tied (a fresh `sort` column full of zeros), saving renumbers every listed record `1..n` with the moved ones in their new slots.

## Headings

`heading()` and `description()` render above the toolbar. `modelLabel()` / `pluralModelLabel()` feed empty states and bulk-action copy.
