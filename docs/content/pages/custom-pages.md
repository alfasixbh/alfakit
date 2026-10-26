---
title: Custom pages
description: Pages built from schema components or your own frontend component.
---

# Custom pages

```bash
php artisan make:alfakit-page Settings
```

Custom pages work in admin panels and in [starter kit](../getting-started/starter-kits) panels (listed in your app's sidebar). Outside panels, build an ordinary Inertia page with [standalone components](../standalone/overview) instead.

## Schema-driven pages

```php
namespace App\Alfakit\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Schemas\Components\Html;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Alfakit\Widgets\SystemStats;
use App\Models\Setting;

class Settings extends Page
{
    protected static ?string $navigationIcon = 'settings';
    protected static ?string $title = 'Settings';
    protected static ?string $slug = 'settings';

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('General')->schema([
                TextInput::make('site_name')->required(),
                Toggle::make('maintenance'),
            ]),
        ]);
    }

    public function mount(mixed ...$parameters): void
    {
        $this->formData = Setting::all()->pluck('value', 'key')->all();
    }

    protected function getFormActions(): array
    {
        return [
            Action::make('save')->label('Save')->button()->keyBindings(['mod+s'])
                ->form(fn () => $this->getForm()->getComponents(withHidden: true))
                ->action(function (array $data) {
                    Setting::sync($data);
                    Notification::make()->success()->title('Saved')->send();

                    return back();
                }),
        ];
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([Html::make('<p>Anything else…</p>')]);
    }

    protected function getHeaderWidgets(): array
    {
        return [SystemStats::class];
    }
}
```

`Setting` (with its `sync()` method) and `SystemStats` stand for your own model and widget; a new app has neither. For a ready-made settings store, see the [Settings plugin](../plugins/settings).

Pages compose blocks in this order: header widgets, form, infolist, table, `content()`, footer widgets. Override `getContentBlocks()` to control it.

## Tables on pages

```php
public function table(Table $table): Table
{
    return $table->query(AuditLog::query())->columns([...])->filters([...]);
}
```

## Your own frontend component

```php
namespace App\Alfakit\Pages;

use AlfaSix\Alfakit\Pages\Page;
use App\Models\Order;

class Reports extends Page
{
    protected static ?string $component = 'Pages/Reports';   // registered in createAlfakit({ pages })

    protected function getViewData(): array
    {
        return ['sales' => Order::monthly()];
    }
}
```

```tsx
import { PageShell, usePageSchema } from '@alfakit/react'

export default function Reports({ sales }) {
    const page = usePageSchema()!
    return (
        <PageShell page={page}>
            <SalesChart data={sales} />
        </PageShell>
    )
}
```

```vue
<!-- Vue: resources/js/alfakit/pages/Reports.vue -->
<script setup lang="ts">
import { PageShell, usePageSchema } from '@alfakit/vue'

defineProps<{ sales: unknown }>()
const page = usePageSchema()
</script>

<template>
    <PageShell :page="page!">
        <SalesChart :data="sales" />
    </PageShell>
</template>
```

```svelte
<!-- Svelte: resources/js/alfakit/pages/Reports.svelte -->
<script lang="ts">
    import { PageShell, usePageSchema } from '@alfakit/svelte'

    let { sales }: { sales: unknown } = $props()
    const page = usePageSchema()
</script>

<PageShell page={page!}>
    <SalesChart data={sales} />
</PageShell>
```

Instead of listing it in `createAlfakit({ pages })`, a file in `resources/js/alfakit/pages/` registers itself (`pages/Reports.tsx` is `Pages/Reports`). Since 0.1.9 these pages also open in a starter kit, through `Alfakit/Page`; the generated page file's `discover` picks the component up from the same folder.

`PageShell` gives you the app layout, breadcrumbs and header actions; drop it to render a completely custom screen. Use `usePageActionContext()` and `ActionList` to render the page's actions anywhere.

To build an interactive screen (a point of sale, a board, a calendar) that calls PHP methods, embeds PHP forms and tables, and runs in a fullscreen layout, see [Building app pages](/docs/pages/app-pages). `php artisan make:alfakit-page Pos --component` generates one.

## Route parameters

`mount(mixed ...$parameters)` receives the route parameters in order (`protected static ?string $routePath = '/reports/{period}';` gives `$parameters[0]`; keep the `?string` type of the parent property). Internal endpoints rebuild the page with the same parameters through the context token. A page whose route needs parameters gets no navigation item (its URL can't be built without them); link to it with `Reports::getUrl(['period' => 'month'])`.

## Layout

`protected static string $layout = 'auth' | 'blank' | 'app' | 'fullscreen'`, `$maxContentWidth`, `getBreadcrumbs()`, `getHeading()`, `getSubheading()`.

A custom page has no breadcrumbs by default. Give it one with `protected static ?string $breadcrumb = 'Reports';` (after the cluster's breadcrumb in a [cluster](../panels/clusters)), or return the whole trail from `getBreadcrumbs()` as `url => label` pairs. Resource pages use `$breadcrumb` for their own, last breadcrumb.
