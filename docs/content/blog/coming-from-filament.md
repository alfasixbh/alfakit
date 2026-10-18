---
title: "Coming from Filament: what's the same and what's different"
description: AlfaKit's PHP API mirrors Filament's, so most of what you know carries over. Here is what stays the same, what changes because of Inertia, and how the migration command converts an existing app.
date: '2026-10-12'
author: Alfa Six
cover: /screenshots/theme-filament-light.webp
coverAlt: The AlfaKit demo products list with the Filament-style theme.
---

AlfaKit's PHP API is inspired by [Filament](https://filamentphp.com) and deliberately mirrors it. If you have built a Filament panel, you already know how to build an AlfaKit one, and that is thanks to Dan Harrin, the Filament team and its contributors, who showed how good a Laravel admin panel builder can be. The differences come from the architecture: AlfaKit renders through Inertia and React, Vue or Svelte instead of Blade, Livewire and Alpine.

This post summarises the [Coming from Filament](/docs/getting-started/filament-comparison) page and the [migration guide](/docs/getting-started/migrating-from-filament).

## What stays the same

- The building blocks: `Panel`, `PanelProvider`, `Resource`, `Page`, `Widget` and `RelationManager`, with the static properties you know (`$model`, `$navigationIcon`, `$navigationGroup`, …).
- Schema components such as `TextInput`, `Select`, `Repeater`, `Section`, `Tabs` and `Wizard`, with the same fluent methods: `required()`, `live()`, `afterStateUpdated()`, `relationship()`, `columnSpanFull()`.
- Tables with `columns()`, `filters()`, `recordActions()`, `bulkActions()` and `defaultSort()`, plus summaries, grouping, the query builder filter and column layouts.
- Actions with `form()`, `requiresConfirmation()`, modals, wizards and the prebuilt create, edit, delete, restore, replicate, attach and detach actions; imports and exports with importers and exporters.
- Closure injection of `$record`, `$state`, `$get`, `$set`, `$operation` and type-hinted dependencies.
- `Notification::make()->title()->success()->send()`, clusters, sub-navigation, multi-factor authentication and tenancy options.
- Test helpers with the same names, called through `alfakit()->testPage()` instead of Livewire.

## What is different

- **Rendering.** Pages are Inertia pages rendered by `@alfakit/react`, `@alfakit/vue` or `@alfakit/svelte`. Custom views are frontend components registered with the renderer instead of Blade views.
- **Reactivity.** A `live()` field posts the form state to a refresh endpoint that re-evaluates the schema on the server; the response contains only the components that changed.
- **Interactions.** Sorting, searching and paging a table are Inertia partial reloads that return JSON for the table alone. In our [benchmark](/docs/getting-started/performance) against Filament v5.10, a sort returned 25 KB from AlfaKit and 789 KB from Filament, and a `live()` update on a form with a 100-item repeater returned 0.3 KB and 1.80 MB. One machine (Apple M5, PHP 8.4 with OPcache, SQLite), medians of 20 runs, Filament v5.10 with `filament:optimize`, AlfaKit with SSR off; results vary with hardware, configuration and data, and the methodology and raw results are in the repository.
- **Icons and colours.** Lucide icon names (`'users'`) instead of Heroicons, and semantic colour tokens mapped to shadcn CSS variables instead of Tailwind palettes.
- **Render hooks** become [slots](/docs/design/slots), which take HTML, Blade views or schema components.
- **Built in** where Filament relies on plugins: impersonation, translatable fields and a Filament-style theme among six themes.

Not available in the first release: global search in custom pages and the Spatie plugin ecosystem. The [plugin API](/docs/panels/plugins) lets you build what you need.

## Migrating an existing app

One command converts a Filament v3, v4 or v5 application:

```bash
composer require alfasix/alfakit

# Preview: prints every change and writes alfakit-migration-report.md
php artisan alfakit:migrate-from-filament --dry-run

# Migrate
php artisan alfakit:migrate-from-filament --adapter=react
```

It rewrites class names and imports, moves `app/Filament` to `app/Alfakit`, converts the panel provider and configuration, maps Heroicons to Lucide names, removes Livewire plumbing from custom pages and sets up the frontend for your renderer. It needs a clean git working tree, so the migration is one reviewable diff.

What cannot convert mechanically, mostly Blade views, Livewire components and Alpine code, ends up in `alfakit-migration-report.md` as `file:line — what — suggested change`, grouped by kind, with the AlfaKit feature that replaces each plugin you used.

Read the full [migration guide](/docs/getting-started/migrating-from-filament) before you run it, and try the [demo](/demo) to see a panel built this way, including the `filament` theme.
