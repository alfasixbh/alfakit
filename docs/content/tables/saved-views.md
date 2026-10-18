---
title: Saved views
description: Named table states (filters, search, sort, columns, grouping, page size) as tabs above the table; users save their own and share them with their team.
---

# Saved views

A view is a named table state: filters, search, sort, the visible columns and their order, grouping and records per page. Views show as tabs (or a dropdown) above the table. Picking one puts `?view=slug` in the URL, so a view can be bookmarked and shared.

Saved views are opt-in. Turn them on per table:

```php
use AlfaSix\Alfakit\Tables\Table;

public static function table(Table $table): Table
{
    return $table
        ->columns([/* … */])
        ->savedViews();
}
```

Or turn them on for every table of a panel. A table's own `savedViews(false)` still wins:

```php
$panel->tableSavedViews();
```

Users save views in a small table. Publish its migration and run it:

```bash
php artisan vendor:publish --tag=alfakit-table-views-migrations
php artisan migrate
```

If the table isn't migrated, the views you define in code still work, but users can't save their own. The table name comes from `alfakit.tables.views_table` (default `alfakit_table_views`).

## Views in code

Define views in code with `views()`. They come before the users' views and can't be edited from the UI:

```php
use AlfaSix\Alfakit\Tables\Views\TableView;

$table->views([
    TableView::make('overdue')
        ->label('Overdue')
        ->icon('heroicon-o-clock')
        ->filters(['status' => ['value' => 'overdue']])
        ->sort('due_at', 'desc')
        ->columns(['number', 'customer.name', 'due_at', 'total'])
        ->default(),
    TableView::make('mine')
        ->filters(['owner' => ['value' => auth()->id()]])
        ->group('status')
        ->perPage(50),
    TableView::make('archived')->visible(fn (): bool => auth()->user()->isAdmin()),
]);
```

| Method                    | Effect                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `label()`, `icon()`       | the tab's text and icon (the label defaults to the name in title case)                                                                |
| `filters([...])`          | filter state by filter name, in the same shape as the `?filters[...]` query string                                                    |
| `search('…')`             | the table search                                                                                                                      |
| `sort('column', 'desc')`  | the sort column (it must be `sortable()`)                                                                                             |
| `columns([...])`          | the visible columns, in order. Toggleable columns you leave out are hidden; columns that can't be toggled stay visible after the list |
| `group('status', 'desc')` | the grouping (`''` turns a default group off)                                                                                         |
| `perPage(50)`             | records per page (one of `paginationPageOptions()`)                                                                                   |
| `default()`               | applies when the URL names no view, unless the user picked their own default                                                          |
| `hidden()` / `visible()`  | hides the view, for example per user                                                                                                  |

Whatever a view leaves out uses the table's defaults. You can use `views()` without `savedViews()` if you only want tabs defined in code.

## What users can do

The menu next to the views offers:

- **Save as new view**: stores the table exactly as the user sees it now, under a name. Users with the sharing permission can tick **Share with team**.
- **Update view**: shows up once the user changes a view they own. It overwrites the view with the current state.
- **Reset changes**: goes back to the view as it was saved.
- **Rename view**, **Delete view**, and **Share with team** / **Stop sharing**: for views the user may edit.
- **Set as my default** / **Clear my default**: the view that opens when the URL names none. This works for code views, shared views and the user's own views. Setting it on **All** means "no view", even if a code view is marked `default()`.

When a user changes the sort, filters or columns while a view is open, the change goes in the URL as usual and the view shows as **Modified**. A user's views and default are kept per panel, table, tenant and user.

## Shared views

Shared views are visible to everyone on the same panel, table and tenant. Only users who manage shared views can publish, update, rename or delete them. By default, that's whoever the table model's policy allows through a `manageSharedTableViews` ability. If the policy has no such method, nobody can:

```php
class InvoicePolicy
{
    public function manageSharedTableViews(User $user): bool
    {
        return $user->hasRole('manager');
    }
}
```

Or decide on the table:

```php
$table->savedViews()->canManageSharedViews(fn (): bool => auth()->user()->isAdmin());
```

## Layout

Views show as tabs by default. A dropdown takes less room when there are many:

```php
$table->savedViews()->viewsLayout('dropdown');
```

The bar has the `data-slot="table-views"` hook, with `table-views-tabs`, `table-views-trigger` and `table-views-modified` for its parts. The `table.views.before` and `table.views.after` [slots](/docs/design/slots) sit at its edges.

## How it works

- Views are applied on the server. The URL's own state (for example a sort the user just clicked) wins over the view. A view named in the URL replaces everything it doesn't set, also over [session persistence](/docs/tables/filters#remembering-the-table-state). A default view only fills what neither the URL nor the session holds.
- Stored state is cleaned against the table every time it's read. Unknown filters and filter fields, columns that no longer exist, sorts on columns that aren't sortable, groups that are gone and page sizes that aren't offered are all dropped. Renaming a column never breaks a saved view.
- All changes go through `POST /_alfakit/table/views`, which checks the page's context token: the user, panel access, tenant and `canAccess()`. Users can only change their own personal views. Shared views need the permission above. Views defined in code are read-only. A user can keep up to 50 views per table.
- Internal requests (actions, inline edits, exports) carry the page's `?view=`, so "select all" bulk actions work on the same records the user sees.
