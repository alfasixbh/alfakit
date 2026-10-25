---
title: Slots
description: Insert your own content into specific places of the layout, everywhere or on chosen pages.
---

# Slots

Slots are named places in the layout where you can add content: a status badge in the top bar, a version number at the bottom of the sidebar, a chart above one page's table. FilamentPHP calls these render hooks.

```php
use AlfaSix\Alfakit\Schemas\Components\Text;
use AlfaSix\Alfakit\Schemas\Components\View;
use AlfaSix\Alfakit\Theming\Slot;

$panel
    ->slot(Slot::TOPBAR_END, fn () => view('admin.status-badge'))
    ->slot(Slot::SIDEBAR_FOOTER, Text::make('v2.4.1')->color('gray'))
    ->slot(Slot::PAGE_HEADER_AFTER, View::make('sales-chart'), scopes: [ListOrders::class])
    ->slot(Slot::CONTENT_END, '<p class="text-xs text-muted-foreground">© Acme</p>', scopes: [OrderResource::class]);
```

## What you can put in a slot

- **HTML:** a string, an `HtmlString` or any `Htmlable`, or a Blade view. It is rendered on the server.
- **Schema components:** `Text`, `Html`, or `View`, which renders a component you registered in your frontend with `createAlfakit({ components })`.
- **An array** of any of these.
- **A closure** returning any of the above. Dependencies are injected, and returning `null` adds nothing. A closure that asks for `array $scopes` receives the current page class and, on resource pages, its resource (Filament's render hook `$scopes`). A closure that asks for `array $data` receives the render data (below).

## Passing data to slots

Filament passes `$data` to render hook closures. AlfaKit slot closures run on the server once per request, so `$data` holds what the request is about:

| Key        | Value                                                            |
| ---------- | ---------------------------------------------------------------- |
| `panel`    | The current `Panel`                                              |
| `page`     | The current page class (null outside pages)                      |
| `resource` | The page's resource class, on resource pages                     |
| `record`   | The record of edit, view and other record pages (null elsewhere) |
| `tenant`   | The current tenant, with tenancy                                 |
| `nonce`    | The CSP nonce, in the head slots only                            |

```php
$panel->slot(Slot::PAGE_HEADER_AFTER, fn (array $data) => $data['record'] instanceof Order
    ? view('orders.status-timeline', ['order' => $data['record']])
    : null);
```

Some slots render once per item in the browser: `TABLE_HEADER_CELL` once per column, the modal slots once per action. Their content is sent once, so instead of reading the item in a closure, say which items it belongs to with `when`. The renderer compares it with the slot's data (`['column' => 'title']` for a header cell, `['action' => 'delete']` for a modal); a list matches any of its values:

```php
$panel
    ->slot(Slot::TABLE_HEADER_CELL, view('hints.title'), when: ['column' => 'title'])
    ->slot(Slot::MODAL_SCHEMA_BEFORE, '<p class="text-sm">The record moves to the archive.</p>', when: ['action' => ['archive', 'edit']]);

Slots::register(Slot::TABLE_HEADER_CELL, '<span>€</span>', when: ['column' => ['price', 'total']]);
```

Content without `when` renders in every place the slot appears. To render a slot yourself with data on the server (in a plugin's own serialiser, say), use `$panel->renderSlot(Slot::TABLE_HEADER_CELL, ['column' => 'title'])`: closures get the data merged into `$data` and entries whose `when` doesn't match are skipped. In a custom frontend component, pass the data to the `Slot` component (`<Slot name="table.header-cell" data={{ column: 'title' }} />`).

## Scopes

`scopes` (one class or an array) limits content to certain places:

- **Page classes:** only on those pages.
- **Resource classes:** on every page of the resource.
- **Relation manager classes:** only in that relation manager's table slots and `RESOURCE_RELATION_MANAGER_*` slots, on whatever page shows it.
- **Widget classes:** only in that table widget's slots (`TABLE_WIDGET_*`, table toolbar slots).

```php
$panel
    ->slot(Slot::TABLE_TOOLBAR_END, View::make('export-hint'), scopes: CommentsRelationManager::class)
    ->slot(Slot::TABLE_WIDGET_START, '<p>Updated hourly</p>', scopes: [LatestOrders::class]);
```

Some slots only exist on one kind of page, whatever their scopes: the `RESOURCE_PAGES_LIST_RECORDS_*` slots on List pages, `RESOURCE_PAGES_MANAGE_RELATED_RECORDS_*` on `ManageRelatedRecords` pages, and each `AUTH_*_FORM_*` slot on its own sign-in, registration or password reset page.

## Slots for every panel

`Slots::register()` adds content to every panel, from any service provider's `boot()`: the equivalent of Filament's `FilamentView::registerRenderHook()`. It takes the same content and scopes, and `panels` limits it to panel ids:

```php
use AlfaSix\Alfakit\Schemas\Components\View;
use AlfaSix\Alfakit\Theming\Slot;
use AlfaSix\Alfakit\Theming\Slots;

public function boot(): void
{
    Slots::register(Slot::TOPBAR_END, fn (): string => view('status-badge')->render());
    Slots::register(Slot::PAGE_START, View::make('billing-banner'), scopes: ListInvoices::class, panels: 'admin');
}
```

A panel's own `slot()` content comes first, then the registered content, in registration order.

## Available slots

Layout:

| Constant                                       | Where                                                        |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `BODY_START` / `BODY_END`                      | Top and bottom of the page body                              |
| `LAYOUT_START` / `LAYOUT_END`                  | Start and end of the panel layout                            |
| `SIDEBAR_START` / `SIDEBAR_END`                | Top of the sidebar (above the logo) and its very end         |
| `SIDEBAR_LOGO_BEFORE` / `SIDEBAR_LOGO_AFTER`   | Around the logo (or the tenant menu) in the sidebar          |
| `SIDEBAR_HEADER`                               | Under the brand in the sidebar                               |
| `SIDEBAR_NAV_START` / `SIDEBAR_NAV_END`        | Before and after the navigation groups                       |
| `SIDEBAR_FOOTER`                               | Above the user menu                                          |
| `TOPBAR_BEFORE` / `TOPBAR_AFTER`               | Above and below the top bar                                  |
| `TOPBAR_LOGO_BEFORE` / `TOPBAR_LOGO_AFTER`     | Around the logo in the top navigation and fullscreen layouts |
| `TOPBAR_START`                                 | After the breadcrumbs                                        |
| `TOPBAR_END`                                   | Before search, notifications and the theme toggle            |
| `GLOBAL_SEARCH_BEFORE` / `GLOBAL_SEARCH_AFTER` | Around the global search field                               |
| `GLOBAL_SEARCH_START` / `GLOBAL_SEARCH_END`    | Top and bottom of the global search dialog                   |
| `TENANT_MENU_BEFORE` / `TENANT_MENU_AFTER`     | Around the tenant menu                                       |
| `USER_MENU_BEFORE` / `USER_MENU_AFTER`         | First and last entries of the user menu                      |
| `USER_MENU_PROFILE_BEFORE` / `_AFTER`          | Around the profile link in the user menu                     |
| `CONTENT_BEFORE` / `CONTENT_AFTER`             | Before and after the content area                            |
| `CONTENT_START` / `CONTENT_END`                | Top and bottom of the content area                           |
| `FOOTER`                                       | Under the content                                            |
| `HEAD_START` / `HEAD_END`                      | Start and end of `<head>` (HTML only, see below)             |

Pages and resources:

| Constant                                                        | Where                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| `PAGE_START` / `PAGE_END`                                       | Start and end of the page, around its header and content  |
| `PAGE_HEADER_BEFORE` / `PAGE_HEADER_AFTER`                      | Above and below the page header                           |
| `PAGE_HEADER_HEADING_BEFORE` / `_AFTER`                         | Around the heading and subheading, inside the header      |
| `PAGE_ACTIONS_BEFORE` / `PAGE_ACTIONS_AFTER`                    | Around the page's header actions                          |
| `PAGE_HEADER_WIDGETS_BEFORE` / `_AFTER`                         | Around the header widgets                                 |
| `PAGE_FOOTER_WIDGETS_BEFORE` / `_AFTER`                         | Around the footer widgets                                 |
| `PAGE_SUB_NAVIGATION_START_BEFORE` / `_AFTER`                   | Around the sub-navigation in the `start` position         |
| `PAGE_SUB_NAVIGATION_END_BEFORE` / `_AFTER`                     | Around the sub-navigation in the `end` position           |
| `PAGE_SUB_NAVIGATION_TOP_BEFORE` / `_AFTER`                     | Around the sub-navigation tabs in the `top` position      |
| `PAGE_SUB_NAVIGATION_SIDEBAR_BEFORE` / `_AFTER`                 | Top and bottom of the side (`start`/`end`) sub-navigation |
| `RESOURCE_PAGES_LIST_RECORDS_TABLE_BEFORE` / `_AFTER`           | Around a List page's table                                |
| `RESOURCE_PAGES_LIST_RECORDS_TABS_START` / `_END`               | Before the first and after the last tab of a List page    |
| `RESOURCE_PAGES_MANAGE_RELATED_RECORDS_TABLE_BEFORE` / `_AFTER` | Around a `ManageRelatedRecords` page's table              |
| `RESOURCE_RELATION_MANAGER_BEFORE` / `_AFTER`                   | Around each relation manager                              |
| `RESOURCE_TABS_START` / `RESOURCE_TABS_END`                     | Before the first and after the last relation manager tab  |

Simple (auth) pages:

| Constant                                             | Where                                   |
| ---------------------------------------------------- | --------------------------------------- |
| `SIMPLE_LAYOUT_START` / `SIMPLE_LAYOUT_END`          | Start and end of the simple layout      |
| `SIMPLE_PAGE_START` / `SIMPLE_PAGE_END`              | Top and bottom of the card              |
| `AUTH_BEFORE` / `AUTH_AFTER`                         | Above and below the card                |
| `AUTH_LOGIN_FORM_BEFORE` / `_AFTER`                  | Around the sign-in form                 |
| `AUTH_REGISTER_FORM_BEFORE` / `_AFTER`               | Around the registration form            |
| `AUTH_PASSWORD_RESET_REQUEST_FORM_BEFORE` / `_AFTER` | Around the "send reset link" form       |
| `AUTH_PASSWORD_RESET_RESET_FORM_BEFORE` / `_AFTER`   | Around the "choose a new password" form |

Tables, widgets and modals:

| Constant                                                 | Where                                                                                                                                                                      |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TABLE_HEADER_BEFORE` / `TABLE_HEADER_AFTER`             | Around every table's heading, description and actions                                                                                                                      |
| `TABLE_TOOLBAR_BEFORE` / `TABLE_TOOLBAR_AFTER`           | Above and below every table's toolbar                                                                                                                                      |
| `TABLE_TOOLBAR_START` / `TABLE_TOOLBAR_END`              | In every table's toolbar                                                                                                                                                   |
| `TABLE_TOOLBAR_SEARCH_BEFORE` / `_AFTER`                 | Around every table's search field                                                                                                                                          |
| `TABLE_TOOLBAR_REORDER_TRIGGER_BEFORE` / `_AFTER`        | Around the reorder button                                                                                                                                                  |
| `TABLE_TOOLBAR_GROUPING_SELECTOR_BEFORE` / `_AFTER`      | Around the grouping selector                                                                                                                                               |
| `TABLE_TOOLBAR_COLUMN_MANAGER_TRIGGER_BEFORE` / `_AFTER` | Around the column manager button                                                                                                                                           |
| `TABLE_FILTER_INDICATORS`                                | After the active filter indicators                                                                                                                                         |
| `TABLE_SELECTION_INDICATOR_ACTIONS_BEFORE` / `_AFTER`    | Around "Select all" / "Deselect all" in the selection bar                                                                                                                  |
| `TABLE_CONTENT_BEFORE` / `TABLE_CONTENT_AFTER`           | Before and after the rows (or empty state), above the pagination                                                                                                           |
| `TABLE_HEADER_CELL`                                      | In every column header, after the label; data `column` (use `when`)                                                                                                        |
| `TABLE_WIDGET_START` / `TABLE_WIDGET_END`                | Above and below the table of every table widget                                                                                                                            |
| `MODAL_SCHEMA_BEFORE` / `MODAL_SCHEMA_AFTER`             | Above and below the fields of every action modal that has fields (not confirmation-only modals such as Delete; use `modalDescription()` there); data `action` (use `when`) |

Slots exist in every layout and every renderer, including the top navigation and the icon rail. In a [starter kit](../getting-started/starter-kits) your app's layout replaces AlfaKit's chrome, so the slots of that chrome (`HEAD_*`, `SIDEBAR_*`, `TOPBAR_*`, `USER_MENU_*` and the other sidebar, top bar and menu slots) render nothing; content, page, resource, table and modal slots work as in an admin panel. [Components outside panels](../standalone/customizing) have no panel slots: put extra content in your own page around `<AlfakitComponent>`. Plugins add slot content the same way, from their `register()` method, or with `Slots::register()`.

Filament hooks without a slot: `PAGE_SUB_NAVIGATION_SELECT_*` (the side sub-navigation stacks above the content on phones instead of becoming a select) and `ActionsRenderHook::MODAL_CUSTOM_CONTENT_*` (use `Action::modalContent()` / `modalContentFooter()`). `TABLE_FILTER_INDICATORS` and `TABLE_HEADER_CELL` add content next to the indicators and the header label rather than replacing them. Filament's `TOOLBAR_TOGGLE_COLUMN_TRIGGER_*` hooks map to the column manager trigger slots. `alfakit:migrate-from-filament` turns `->renderHook()` and `FilamentView::registerRenderHook()` calls into slots and reports hooks it cannot map.

### Head slots

`Slot::HEAD_START` and `Slot::HEAD_END` are rendered on the server by the root view, inside `<head>` (so they also work with SSR and before any JavaScript runs). They take HTML only: strings, `Htmlable`s, Blade views, or closures returning them; schema components are skipped. A closure receives the page's CSP nonce as `$nonce`, and `<script>` and `<style>` tags without a nonce get it added, so inline tags pass a nonce-based Content Security Policy (`Vite::useCspNonce()`). `scopes` work as for other slots.

```php
$panel
    ->slot(Slot::HEAD_START, '<meta name="google-site-verification" content="…">')
    ->slot(Slot::HEAD_END, fn (?string $nonce) => view('analytics', ['nonce' => $nonce]));
```

## Slots from the frontend

To render a slot in your own layout or component, use the `Slot` component:

```tsx
import { Slot } from '@alfakit/react'

;<Slot name="sidebar.footer" />
// In a component that belongs to a relation manager or table widget, pass its key so
// content scoped to it shows: <Slot name="table.toolbar.end" scope={table.component} />
// Per-item slots take the render data that `when` is matched against:
// <Slot name="table.header-cell" scope={table.component} data={{ column: column.name }} />
```

Each constant's value is the slot name (`Slot::GLOBAL_SEARCH_START` is `global-search.start`).
