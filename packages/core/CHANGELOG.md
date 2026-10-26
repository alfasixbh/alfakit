# @alfakit/core

## 0.1.12

### Patch Changes

- Starter kit sidebar items keyed by URL (language and tenant switches no longer leave links pointing at the old page or tenant); upload previews kept after a round trip; chart registries shared by a second copy of core under `npm run dev`; conflict banner finds forms inside relation-manager tabs; presence joins an already-subscribed channel; saved views and column changes count as mutations for Back; starter kit toasts reach the kit's toaster.

## 0.1.11

### Patch Changes

- A page restored by Back after a save is loaded fresh, so forms show the saved values. Actions that return a file download it (`startDownload()`); pages restored by Back after a save reload; lazy widgets that fail show a retry; toasts and the inspector follow the host page's side in right-to-left starter kits (`overlayPlacementDirection()`); icon replacements apply during server rendering; dark-mode danger text in starter kits.

## 0.1.10

### Patch Changes

- Pages restored by the browser's Back button reload when records changed since they were shown (and starter kits drop prefetched pages after a save); list-tab state on cell edits, reordering, wizard steps and field actions; single-use undo tokens; multi-key shortcut recording; starter-kit user menu links and Web Push toggle; translatable `live()` fields; deferred tables outside panels; mobile slide-over translate fix.

## 0.1.9

### Patch Changes

- Row actions' modal requests send the table state, so modals work on any list tab; `standalone.css` status colours pass WCAG AA; standalone components get their own action runner and form id prefix.

## 0.1.8

### Patch Changes

- The starter kit header components' panel data is cached per language, so after a language switch they show the new language (used by `<AlfakitLanguageSwitcher />`).

## 0.1.7

### Patch Changes

- Released with AlfaKit 0.1.7 to keep the npm and PHP versions the same (no frontend changes).

## 0.1.6

### Patch Changes

- Released with AlfaKit 0.1.6 (the npm and PHP versions now match). Fixes from the full verification in React, Vue and Svelte: starter-kit copilot, dashboard widgets and discovered components, per-item form errors, stable template schemas in new blocks, CSP nonces, WCAG AA badge contrast, plural kanban counts and more (see the AlfaKit changelog for 0.1.6).

## 0.1.2

### Patch Changes

- Fixes from end-to-end QA in React, Vue and Svelte: modal field ids, errors in hidden tabs, per-row action spinners, one-time-code paste, RTL fixes (colours, key bindings, calendar), localised file sizes and named upload buttons, select placeholders, single toasts in starter kits, readable tab query values, enum group titles, tenant menu labels, Svelte hydration gate, plugin styles in starter-kit mode, and more (see the AlfaKit changelog for 0.1.2).

## 0.1.1

### Patch Changes

- Vue: icons and lazily loaded components no longer cause hydration mismatches when another app on the page already loaded them. Package READMEs show the Alfa Six logo on npm.
