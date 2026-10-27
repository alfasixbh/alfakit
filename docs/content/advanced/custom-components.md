---
title: Bring your own components
description: Drop a React, Vue or Svelte file into resources/js/alfakit and it renders your PHP field, column, entry, widget, page or block. No registration, typed props, shadcn welcome.
---

# Bring your own components

A custom component has two halves. The PHP class decides the data, validation and authorisation. The frontend file only draws it. AlfaKit connects them by **file name**, so you write the two files and nothing else.

```
app/Alfakit/Forms/Components/ColorWheel.php      ColorWheel::make('accent')
resources/js/alfakit/fields/ColorWheel.tsx       renders the `ColorWheel` field type
```

## 1. Turn on auto-registration

New installs already have it. In an older app, add `discover` to the panel entry, and to the SSR entry if you use server-side rendering:

**React**

```tsx
// resources/js/alfakit/app.tsx (and createAlfakitServer() in ssr.tsx)
import { createAlfakit } from '@alfakit/react'

void createAlfakit({
    discover: import.meta.glob(
        './{fields,columns,entries,widgets,pages,components,blocks}/**/*.tsx',
    ),
})
```

**Vue**

```ts
// resources/js/alfakit/app.ts (and createAlfakitServer() in ssr.ts)
import { createAlfakit } from '@alfakit/vue'

void createAlfakit({
    discover: import.meta.glob(
        './{fields,columns,entries,widgets,pages,components,blocks}/**/*.vue',
    ),
})
```

**Svelte**

```ts
// resources/js/alfakit/app.ts (and createAlfakitServer() in ssr.ts)
import { createAlfakit } from '@alfakit/svelte'

void createAlfakit({
    discover: import.meta.glob(
        './{fields,columns,entries,widgets,pages,components,blocks}/**/*.svelte',
    ),
})
```

`import.meta.glob()` is Vite's, so the glob has to be written out in your entry. AlfaKit doesn't need a Vite plugin. Each file becomes its own chunk. Before Inertia renders a page, AlfaKit loads the chunks that page's schema uses. That happens on the server, during hydration and on every visit, so a custom field never flashes in and the SSR markup always matches. A component that first appears later, for example in a modal, loads when it renders.

## 2. Where files go

| File                           | Registry key             | PHP side                                                         |
| ------------------------------ | ------------------------ | ---------------------------------------------------------------- |
| `fields/ColorWheel.tsx`        | `ColorWheel`             | `class ColorWheel extends Field` (its type is the class name)    |
| `columns/ProgressBar.tsx`      | `column:ProgressBar`     | `class ProgressBar extends Column`                               |
| `entries/StarRating.tsx`       | `StarRating`             | `class StarRating extends Entry`                                 |
| `widgets/RevenueCard.tsx`      | `RevenueCard`            | `protected static ?string $component = 'RevenueCard'`            |
| `components/ShippingPanel.tsx` | `ShippingPanel`          | a layout `Component`, `View::make('ShippingPanel')`, an override |
| `components/map-picker.tsx`    | `map-picker`             | `View::make('map-picker')`                                       |
| `blocks/pricing.tsx`           | `cms:block:pricing`      | a CMS block named `pricing`                                      |
| `pages/Reports.tsx`            | `Pages/Reports`          | `protected static ?string $component = 'Pages/Reports'`          |
| `pages/Billing/Invoices.tsx`   | `Pages/Billing/Invoices` | `'Pages/Billing/Invoices'`                                       |

Rules:

- The key is the file name exactly as you write it. A sub-folder such as `fields/shop/ColorWheel.tsx` only organises files, except in `pages/`. `fields/ColorWheel/index.tsx` counts as `ColorWheel`.
- Files and folders that start with `_`, plus `*.test.*`, `*.spec.*` and `*.stories.*` files, are skipped. Use those names for helpers.
- The component must be the file's **default export**.
- A file named like a built-in type replaces it: `fields/TextInput.tsx` renders every `TextInput`.
- If two files resolve to the same key, the console warns, names both files and uses the first.
- An explicit `createAlfakit({ components: { ColorWheel: Other } })` or `pages: { … }` beats a discovered file.

## 3. Generate both halves

