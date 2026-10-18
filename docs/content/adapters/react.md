---
title: React adapter
description: Using @alfakit/react.
---

# React adapter

```bash
php artisan alfakit:install --adapter=react
```

`resources/js/alfakit/app.tsx`:

```tsx
import { createAlfakit } from '@alfakit/react'
import { MapPicker } from './components/map-picker'

void createAlfakit({
    components: { 'map-picker': MapPicker },
    pages: {},
    withApp: (app) => <MyProviders>{app}</MyProviders>,
})
```

## Hooks

| Hook                | Returns                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `usePanel()`        | The shared `alfakit` prop                                        |
| `usePageSchema()`   | The current `page` prop                                          |
| `useT()`            | Translator (`t('table.filters')`)                                |
| `useChoice()`       | Plural-aware lines (`choice('billing.items', count)`)            |
| `useLocalization()` | Current language, direction, currency, timezone, language list   |
| `useDirection()`    | `'ltr'` or `'rtl'`                                               |
| `useFormatter()`    | `Intl` formatting: `money()`, `number()`, `date()`, `relative()` |
| `useActionRunner()` | Trigger actions programmatically                                 |
| `useField(field)`   | `{ value, setValue, blur, error, id, disabled, readOnly, aria }` |
| `useFormStore()`    | The current `FormStore`                                          |
| `useStore(store)`   | Subscribe to any core store                                      |

## Components you can reuse

Everything is exported: `SchemaRenderer`, `FieldWrapper`, `ActionList`, `ActionButton`, `DataTable`, `WidgetGrid`, `PageShell`, `AppLayout`, `AuthLayout`, plus the shadcn primitives (`Button`, `Dialog`, `Sheet`, `Select`, `Command`, `Sidebar`, …) and `Icon` (Lucide by name).

## Writing a field

```tsx
import { FieldWrapper, useField, type BaseField } from '@alfakit/react'

export function MapPicker({ component }: { component: BaseField & { zoom?: number } }) {
    const { value, setValue, error, id, aria } = useField<{ lat: number; lng: number } | null>(
        component,
    )

    return (
        <FieldWrapper field={component} htmlFor={id} error={error}>
            <Map id={id} value={value} onChange={setValue} zoom={component.zoom} {...aria} />
        </FieldWrapper>
    )
}
```

Register it with `components: { 'map-picker': MapPicker }` and use `View::make('map-picker')` — or, to make it a real field with state and validation, create a PHP field class (`class MapPicker extends Field { protected ?string $type = 'map-picker'; }`) so the key is `map-picker` and the component receives `statePath`.

## SSR

The panel renders in the browser by default. For server-side rendering, add `resources/js/alfakit/ssr.tsx` with `createServer(createAlfakitServer({ components, pages }))` (`createAlfakitServer` comes from `@alfakit/react/server`) and build it with `vite build --ssr`; `createAlfakit()` then hydrates the server markup. See [Server-side rendering](../advanced/ssr), including `useHydrated()` for browser-only output.
