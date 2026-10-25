# @alfakit/vue

## 0.1.9

### Patch Changes

- Row action modals work on every list tab; starter kits: the debug panel, "G then D" to the app dashboard and badge contrast; two standalone forms on a page get their own field ids; an `<AlfakitComponent>` in a panel page posts to its own endpoint; tooltips keep the button's `data-slot`; navigation items keyed by URL; modal headers leave room for the close button.
- Updated dependencies
  - @alfakit/core@0.1.9

## 0.1.8

### Patch Changes

- `<AlfakitLanguageSwitcher />`: a drop-in header component for starter kits, so users can switch the panel's language from the app header. The first click right after a switch no longer gets lost.
- Updated dependencies
  - @alfakit/core@0.1.8

## 0.1.7

### Patch Changes

- Released with AlfaKit 0.1.7 to keep the npm and PHP versions the same (no frontend changes).
- Updated dependencies
  - @alfakit/core@0.1.7

## 0.1.6

### Patch Changes

- Released with AlfaKit 0.1.6 (the npm and PHP versions now match). Fixes from the full verification in React, Vue and Svelte: starter-kit copilot, dashboard widgets and discovered components, per-item form errors, stable template schemas in new blocks, CSP nonces, WCAG AA badge contrast, plural kanban counts and more (see the AlfaKit changelog for 0.1.6).
- Updated dependencies
  - @alfakit/core@0.1.6

## 0.1.2

### Patch Changes

- Fixes from end-to-end QA in React, Vue and Svelte: modal field ids, errors in hidden tabs, per-row action spinners, one-time-code paste, RTL fixes (colours, key bindings, calendar), localised file sizes and named upload buttons, select placeholders, single toasts in starter kits, readable tab query values, enum group titles, tenant menu labels, Svelte hydration gate, plugin styles in starter-kit mode, and more (see the AlfaKit changelog for 0.1.2).
- Updated dependencies
  - @alfakit/core@0.1.2

## 0.1.1

### Patch Changes

- Vue: icons and lazily loaded components no longer cause hydration mismatches when another app on the page already loaded them. Package READMEs show the Alfa Six logo on npm.
- Updated dependencies
  - @alfakit/core@0.1.1
