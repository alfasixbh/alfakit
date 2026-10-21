---
title: Vue adapter
description: Using @alfakit/vue.
---

# Vue adapter

```bash
php artisan alfakit:install --adapter=vue
```

`resources/js/alfakit/app.ts`:

```ts
import { createAlfakit } from '@alfakit/vue'
import MapPicker from './components/MapPicker.vue'

void createAlfakit({
    components: { 'map-picker': MapPicker },
    pages: {},
})
```

## Composables

Localization composables: `useChoice()` for plural lines, and `useLocalization()`, `useDirection()` and `useFormatter()`, which return computed refs. See [Localization](../localization/overview).

`usePanel()`, `usePageSchema()`, `useAlfakitProps()`, `useT()`, `useActionRunner()`, `useRegistry()`, `useStore(store)`, and inside forms `useFormStore()` / `useField(() => field)`. `useField()` accepts a value, ref or getter and returns computed `value`, `error`, `id`, `disabled`, `readOnly` and `aria` refs with `setValue()` and `blur()`. Bind `aria` (`aria-describedby`, `aria-invalid`, `aria-required`) on your control with `v-bind="aria"`.

## Writing a field

```vue
<script setup lang="ts">
import { FieldWrapper, useField, type BaseField } from '@alfakit/vue'

const props = defineProps<{ component: BaseField & { zoom?: number } }>()
const { value, setValue, error, id, aria } = useField<{ lat: number; lng: number } | null>(
    () => props.component,
)
</script>

<template>
    <FieldWrapper :field="component" :html-for="id" :error="error">
        <Map
            :id="id"
            :model-value="value"
            :zoom="component.zoom"
            v-bind="aria"
            @update:model-value="setValue"
        />
    </FieldWrapper>
</template>
```

Register it with `components: { 'map-picker': MapPicker }`.

The exported components mirror the React adapter: `SchemaRenderer`, `FieldWrapper`, `ActionList`, `DataTable`, `WidgetGrid`, `PageShell`, layouts and the shadcn-vue primitives.

## Icons

Icon names from PHP are resolved against `@lucide/vue` and each icon is loaded as its own lazy chunk, so any Lucide icon works without registration.

## Wrapping the app

`createAlfakit({ withApp })` receives the Vue `App` instance. Use it to install plugins before the app mounts:

```ts
void createAlfakit({
    withApp: (app) => {
        app.use(i18n)
    },
})
```

## SSR

The panel renders in the browser by default. For server-side rendering, add `resources/js/alfakit/ssr.ts` with `createServer(createAlfakitServer({ components, pages }))` (`createServer` from `@inertiajs/vue3/server`, `createAlfakitServer` from `@alfakit/vue/server`) and build it with `vite build --ssr`; `createAlfakit()` then hydrates the server markup. The `withApp` option runs for server renders too. See [Server-side rendering](../advanced/ssr), including `useHydrated()` for browser-only output.
