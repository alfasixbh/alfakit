---
title: Svelte adapter
description: Using @alfakit/svelte.
---

# Svelte adapter

```bash
php artisan alfakit:install --adapter=svelte
```

`resources/js/alfakit/app.ts`:

```ts
import { createAlfakit } from '@alfakit/svelte'
import MapPicker from './components/MapPicker.svelte'

void createAlfakit({
    components: { 'map-picker': MapPicker },
    pages: {},
})
```

## Context helpers

Localization helpers: `useChoice()` for plural lines, `useLocalization()` and `useDirection()` (plain values), and `useFormatter()`, which returns `{ current }` because the formatter is rebuilt when the language, currency or timezone changes. See [Localization](../localization/overview).

`usePanel()`, `usePageSchema()`, `useAlfakitProps()`, `useT()`, `useActionRunner()`, `useRegistry()`, `useStore(store)` and, inside forms, `useFormStore()` / `useField(() => field)`.

`useStore()` returns a rune-backed object: read the latest snapshot from `.current`. `useField()` returns getters for `value`, `error`, `id`, `disabled`, `readOnly` and `aria` (spread `{...field.aria}` on your control for `aria-describedby`, `aria-invalid` and `aria-required`), plus `setValue()` and `blur()`. Pass the field as a getter so the binding follows the new schema after a server refresh.

## Writing a field

```svelte
<script lang="ts">
    import { FieldWrapper, useField, type BaseField } from '@alfakit/svelte'

    let { component }: { component: BaseField & { zoom?: number } } = $props()
    const field = useField(() => component)
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
    <Map
        id={field.id}
        value={field.value}
        zoom={component.zoom}
        onchange={field.setValue}
        {...field.aria}
    />
</FieldWrapper>
```

Register it with `components: { 'map-picker': MapPicker }`.

The exported components mirror the React adapter: `SchemaRenderer`, `FieldWrapper`, `ActionList`, `DataTable`, `WidgetGrid`, `PageShell`, layouts and the shadcn-svelte primitives.

## Icons

Icons resolve by name like in the React and Vue adapters: every Lucide icon, including the older aliases (`->icon('trash-2')`, `home`), is available and loads on demand as its own small chunk, so the main bundle carries none of them. `loadIcon(name)` preloads one, `resolveIcon(name)` returns it once loaded, and `hasIcon()` / `iconNames()` list what is known. Register custom (non-Lucide) icons once in your entry file:

```ts
import { registerIcons } from '@alfakit/svelte'
import Rocket from '@lucide/svelte/icons/rocket'

registerIcons({ rocket: Rocket })
```

An unknown name renders the `fallback` icon if one is given, otherwise nothing. The server render leaves icons out until they load in the browser, as `lucide-react/dynamic` does.

## Wrapping the app

`createAlfakit({ withApp })` receives the Svelte context map instead of a React element. Add entries to it to provide your own context to every page:

```ts
void createAlfakit({
    withApp: (context) => {
        context.set('analytics', analytics)
    },
})
```

## SSR

The panel renders in the browser by default. For server-side rendering, add `resources/js/alfakit/ssr.ts` with `createServer(createAlfakitServer({ components, pages }))` (`createServer` from `@inertiajs/svelte/server`, `createAlfakitServer` from `@alfakit/svelte/server`) and build it with `vite build --ssr`; `createAlfakit()` then hydrates the server markup. The `withApp` option runs for server renders too. See [Server-side rendering](../advanced/ssr), including `useHydrated()` for browser-only output.
