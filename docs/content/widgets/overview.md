---
title: Widgets
description: Stats, charts, tables and custom widgets for dashboards and pages.
---

# Widgets

Widgets render on the dashboard (`->widgets([...])` on the panel) and on any page via `getHeaderWidgets()` / `getFooterWidgets()`.

In a [starter kit](../getting-started/starter-kits#widgets-on-your-dashboard) the dashboard widgets show on your app's `/dashboard` (inside `<AlfakitWidgets>`). Outside panels, list the same widget classes in a `Widgets` component, see [Widgets and notifications outside panels](../standalone/widgets-and-notifications).

```bash
php artisan make:alfakit-widget BlogStats --type=stats   # stats | chart | table | custom
```

## StatsOverviewWidget

```php
namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Widgets\StatsOverviewWidget;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget\Stat;
use App\Alfakit\Resources\PostResource;
use App\Models\Post;
use Illuminate\Support\Number;

class BlogStats extends StatsOverviewWidget
{
    protected ?string $heading = 'This month';

    protected function getStats(): array
    {
        return [
            Stat::make('Posts', Post::count())->description('+12%')->descriptionIcon('trending-up')->color('success')->chart([3, 5, 2, 8, 6, 9])->icon('file-text')->url(PostResource::getUrl()),
            Stat::make('Revenue', Number::currency(48210))->description('On track'),
        ];
    }
}
```

| Method / property                                                          | Description                                                                                                                  |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `descriptionIcon('trending-up', IconPosition::After)`                      | Icon next to the description; `IconPosition::Before` (default) or `After` (mirrored in RTL)                                  |
| `descriptionColor('success')`                                              | Colour of the description and its icon (defaults to muted text)                                                              |
| `color('success')`                                                         | Colour of the value, the icon tile and the sparkline                                                                         |
| `chartColor('info')`                                                       | Sparkline colour when it should differ from `color()`                                                                        |
| `url($url, shouldOpenInNewTab: true)`                                      | Make the whole card a link                                                                                                   |
| `extraAttributes(['data-tour' => 'revenue', 'class' => 'border-primary'])` | HTML attributes on the card (`class` is merged)                                                                              |
| `protected int\|array\|null $columns = 3;` (widget)                        | Stats per row from `md` up, or breakpoints (`['default' => 1, 'sm' => 2, 'xl' => 4]`); override `getColumns()` to compute it |

`placeholder('—')` is shown instead of a `null` or empty value. Set it for every stat with `Stat::configureUsing(fn (Stat $stat) => $stat->placeholder('—'))` in a service provider.

## ChartWidget

```php
namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Widgets\ChartWidget;
use App\Models\Post;

class ViewsChart extends ChartWidget
{
    protected ?string $heading = 'Views';
    protected ?string $maxHeight = '20rem';

    // Filament calls this getType(); AlfaKit's getType() is the schema type ('Chart').
    protected function getChartType(): string { return 'line'; }   // bar, pie, doughnut, radar, polarArea, bubble, scatter

    protected function getFilters(): ?array
    {
        return ['week' => 'Last week', 'month' => 'Last month'];
    }

    protected function getData(): array
    {
        $range = $this->getFilter() === 'week' ? 7 : 30;

        return [
            'datasets' => [['label' => 'Views', 'data' => Post::viewsPerDay($range)]],
            'labels' => Post::dayLabels($range),
        ];
    }
}
```

`getData()` returns a Chart.js `data` object; `getOptions()` merges into Chart.js options. Datasets without colours get the theme's chart palette, or one theme colour with `protected ?string $color = 'info';` (pie-like charts keep one palette colour per slice). `protected bool $isCollapsible = true;` lets users collapse the chart to its header.

### Accessible alternative

The canvas is announced as an image named after the heading. Return the chart's values from `getChartAssistiveContent()` (text, or HTML such as a table) and screen readers get them too: the content is visually hidden and linked to the canvas with `aria-describedby`.

```php
protected function getChartAssistiveContent(): string|Htmlable|null
{
    return new HtmlString(view('charts.views-table', ['rows' => $this->getCachedData()])->render());
}
```

### Filter forms

For more than one select, use a form of filters (Filament's `HasFiltersSchema`). The values are in `$this->filters`, kept in the query string (`chartFilters[{widget id}][startDate]`), so a filtered chart can be bookmarked:

```php
use AlfaSix\Alfakit\Forms\Components\DatePicker;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Widgets\ChartWidget;
use AlfaSix\Alfakit\Widgets\ChartWidget\Concerns\HasFiltersSchema;

class OrdersChart extends ChartWidget
{
    use HasFiltersSchema;

    protected bool $hasDeferredFilters = true; // apply on "Apply" instead of on every change

    public function filtersSchema(Schema $schema): Schema
    {
        return $schema->components([
            DatePicker::make('startDate')->default(now()->subDays(30)),
            DatePicker::make('endDate')->default(now())->afterOrEqual('startDate'),
        ]);
    }

    protected function getData(): array
    {
        $start = $this->filters['startDate'] ?? null;
        // ...
    }
}
```

The fields' validation rules run on the query-string values; invalid values fall back to the defaults. The filters form has no context of its own, so use fields with static options (no `live()` fields or searchable relationship selects). Restyle the **Apply** and **Reset** buttons by overriding `filtersApplyAction()` / `filtersResetAction()`: each receives the prepared button as an `Action`; change its label, icon, colour, variant, size or tooltip, or hide it. The widget still decides what clicking it does:

```php
use AlfaSix\Alfakit\Actions\Action;

public function filtersApplyAction(Action $action): Action
{
    return $action->label('Update chart')->icon('refresh-cw');
}

public function filtersResetAction(Action $action): Action
{
    return $action->hidden(); // no reset button
}
```

### Empty state

When `getData()` returns an empty array the chart shows an empty state instead. Override `isEmpty()` to decide yourself (it can read `$this->getCachedData()`), and set the texts with `$emptyStateHeading`, `$emptyStateDescription` and `$emptyStateIcon` (or the `getEmptyStateHeading()` / `getEmptyStateDescription()` / `getEmptyStateIcon()` methods):

```php
protected ?string $emptyStateHeading = 'No orders yet';

public function isEmpty(): bool
{
    return ($this->getCachedData()['datasets'][0]['data'] ?? []) === [];
}
```

Buttons under the text come from `getEmptyStateActions()`. They are ordinary actions (modals, forms, URLs, authorisation) and run through the widget, with the page's record as `$record`:

```php
protected function getEmptyStateActions(): array
{
    return [
        Action::make('import')->label('Import orders')->url(ImportOrders::getUrl()),
        CreateAction::make()->model(Order::class)->form([...]),
    ];
}
```

To replace the whole empty state, name a component registered with `createAlfakit({ components })` in `$emptyStateView`; it receives `getEmptyStateViewData()` as props, plus the widget schema as `widget`:

```php
protected ?string $emptyStateView = 'orders-empty';

protected function getEmptyStateViewData(): array
{
    return ['importUrl' => ImportOrders::getUrl()];
}
```

### JavaScript callbacks in options

Chart.js options such as tick formatters are functions, which PHP cannot send. Name a function instead with a `'js:'` string and register it in the browser; strings are only looked up by name, never evaluated:

```php
protected function getOptions(): array
{
    return [
        'scales' => ['y' => ['ticks' => ['callback' => 'js:money']]],
        'plugins' => ['tooltip' => ['callbacks' => ['label' => 'js:tooltip.money']]],
    ];
}
```

```ts
createAlfakit({
    chartFormatters: {
        money: (value: number) => `$${value}`,
        'tooltip.money': (context: { parsed: { y: number } }) => `$${context.parsed.y}`,
    },
})
```

An unregistered name is left out of the options (Chart.js uses its default) and logged once in the console. Outside `createAlfakit()` (standalone components) call `registerChartFormatters({...})` from `@alfakit/core`. For locale-aware numbers, format with `Intl.NumberFormat` in the callback.

### Chart.js plugins

Pass plugins to `createAlfakit({ chartPlugins: [ChartDataLabels] })` (or `registerChartPlugins([...])`); they are registered with `Chart.register()` before charts are drawn, so they apply to every chart. Configure them per chart in `getOptions()` (`'plugins' => ['datalabels' => [...]]`).

### Styling charts

Chart.js paints axes, legends and tooltips on the canvas, so themes style them with CSS custom properties on `:root` (defaults in `themes.css`, re-read when the theme or dark mode changes):

| Property                                                 | Default                             |
| -------------------------------------------------------- | ----------------------------------- |
| `--chart-text`, `--chart-grid`                           | `--muted-foreground`, `--border`    |
| `--chart-legend-foreground`                              | `--muted-foreground`                |
| `--chart-tooltip-bg`, `--chart-tooltip-foreground`       | `--popover`, `--popover-foreground` |
| `--chart-tooltip-border`, `--chart-tooltip-border-width` | `--border`, `1` (unitless)          |
| `--chart-tooltip-radius`                                 | `6` (unitless)                      |
| `--stat-chart-stroke-width`, `--stat-chart-fill-opacity` | `2`, `0.12` (stat sparklines)       |

```css
:root[data-alfakit-theme~='acme'] {
    --chart-tooltip-bg: oklch(0.2 0 0);
    --chart-tooltip-foreground: oklch(0.98 0 0);
}
```

The chart card carries `data-chart-type="line|bar|…"`, the canvas wrapper `data-slot="chart-canvas"` and the empty state `data-slot="chart-empty-state"`; stat sparklines are `data-slot="stat-chart"` with `stat-chart-area` and `stat-chart-line` paths. `getOptions()` still overrides everything per chart.

## TableWidget

```php
namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\Alfakit\Widgets\TableWidget;
use App\Models\Post;

class LatestPosts extends TableWidget
{
    protected ?string $heading = 'Latest posts';

    public function table(Table $table): Table
    {
        return $table->query(Post::latest()->limit(5))->columns([TextColumn::make('title'), TextColumn::make('created_at')->since()])->paginated(false);
    }
}
```

## Custom widgets

```php
namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Widgets\Widget;

class Welcome extends Widget
{
    protected static ?string $component = 'Welcome';   // resources/js/alfakit/widgets/Welcome.tsx

    /** @return array{name: string} */
    protected function getViewData(): array
    {
        return ['name' => auth()->user()->name];
    }
}
```

`php artisan make:alfakit-widget Welcome --type=custom` writes both files. The component lives in `resources/js/alfakit/widgets/` and registers itself under its file name. It receives `getViewData()` as props and the widget schema as `widget` (`WidgetProps<{ name: string }>`, or the type generated by `php artisan alfakit:types`). See [Bring your own components](../advanced/custom-components).

## Widget properties

Pass values to a widget with `make()`. Each key sets a public property of the widget, so one widget class can appear several times with different settings, on a dashboard (`getWidgets()` of a `Dashboard` subclass), on a resource page or on a custom page (`getHeaderWidgets()` / `getFooterWidgets()`):

```php
namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Widgets\StatsOverviewWidget;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget\Stat;
use App\Models\Order;

class OrdersByStatus extends StatsOverviewWidget
{
    public ?string $status = null;

    protected function getStats(): array
    {
        return [Stat::make(ucfirst($this->status), Order::query()->where('status', $this->status)->count())];
    }
}
```

```php
protected function getHeaderWidgets(): array
{
    return [
        OrdersByStatus::make(['status' => 'pending']),
        OrdersByStatus::make(['status' => 'shipped']),
    ];
}
```

Unknown keys and protected, static or read-only properties throw an `InvalidArgumentException`. A widget made with properties gets an id with a suffix derived from them (`orders-by-status--1a2b3c4d`), so polls, lazy loading and widget actions find the same instance again. The values are set in PHP for every request, never sent to or read back from the browser.

## Reading the list page table

Header and footer widgets of a list page can read its table as the user sees it, with the active tab, filters and search applied, through `InteractsWithPageTable`:

```php
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use AlfaSix\Alfakit\Widgets\Concerns\InteractsWithPageTable;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget\Stat;

class OrderStats extends StatsOverviewWidget
{
    use InteractsWithPageTable;

    protected function getTablePage(): string
    {
        return ListOrders::class;
    }

    protected function getStats(): array
    {
        return [
            Stat::make('Orders', $this->getPageTableQuery()->count()),
            Stat::make('Revenue', Number::currency($this->getPageTableQuery()->sum('total'))),
            Stat::make('On this page', $this->getPageTableRecords()->count()),
        ];
    }
}

class ListOrders extends ListRecords
{
    protected function getHeaderWidgets(): array
    {
        return [OrderStats::class];
    }
}
```

| Method                       | Returns                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `getPageTableQuery()`        | A fresh Eloquent query with the tab, filters and search applied (without the table sort), for counts and aggregates |
| `getPageTableRecords()`      | The records on the table's current page                                                                             |
| `getPageTableRecordsCount()` | The number of matching records on all pages (the paginator's total when the table ran it)                           |
| `getPageTable()`             | The page `Table` itself                                                                                             |

The table state lives in the page URL (`?activeTab=…&filters[…]=…&search=…`), and polls and lazy loads reload that same URL, so a polling or lazy widget keeps following the table. The query is the resource's `getEloquentQuery()` with the tenant scope, so a widget never counts records the table could not list. `getTablePage()` is optional when the widget sits on the list page; when it names a page and the widget is shown elsewhere (a dashboard), that page is built for the request (its `canAccess()` is checked) and reads the same query string keys. Nested resource list pages that need parent route parameters can only be read from their own page. `ExposesTableToWidgets` on the list page, which Filament needs, is accepted and does nothing.

## Common options

`columnSpan('full')` / responsive map, `static $sort`, `static canView()`, `pollingInterval` (stats and charts), `$record` on resource pages.

A polling widget reloads only its own schema (`Page::getPolledComponents()`), never the rest of the page. Widgets and tables with the same interval are refreshed by one request, and polling pauses while the tab is hidden.

Chart.js loads with the first chart a page shows (and the rich and Markdown editors load Tiptap with the first editor), so pages without them don't download either; a skeleton holds the space until the code arrives. Neither import runs during server-side rendering.

## Lazy loading

Widgets are lazy by default (`protected static bool $isLazy = true;`, read with `static::isLazy()`): the first page response sends a placeholder (`Widget::toLazySchema()`) that the renderer shows as a skeleton in the widget's grid cell, and the widgets' data arrives right after through one Inertia deferred request (the `alfakitLazy` prop, shared with lazy relation managers). Polling, chart filters and table paging keep working once the widget has loaded; partial reloads render widgets in place. Set `protected static bool $isLazy = false;` to send a widget with the page. A page whose widgets are all eager makes no extra request.
