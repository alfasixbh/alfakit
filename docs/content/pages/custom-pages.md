---
title: Custom pages
description: Pages built from schema components or your own frontend component.
---

# Custom pages

```bash
php artisan make:alfakit-page Settings
```

## Schema-driven pages

```php
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

`PageShell` gives you the app layout, breadcrumbs and header actions; drop it to render a completely custom screen. Use `usePageActionContext()` and `ActionList` to render the page's actions anywhere.

To build an interactive screen (a point of sale, a board, a calendar) that calls PHP methods, embeds PHP forms and tables, and runs in a fullscreen layout, see [Building app pages](/docs/pages/app-pages). `php artisan make:alfakit-page Pos --component` generates one.

## Route parameters

`mount(mixed ...$parameters)` receives route parameters (`static::$routePath = '/reports/{period}'`). Internal endpoints rebuild the page with the same parameters through the context token.

## Layout

`protected static string $layout = 'auth' | 'blank' | 'app' | 'fullscreen'`, `$maxContentWidth`, `getBreadcrumbs()`, `getHeading()`, `getSubheading()`.

A custom page has no breadcrumbs by default. Give it one with `protected static ?string $breadcrumb = 'Reports';` (after the cluster's breadcrumb in a [cluster](../panels/clusters)), or return the whole trail from `getBreadcrumbs()` as `url => label` pairs. Resource pages use `$breadcrumb` for their own, last breadcrumb.
