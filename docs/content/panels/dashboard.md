---
title: Dashboard
description: The panel's landing page, and personal dashboards users arrange themselves.
---

# Dashboard

`AlfaSix\Alfakit\Pages\Dashboard` shows the panel's [widgets](../widgets/overview) in a grid at the panel root. Its widgets come from `getWidgets()` (the panel's `->widgets([...])` by default) and its grid from `getColumns()`. Filters shared by the widgets and several dashboards per panel are covered in [Dashboards](../widgets/dashboards).

```php
use AlfaSix\Alfakit\Pages\Dashboard as BaseDashboard;

class Dashboard extends BaseDashboard
{
    public function getWidgets(): array
    {
        return [StatsOverview::class, RevenueChart::class, LatestOrders::class];
    }

    public function getColumns(): int|array
    {
        return ['default' => 1, 'md' => 2, 'xl' => 3];
    }
}
```

In a [starter kit panel](../getting-started/starter-kits#widgets-on-your-dashboard) there is no dashboard page: the panel's widgets show on your app's `/dashboard` through `<AlfakitWidgets>`, with the `getWidgets()` and `getColumns()` of a registered `Dashboard` page.

## Customizable dashboards

Let every user arrange their own dashboard: reorder widgets, resize them, hide them, add more from a library and go back to your layout at any time.

```php
// Every dashboard of the panel:
$panel->customizableDashboards();

// Or one dashboard (in a service provider); `false` turns it off for a dashboard even
// when the panel enables it, `null` follows the panel again.
Dashboard::customizable();
```

Publish and run the migration of the table that stores the layouts:

```bash
php artisan vendor:publish --tag=alfakit-dashboard-migrations
php artisan migrate
```

The dashboard shows an **Edit dashboard** button (on panel dashboards; `<AlfakitWidgets>` on a starter kit's `/dashboard` doesn't offer editing yet). In edit mode each widget gets a toolbar:

- a drag handle: drag it with the pointer, or focus it and use the arrow keys (left and right follow the reading direction, so they swap in right-to-left languages), Home and End. Each move is announced to screen readers.
- a size picker with the spans the widget allows,
- a **Hide** button.

Below the grid, **Add widget** lists hidden widgets and the library. **Save** stores the layout, **Cancel** drops the changes and **Reset to default** brings your layout back (saving it forgets the user's own layout). While editing, the widgets themselves are inert; they keep their own lazy loading and polling once the layout is saved.

Your `getWidgets()` order (by `$sort`) and the widgets' own column spans stay the default layout. Widgets you add to `getWidgets()` later show up for everyone, appended to their saved layouts.

### The widget library

Users can add the dashboard's default widgets plus the panel's library:

```php
$panel
    ->customizableDashboards()
    ->availableDashboardWidgets([TopCustomers::class, TrafficSources::class]);
```

Override `getAvailableWidgets()` on a dashboard to offer a different set. Every widget is still filtered by its `canView()`, both in the library and when a stored layout is shown, so a user never sees (or saves) a widget they may not view. Name a widget in the library with `$libraryLabel` / `$libraryDescription` (the heading is used otherwise):

```php
namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Widgets\ChartWidget;

class TrafficSources extends ChartWidget
{
    protected static ?string $libraryLabel = 'Traffic sources';

    protected static ?string $libraryDescription = 'Visits per channel over the last 30 days.';
}
```

### Allowed sizes

By default a widget may span from one column to the whole grid. Limit the choices with `$columnSpanOptions` (or `allowedColumnSpans()` on an instance); `'full'` is the whole row:

```php
namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Widgets\ChartWidget;

class RevenueChart extends ChartWidget
{
    protected static ?array $columnSpanOptions = [1, 2, 'full'];
}
```

```php
// In getWidgets() or availableDashboardWidgets():
StatsOverview::make()->allowedColumnSpans([1, 'full']);
```

The chosen span applies at the grid's breakpoints; where the grid has fewer columns the widget takes the full row.

### Storage and security

Layouts are stored per panel, dashboard (`getDashboardLayoutKey()`, the slug by default), user and tenant in `alfakit_dashboard_layouts` (rename it with `alfakit.dashboards.layouts_table`). Saving goes through `POST /_alfakit/dashboard/layout`, authorised by the page's context token like every internal endpoint: the user, panel access, auth middleware, tenant and the dashboard's `canAccess()` are checked again, and widget ids outside the library are refused (422). Guests never get edit mode.

On the server, `$dashboard->getDashboardLayout()` returns the effective layout and `saveDashboardLayout($layout)` / `saveDashboardLayout(null)` save or reset it.

### Frontend

The grid emits `data-slot="dashboard"` (with `data-editing` in edit mode), `dashboard-toolbar`, `widgets`, `dashboard-widget`, `dashboard-widget-controls`, `dashboard-widget-handle`, `dashboard-widget-span`, `dashboard-library`, `dashboard-empty` and `dashboard-announcer` in all three renderers. The editing logic is `DashboardEditor` in `@alfakit/core` if you build your own grid.