```bash
php artisan make:alfakit-field ColorWheel        # Forms/Components/ColorWheel.php + fields/ColorWheel.tsx
php artisan make:alfakit-column ProgressBar      # Tables/Columns/ProgressBar.php + columns/ProgressBar.tsx
php artisan make:alfakit-entry StarRating        # Infolists/Components/StarRating.php + entries/StarRating.tsx
php artisan make:alfakit-schema-component ShippingPanel
php artisan make:alfakit-widget RevenueCard --type=custom
php artisan make:alfakit-page Reports --component
```

The adapter comes from `package.json`. Use `--adapter=react|vue|svelte` to choose it yourself, or `--no-frontend` to write only the PHP class. If your entry doesn't use `discover`, the generators still register the component in `createAlfakit({ components })` and print the line that turns on auto-registration.

The written files (and an entry they edit) are formatted with your app's own formatter when it has one: `vp fmt` in apps whose `vite.config` has a `fmt` section (the Laravel starter kits), else Oxfmt (`.oxfmtrc.json`) or Prettier (a Prettier config), run from `node_modules/.bin` on just those files. Without one, or if it fails, they keep AlfaKit's style (2 spaces, no semicolons). `vp fmt` and Oxfmt don't format `.svelte` files, so in the Svelte starter kit the generated components keep that style (format them with Prettier and `prettier-plugin-svelte` if you add them). Turn it off with `'file_generation' => ['format_frontend' => false]` in `config/alfakit.php`.

## 4. Write the component

A field binds its state with `useField()`. Validation, hydration and saving stay in PHP.

```php
namespace App\Alfakit\Forms\Components;

use AlfaSix\Alfakit\Forms\Components\Field;

class ColorWheel extends Field
{
    /** @var list<string> */
    protected array $swatches = [];

    public function swatches(array $swatches): static
    {
        $this->swatches = $swatches;

        return $this;
    }

    /**
     * @return array{swatches: list<string>}
     */
    protected function getSchemaProps(): array
    {
        return ['swatches' => $this->swatches];
    }
}
```

**React**

```tsx
// resources/js/alfakit/fields/ColorWheel.tsx
import { FieldWrapper, useField } from '@alfakit/react'
import type { ColorWheelProps } from '../types'

export default function ColorWheel({ component }: ColorWheelProps) {
    const { value, setValue, error, id, disabled, aria } = useField<string | null>(component)

    return (
        <FieldWrapper field={component} htmlFor={id} error={error}>
            <div id={id} role="radiogroup" aria-label={component.label ?? undefined} {...aria}>
                {component.swatches.map((swatch) => (
                    <button
                        key={swatch}
                        type="button"
                        role="radio"
                        aria-checked={value === swatch}
                        aria-label={swatch}
                        disabled={disabled}
                        onClick={() => setValue(swatch)}
                        style={{ backgroundColor: swatch }}
                        className="size-8 rounded-full"
                    />
                ))}
            </div>
        </FieldWrapper>
    )
}
```

**Vue**

```vue
<!-- resources/js/alfakit/fields/ColorWheel.vue -->
<script setup lang="ts">
import { FieldWrapper, useField } from '@alfakit/vue'
import type { ColorWheelSchema } from '../types'

const props = defineProps<{ component: ColorWheelSchema }>()
const { value, setValue, error, id, disabled, aria } = useField<string | null>(
    () => props.component,
)
</script>

<template>
    <FieldWrapper :field="props.component" :html-for="id" :error="error">
        <div
            :id="id"
            role="radiogroup"
            :aria-label="props.component.label ?? undefined"
            v-bind="aria"
        >
            <button
                v-for="swatch in props.component.swatches"
                :key="swatch"
                type="button"
                role="radio"
                :aria-checked="value === swatch"
                :aria-label="swatch"
                :disabled="disabled"
                :style="{ backgroundColor: swatch }"
                class="size-8 rounded-full"
                @click="setValue(swatch)"
            />
        </div>
    </FieldWrapper>
</template>
```

**Svelte**

