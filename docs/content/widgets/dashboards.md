---
title: Dashboards
description: Dashboard filters shared by widgets, and several dashboards per panel.
---

# Dashboards

`AlfaSix\Alfakit\Pages\Dashboard` is a page that shows the panel's [widgets](overview) in a grid. Register it with `->pages([Dashboard::class])`; it lives at the panel root.

## Filters

Add `HasFiltersForm` to your own dashboard class and define the fields in `filtersForm()`. The form appears above the widgets with **Apply filters** and **Reset** buttons:

```php
namespace App\Alfakit\Pages;

use AlfaSix\Alfakit\Forms\Components\DatePicker;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Pages\Dashboard as BaseDashboard;
use AlfaSix\Alfakit\Pages\Dashboard\Concerns\HasFiltersForm;
use AlfaSix\Alfakit\Schemas\Schema;

class Dashboard extends BaseDashboard
{
    use HasFiltersForm;

    public function filtersForm(Schema $schema): Schema
    {
        return $schema->components([
            DatePicker::make('startDate'),
            DatePicker::make('endDate')->afterOrEqual('startDate'),
            Select::make('status')->options(['draft' => 'Draft', 'published' => 'Published']),
        ])->columns(3);
    }
}
```

Applied values are validated like any form, then kept in the session per user, panel, tenant and dashboard, so they survive navigation and reloads (lazy and polled widgets see them too). `getFilters()` returns them on the page.

Widgets read them as `$this->pageFilters` with the `InteractsWithPageFilters` trait:

```php
use AlfaSix\Alfakit\Widgets\Concerns\InteractsWithPageFilters;

class OrdersStats extends StatsOverviewWidget
{
    use InteractsWithPageFilters;

    protected function getStats(): array
    {
        $orders = Order::query()
            ->when($this->pageFilters['startDate'] ?? null, fn ($query, $date) => $query->whereDate('created_at', '>=', $date))
            ->when($this->pageFilters['endDate'] ?? null, fn ($query, $date) => $query->whereDate('created_at', '<=', $date));

        return [Stat::make('Orders', $orders->count())];
    }
}
```

Override `applyFilters(array $data)` or `resetFilters()` to change what happens on submit, and `getFiltersSessionKey()` to share filters between dashboards.

#### Keeping filters in the URL instead of the session

Set `$persistsFiltersInSession` to `false` (or override `persistsFiltersInSession()`) to keep the applied filters in the page URL (`?filters[startDate]=2026-01-01`) instead of the session. They then last only as long as that URL, and a filtered dashboard can be bookmarked or shared:

```php
class Dashboard extends BaseDashboard
{
    use HasFiltersForm;

    protected static bool $persistsFiltersInSession = false;
}
```

Applying and resetting redirect to the dashboard with the new query string (`getFiltersQueryKey()` names the key, `filters` by default). Values in a URL are user input that was never validated, so validate or cast `$this->pageFilters` before using them. `live()` fields wait for **Apply filters** in this mode, and actions inside widgets read the filters from the page they were opened on. This works for `HasFiltersForm` and `HasFiltersAction`.

### Filters in an action modal

With `HasFiltersAction` the filters live in a `FilterAction` slide-over in the header instead of a form above the widgets. Its badge counts the filters in use, its form starts from the applied values, and **Reset** clears them:

```php
use AlfaSix\Alfakit\Pages\Dashboard\Actions\FilterAction;
use AlfaSix\Alfakit\Pages\Dashboard\Concerns\HasFiltersAction;

class Dashboard extends BaseDashboard
{
    use HasFiltersAction;

    protected function getHeaderActions(): array
    {
        return [
            FilterAction::make()->schema([
                DatePicker::make('startDate'),
                DatePicker::make('endDate'),
            ]),
        ];
    }
}
```

Widgets read the values with `InteractsWithPageFilters` in the same way.

### Live filters

Mark fields `live()` to apply them as soon as they change, without the button: the live refresh validates the form and stores the filters in the session, and the renderer reloads the widgets. **Apply filters** stays for the fields that are not live and disappears when every field is live; **Reset** is unchanged.

```php
Select::make('status')->options([...])->live(),
DatePicker::make('startDate')->live(onBlur: true),
```

Invalid values are not applied (the widgets keep the last applied filters) and show as errors on the next Apply.

## Several dashboards

A panel can have any number of dashboards. Each one has its own route, navigation item and widgets:

```php
class SalesDashboard extends \AlfaSix\Alfakit\Pages\Dashboard
{
    protected static ?string $navigationIcon = 'chart-line';

    public function getWidgets(): array
    {
        return [RevenueChart::class, TopProducts::class];
    }
}

$panel->pages([Dashboard::class, SalesDashboard::class]);
```

The main dashboard (`Dashboard` itself, or your subclass named `Dashboard`) lives at the panel root; any other subclass gets `/{slug}` (`/admin/sales-dashboard`) and a label from its class name, unless it sets `$routePath`, `$slug`, `$navigationLabel` or `$title`. The panel home is the dashboard at the root (or the first dashboard). `getWidgets()` defaults to the panel's widgets, so override it on each dashboard. Each dashboard can use `HasFiltersForm` with its own filters.
