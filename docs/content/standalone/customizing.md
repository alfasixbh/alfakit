---
title: Customizing standalone components
description: Registry overrides, classes, headings, custom layouts of the blocks, and how styling is inherited from your app.
---

# Customizing standalone components

## Styling

`<AlfakitComponent>` uses the same shadcn components as the panel, so it follows **your application's** `--primary`, `--border`, `--radius`, fonts and dark mode. The standalone stylesheet only adds what shadcn does not define (the `success`, `warning` and `info` colours), the runtime grid classes and the rich editor styles:

```css
@import 'tailwindcss';
@import '@alfakit/react/standalone.css';
@source '../../node_modules/@alfakit/react/dist';
```

Override the status colours in your own `:root` / `.dark` (`--success`, `--warning`, `--info` and their `-foreground` variants). Text on solid danger buttons is white inside AlfaKit's components and the dialogs they open, because the Laravel starter kits set `--destructive-foreground` to the same red as `--destructive`; set `--alfakit-danger-foreground` to change it. Panel [themes and design options](../design/theming) do not apply outside panels, which is the point: the component looks like the page it sits in.

Every renderer emits the same hooks (`data-slot="standalone"`, `data-alfakit-component="App\…"`, `data-slot="page-header"`, `data-slot="form-block"`, `data-slot="table"`, …) and the `dir` attribute of the component's language, so you can target them from your CSS.

## Classes and attributes

```tsx
<AlfakitComponent component={form} className="bg-card max-w-xl rounded-xl border p-6" />
```

`class` in Vue and Svelte. Classes set in PHP with `extraAttributes(['class' => '…'])` on sections, fields and columns are merged as in panels.

## Headings and actions

```php
OrdersTable::make(['customer' => $customer])->heading('Orders')->subheading('Last 12 months');
```

The heading renders as an `h2` with the component's `actions()` on the end side. Leave the heading out to keep your own page title.

## Replacing renderers

Global defaults, once in your app entry (no `createAlfakit()` needed):

```tsx
import { configureAlfakit } from '@alfakit/react'

configureAlfakit({
    components: {
        TextInput: MyInput, // replace a built-in field everywhere
        'map-picker': MapPicker, // View::make('map-picker') or a custom field type
        'column:TextColumn': MyText, // a column renderer
        'widget:Chart': MyChart, // a widget type
    },
})
```

Per instance:

```tsx
<AlfakitComponent component={form} components={{ TextInput: MyInput }} />
```

Both use the same [registry keys](../adapters/custom-components) as `createAlfakit({ components })`; per-instance overrides win over global ones. Inside a panel page (a custom page that renders an `<AlfakitComponent>`), the panel's registry is the base.

## Laying out the blocks yourself

The default renders the blocks in a vertical stack. Take over with the children render function (React), the default slot (Vue) or the `children` snippet (Svelte); `header` and `footer` add content before and after the blocks:

```tsx
<AlfakitComponent component={overview}>
    {(blocks, render) => (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
                {blocks.filter((b) => b.type === 'Table').map(render)}
            </div>
            <aside>{blocks.filter((b) => b.type !== 'Table').map(render)}</aside>
        </div>
    )}
</AlfakitComponent>
```

```vue
<AlfakitComponent :component="overview">
    <template #default="{ blocks }">
        <ContentBlockRenderer v-for="block in blocks" :key="block.key" :block="block" />
    </template>
</AlfakitComponent>
```

```svelte
<AlfakitComponent component={overview}>
    {#snippet children(blocks)}
        {#each blocks as block (block.key)}
            <ContentBlockRenderer {block} />
        {/each}
    {/snippet}
</AlfakitComponent>
```

`ContentBlockRenderer` is exported by every renderer and renders one block (`Form`, `Table`, `Infolist`, `Widgets`, `Schema`) inside the component's providers, so forms, actions and modals keep working in your layout.

## Hooks in your own components

Components you render inside an `<AlfakitComponent>` (custom fields, columns, widgets, `View` components) use the same hooks as in panels: `useT()`, `useFormatter()`, `useDirection()`, `useField()`, `useActionRunner()`, `usePanel()` and `usePageSchema()`. Outside panels the last two return the panel and page shapes derived from the payload (endpoints, localization, token, content).

## Server-side rendering

`<AlfakitComponent>` renders on the server like any component of your app: it creates its own translator per render, never touches `document` or `window` during rendering, and loads lazy components and polls only in the browser. Your app's SSR entry needs no AlfaKit setup.
