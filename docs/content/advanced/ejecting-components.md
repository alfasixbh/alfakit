---
title: Ejecting components
description: Copy a built-in React, Vue or Svelte component into your app with php artisan alfakit:eject, change it freely and keep updating the package.
---

# Ejecting components

Registering a component under a built-in key replaces the renderer's own (see [Custom components](/docs/adapters/custom-components)). When you want to start from the built-in implementation rather than from scratch, eject it:

```bash
php artisan alfakit:eject TextInput            # a field, layout component or infolist entry
php artisan alfakit:eject column:TextColumn    # the table cell renderer
php artisan alfakit:eject widget:Chart         # Chart, StatsOverviewWidget, TableWidget
php artisan alfakit:eject layout:app           # layout:app, layout:auth, layout:blank
php artisan alfakit:eject panel:sidebar        # panel:sidebar, panel:topbar, panel:sub-navigation, panel:impersonation-banner, panel:debug-panel, panel:language-switcher
```

The command:

1. Detects the adapter from `package.json` (`@alfakit/react`, `vue` or `svelte`; `--adapter=` overrides it) and reads `node_modules/@alfakit/<adapter>/dist/eject-manifest.json`, a file written when the package is built that maps every registry key to its source file and lists which source exports are public.
2. Copies the component's source (the packages ship their `src/`) to `resources/js/alfakit/components/`, keeping its file name: `text-input.tsx`, `TextInputField.vue`, `TextInputField.svelte`.
3. Rewrites the copy's relative imports. Everything the package exports — hooks such as `useField()` and `useT()`, `cn()`, the shadcn primitives, `FieldWrapper`, `Icon` — is imported from `@alfakit/<adapter>` instead, so the copy follows package updates for everything you did not change. The few private helpers a component needs (a mask utility, a lazy loader, a stylesheet) are copied next to it under `resources/js/alfakit/components/_alfakit/`, keeping their place in the source tree.
4. Registers the copy in `resources/js/alfakit/app.*` and, when present, `resources/js/alfakit/ssr.*`:

```tsx
import { TextInputField } from './components/text-input'

void createAlfakit({
    components: {
        TextInput: TextInputField,
    },
})
```

Rebuild the frontend and the panel renders your copy. The command is idempotent: running it again leaves your edited copy alone and only adds missing registrations; `--force` overwrites the files.

## Notes

- `column:<Type>` keys share one cell renderer (`TableCellContent`), which switches on the column type. Eject it once and register it for each column type you want to change; the other types keep working because the switch is in the copy.
- An ejected `TextInput` imports `@alfakit/core`, `react` (or `vue`, `svelte`) and `lucide-react` (`@lucide/vue`, `@lucide/svelte`) directly. With npm and Yarn these are hoisted from `@alfakit/<adapter>`; with pnpm's strict layout add them to your own `package.json`. The command ends with a warning that names the packages the copy imports but `package.json` does not list, with the `pnpm add` / `npm install` line to run.
- The copy depends on the package's public API, which follows semantic versioning, not on its internals: a package update never changes files under `resources/js/alfakit/components/`. Re-eject with `--force` to pick up upstream changes to the component itself (your edits are lost; keep them in version control).
- Props and the schema contract stay the same, so the PHP side needs no change. The panel's [theme CSS](/docs/design/themes) keeps applying as long as the copy keeps the `data-slot` attributes.
