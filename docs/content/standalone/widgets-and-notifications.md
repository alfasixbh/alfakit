---
title: Widgets and notifications outside panels
description: Stats, charts and table widgets in your own pages, with lazy loading and polling; toasts for notifications.
---

# Widgets and notifications outside panels

## Widgets

```php
namespace App\Alfakit\Standalone;

use App\Alfakit\Widgets\TeamMembers;
use App\Alfakit\Widgets\TeamRevenue;
use App\Models\Team;

class AccountStats extends \AlfaSix\Alfakit\Standalone\Widgets
{
    public Team $team;

    public function widgets(): array
    {
        return [
            TeamRevenue::make()->columnSpan(2),
            TeamMembers::class,
        ];
    }

    public function widgetColumns(): int|array
    {
        return ['default' => 1, 'md' => 3];
    }
}
```

```php
// Controller
return Inertia::render('Account/Show', [
    'stats' => AccountStats::make(['team' => $team]),
]);
```

The page renders the prop with `<AlfakitComponent>`, like any standalone component:

```tsx
// React: resources/js/pages/Account/Show.tsx
import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/react'

export default function Show({ stats }: { stats: StandaloneComponentSchema }) {
    return <AlfakitComponent component={stats} className="p-4" />
}
```

```vue
<!-- Vue: resources/js/pages/Account/Show.vue -->
<script setup lang="ts">
import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/vue'

defineProps<{ stats: StandaloneComponentSchema }>()
</script>

<template>
    <AlfakitComponent :component="stats" class="p-4" />
</template>
```

```svelte
<!-- Svelte: resources/js/pages/Account/Show.svelte -->
<script lang="ts">
    import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/svelte'

    let { stats }: { stats: StandaloneComponentSchema } = $props()
</script>

<AlfakitComponent component={stats} class="p-4" />
```

The widgets render in a grid of `widgetColumns()` columns with your app's shadcn tokens. Custom widgets need their frontend component: pass it as `components={{ RevenueWidget }}` (`:components` in Vue) or register it once with `configureAlfakit({ components })`. In an app made from a Laravel starter kit with a `starterKit()` panel, the panel's own widgets already show on `/dashboard` through `<AlfakitWidgets />` (see [Widgets on your dashboard](../getting-started/starter-kits#widgets-on-your-dashboard)).

Any [widget](../widgets/overview) works: `StatsOverviewWidget`, `ChartWidget`, `TableWidget` and custom widgets with their own frontend component. Plugin widgets (the [Kanban board](../plugins/kanban) and the [calendar](../plugins/calendar)) work too once the plugin is listed in `alfakit.standalone.plugins` (see the [component kit](component-kit#kanban-boards-and-calendars)). Widgets receive the component through `$this->page` as they would receive a page, and the bound record through `$this->record`.

### Lazy loading and polling

Lazy widgets (the default) render as skeletons in the page response; the renderer fetches their schemas right after mounting from `/_alfakit/standalone/components`, authorised by the component's token. Widgets and tables with `poll('10s')` refresh through the same endpoint, sharing one request per interval across components on the page and pausing while the tab is hidden. Nothing in your controller or page changes.

## Notifications

`Notification::make()->...->send()` inside `submit()` or an action flashes the notification; the page reloads in place and the toast appears. Place the toaster once in your app layout:

```tsx
// React, in your app layout or createInertiaApp({ withApp })
import { AlfakitToaster } from '@alfakit/react'

;<AlfakitToaster />
```

```vue
<!-- Vue -->
<AlfakitToaster />
```

```svelte
<!-- Svelte -->
<AlfakitToaster />
```

Without one, the first `<AlfakitComponent>` on a page renders a toaster itself, so nothing is required to get started.

`<AlfakitToaster>` renders sonner's `<Toaster>` and shows the notifications flashed by AlfaKit. If your layout already mounts a sonner toaster **from the same `sonner` / `vue-sonner` / `svelte-sonner` package instance** (the starter kits do), pass `toaster={false}` (`:toaster="false"` in Vue) so AlfaKit's notifications go through yours and are not shown twice. When the versions differ (two package instances), keep the default: each toaster then only shows its own toasts.

Props: `position` (`top-end` by default; `start`/`end` follow the reading direction), `dir`, `toaster`.

Database notifications, the notifications menu and realtime broadcasts belong to panels; outside panels use your application's own channels.
