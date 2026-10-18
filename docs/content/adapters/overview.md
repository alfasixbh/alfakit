---
title: Frontend adapters
description: How renderers work and what they share.
---

# Frontend adapters

AlfaKit ships one renderer per framework, all built on the same `@alfakit/core` package:

| Package           | Framework | UI kit                  |
| ----------------- | --------- | ----------------------- |
| `@alfakit/react`  | React 19  | shadcn/ui (Radix)       |
| `@alfakit/vue`    | Vue 3.5   | shadcn-vue (Reka UI)    |
| `@alfakit/svelte` | Svelte 5  | shadcn-svelte (Bits UI) |

Each adapter exports `createAlfakit()`, which boots an Inertia app dedicated to the panel:

```ts
import { createAlfakit } from '@alfakit/react'

createAlfakit({
    components: { 'map-picker': MapPicker }, // schema View components, widgets, toasts
    pages: { 'Pages/Reports': Reports }, // custom Inertia pages (Page::$component)
    progress: { color: 'var(--primary)' }, // Inertia progress bar, or false
})
```

## What the adapter does

- Resolves the `Alfakit/Page` Inertia component and your custom pages.
- Provides the **registry** that maps schema types to components; override any built-in (`components: { TextInput: MyTextInput }`).
- Keeps form state in `FormStore`, table selection in `TableSelection`, modals in `ActionRunner`, database notifications in `NotificationCenter` (all from `@alfakit/core`).
- Talks to the internal endpoints listed in the shared `alfakit.endpoints` prop.
- Applies appearance (light/dark/system), panel colours and fonts.

## Shared props

Every panel page receives `alfakit` (panel, navigation, user, tenant, endpoints, translations…) and `page` (layout, title, breadcrumbs, header actions, content blocks, context token). The TypeScript types live in `@alfakit/core`: `PanelSchema`, `PageSchema`, `SchemaComponent`, `TableSchema`, `ActionSchema`, …

## Styles

Your `resources/css/alfakit.css` imports Tailwind and the adapter stylesheet:

```css
@import 'tailwindcss';
@import '@alfakit/react/styles.css';
@source '../../node_modules/@alfakit/react/dist';
```

The stylesheet defines the shadcn tokens plus `--success`, `--warning` and `--info`, and force-generates the grid classes renderers compose at runtime. See [Theming](theming).
