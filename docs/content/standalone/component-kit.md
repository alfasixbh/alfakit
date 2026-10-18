---
title: Component kit
description: Render any AlfaKit form, table, infolist, chart, widget, Kanban board or calendar in your app's own Inertia pages with one line in the controller.
---

# Component kit

Anything AlfaKit renders in a panel can be rendered in one of your app's own Inertia pages: forms, tables, infolists, actions with modals, stats, charts, table widgets, custom widgets, and plugin widgets such as the Kanban board and the calendar. The component is a PHP class; the controller passes it as a prop; the page renders `<AlfakitComponent>`. Nothing else is needed: no panel, no `createAlfakit()`, no layout of AlfaKit's.

## One line in the controller

```php
use AlfaSix\Alfakit\Facades\Alfakit;

Route::get('/orders', fn () => Alfakit::render('orders', [
    'stats' => OrderStats::class,                                // built with make()
    'orders' => [OrdersTable::class, ['customer' => $customer]], // make() with parameters
    'title' => __('Your orders'),                                 // any other prop, as is
]));
```

`Alfakit::render()` is `Inertia::render()` that builds standalone component classes for you. Built components work the same way with Inertia directly:

```php
return Inertia::render('orders', [
    'stats' => OrderStats::make(),
    'orders' => OrdersTable::make(['customer' => $customer]),
]);
```

## Generate a page

```bash
php artisan make:alfakit-page Orders --standalone            # add --model=Order to bind a model
```

This writes the component (`app/Alfakit/Standalone/Orders.php`, a [`Component`](actions-and-infolists) you fill with a `form()`, `table()`, `infolist()`, `content()`, `actions()` and `widgets()`), the Inertia page that renders it (`resources/js/pages/orders.tsx`, or `Orders.vue` / `Orders.svelte`), and prints the route to add. `--adapter=react|vue|svelte` overrides the detected renderer, `--no-frontend` writes only the PHP class. For a single form, table or infolist use `make:alfakit-form`, `make:alfakit-table` or `make:alfakit-infolist`.

## Render it

```tsx
// React: resources/js/pages/orders.tsx
import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/react'

export default function Orders({
    stats,
    orders,
}: {
    stats: StandaloneComponentSchema
    orders: StandaloneComponentSchema
}) {
    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
            <AlfakitComponent component={stats} />
            <AlfakitComponent component={orders} />
        </div>
    )
}
```

```vue
<!-- Vue: resources/js/pages/Orders.vue -->
<script setup lang="ts">
import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/vue'

defineProps<{ stats: StandaloneComponentSchema; orders: StandaloneComponentSchema }>()
</script>

<template>
    <div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        <AlfakitComponent :component="stats" />
        <AlfakitComponent :component="orders" />
    </div>
</template>
```

```svelte
<!-- Svelte: resources/js/pages/Orders.svelte -->
<script lang="ts">
    import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/svelte'

    let { stats, orders }: { stats: StandaloneComponentSchema; orders: StandaloneComponentSchema } =
        $props()
</script>

<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
    <AlfakitComponent component={stats} />
    <AlfakitComponent component={orders} />
</div>
```

Install the styles once (`php artisan alfakit:install --standalone` does it), see [the overview](overview).

## What you can render

| You want                        | Extend                                 | Docs                                                   |
| ------------------------------- | -------------------------------------- | ------------------------------------------------------ |
| A form with a submit button     | `AlfaSix\Alfakit\Standalone\Form`      | [Forms](forms)                                         |
| A table                         | `AlfaSix\Alfakit\Standalone\Table`     | [Tables](tables)                                       |
| A detail view                   | `AlfaSix\Alfakit\Standalone\Infolist`  | [Actions and infolists](actions-and-infolists)         |
| Stats, charts and other widgets | `AlfaSix\Alfakit\Standalone\Widgets`   | [Widgets and notifications](widgets-and-notifications) |
| Any mix of those                | `AlfaSix\Alfakit\Standalone\Component` | [Actions and infolists](actions-and-infolists)         |

Every widget works in `widgets()`: `StatsOverviewWidget`, `ChartWidget`, `TableWidget`, your own widgets, and plugin widgets.

### Kanban boards and calendars

The [Kanban](../plugins/kanban) and [calendar](../plugins/calendar) plugins ship widgets (`KanbanWidget`, `CalendarWidget`). Put them in a `Standalone\Widgets` component: cards move, events load and modals open through the standalone endpoints, with the same policies. Register the plugin on the standalone panel too, so its options and frontend translations apply outside panels:

```php
// config/alfakit.php
'standalone' => [
    // ...
    'plugins' => [\AlfaSix\AlfakitCalendar\CalendarPlugin::class, \AlfaSix\AlfakitKanban\KanbanPlugin::class],
],
```

or configured, in a service provider: `Alfakit::getStandalonePanel()->plugin(CalendarPlugin::make()->firstDay(1))`.

```php
use AlfaSix\Alfakit\Standalone\Widgets;

class TeamBoard extends Widgets
{
    public Team $team;

    public function widgets(): array
    {
        return [TasksBoard::class, MeetingsCalendar::make()->columnSpan('full')];
    }

    public function widgetColumns(): int|array
    {
        return 1;
    }
}

Route::get('/teams/{team}/board', fn (Team $team) => Alfakit::render('team-board', [
    'board' => [TeamBoard::class, ['team' => $team]],
]));
```

## Ready-made kits

- [App auth kit](auth-kit): sign-in, registration, password reset, email verification, two-step verification and an account page for your app's users, built from these components.
- [Customer portal](../panels/customer-portal): when customers need a whole area with navigation, a panel with the `portal()` preset is quicker than many standalone pages.