```svelte
<!-- resources/js/alfakit/fields/ColorWheel.svelte -->
<script lang="ts">
    import { FieldWrapper, useField } from '@alfakit/svelte'
    import type { ColorWheelProps } from '../types'

    let { component }: ColorWheelProps = $props()
    const field = useField<string | null>(() => component)
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
    <div id={field.id} role="radiogroup" aria-label={component.label ?? undefined} {...field.aria}>
        {#each component.swatches as swatch (swatch)}
            <button
                type="button"
                role="radio"
                aria-checked={field.value === swatch}
                aria-label={swatch}
                disabled={field.disabled}
                onclick={() => field.setValue(swatch)}
                style:background-color={swatch}
                class="size-8 rounded-full"
            ></button>
        {/each}
    </div>
</FieldWrapper>
```

Put visible text through `useT()` / `t()`, and use logical classes (`ms-2`, `text-start`) so the component also works right to left.

## 5. Typed props from PHP

```bash
php artisan alfakit:types
```

This command scans `app/` (or `--path=`) for your fields, entries, layout components, columns and widgets. It reads the PHPDoc **array shape** on the methods that feed their schema and writes `resources/js/alfakit/types.d.ts` (or `--output=`):

| Class kind       | Shapes read                                              | Generated type                        |
| ---------------- | -------------------------------------------------------- | ------------------------------------- |
| `Field`          | `getSchemaProps()`                                       | `ColorWheelProps = FieldProps<{ … }>` |
| `Entry`          | `getSchemaProps()`                                       | `EntryProps<{ … }>`                   |
| layout component | `getSchemaProps()`                                       | `SchemaComponentProps<{ … }>`         |
| `Column`         | `getSchemaProps()` (`column`), `getCellProps()` (`cell`) | `ColumnProps<{ … }, { … }>`           |
| `Widget`         | `getViewData()` (props), `getSchemaProps()` (`widget`)   | `WidgetProps<{ … }, { … }>`           |

For each class it writes a `…Props` type (the component's props) and a `…Schema` type (the `component`, `column` or `widget` object). It also writes an `AlfakitComponents` map keyed by registry key. Supported PHPStan types are array shapes (`array{key: T, optional?: T}`), `list<T>`, `array<K, V>`, `T[]`, scalars, string and number literals, `?T` and unions. Anything else becomes `unknown`, and a method without a shape gives `Record<string, unknown>`. Subclasses that keep a built-in renderer, such as `StatusColumn extends IconColumn`, are skipped. PHPStan checks the shape against what the method returns, so the types stay honest. Re-run the command after you change one; adding it to `composer dev` or a pre-build script works well.

Each renderer also exports the helper types, so you can write types by hand: `FieldProps<T>`, `EntryProps<T>`, `SchemaComponentProps<T>`, `ColumnProps<TColumn, TCell>`, `WidgetProps<TProps, TWidget>`, `PageComponentProps<T>` and `BlockProps<TData>`. In Vue, give `defineProps` an object type (`defineProps<{ component: ColorWheelSchema }>()`), because Vue's compiler needs the top-level prop names.

## 6. Use your shadcn components

Components you installed with the shadcn CLI (`resources/js/components/ui/*`, `@/components/ui/…`) work directly in an AlfaKit component. They share the theme tokens. Import them as you would anywhere else in the app:

```tsx
import { Slider } from '@/components/ui/slider'
```

Tailwind must also scan them for the panel stylesheet. New installs include the line below in `resources/css/alfakit.css`; older apps add it themselves:

```css
@source '../js/components/ui';
```

To scaffold a field around one of them:

```bash
php artisan make:alfakit-field Volume --from-shadcn=slider
php artisan make:alfakit-field Birthday --from-shadcn=calendar
php artisan make:alfakit-field Pin --from-shadcn=input-otp
```

The generated component binds the shadcn component to the field state through `useField()`. React uses the component's value/change props, Vue uses `:model-value` and `@update:model-value`, and Svelte uses function bindings (`bind:value={() => field.value, (v) => field.setValue(v)}`). The PHP class gets a matching validation rule (`numeric`, `date`, `boolean`, `string`). Ready-made bindings exist for `input`, `textarea`, `switch`, `checkbox`, `slider`, `calendar` and `input-otp`. Any other name gets a generic binding with a comment pointing at what to finish. If the component isn't installed yet, the command warns you and prints the `shadcn add` command to run.

## SSR

Pass the same `discover` glob to `createAlfakitServer()`. Discovered pages count as registered, so they are server-rendered even without the panel's shared props. See [Server-side rendering](./ssr).
