# @alfakit/react

## 0.2.4

### Patch Changes

- A file that failed to upload no longer lets the form save without it: the field asks to remove it or upload it again.
- Back pressed twice quickly refreshes the page it lands on when records changed.

## 0.2.3

### Patch Changes

- Sub-navigation stacks above narrow content; layouts inside table records follow the record's width; the top bar never makes the page scroll sideways; code copy button no longer covers code; empty ColorPicker looks empty; starter-kit header and auth pages mirror in RTL.

## 0.2.2

### Patch Changes

- Starter kits mirror the whole page for right-to-left languages (`useAlfakitDirection()`); Arabic money no longer reordered; card grids follow the table's width; row actions and copy buttons no longer overlap long text.

## 0.2.0

### Minor Changes

- Panel layout stays mounted between pages (no sidebar flicker) and icons render instantly once loaded; CMS Site design and block styles; saving waits for uploads in progress; slider accessible name; starter-kit SSR hydration fixed; contrast of shortcut hints and inactive tabs; Kanban refused drops; friendly file type labels.

## 0.1.13

### Patch Changes

- Starter kit header components bring a toaster to the app's own pages, so push and PWA messages show there; AlfaKit pages keep a single toaster.

## 0.1.12

### Patch Changes

- Wizard submit actions run with the form's state; a second custom rich-editor block no longer replaces the first; extra item actions on browser-added repeater items; "+N" no longer overlaps stacked images; PWA and notification toasts in starter kits; infolist blocks follow their `columns()`.

## 0.1.11

### Patch Changes

- File downloads from actions and `Action::download()` links; MoneyInput keeps out-of-range amounts for validation; translated calendar month buttons; image cells named for screen readers; `StarterKitFullscreenLayout`; customizable dashboards on the kit's `/dashboard`; failed lazy widgets show Retry; standalone headings keep their width.

## 0.1.10

### Patch Changes

- Back after a save shows fresh data; `useAlfakitNavigation().userMenuItems` for starter kits; push toggle in `<AlfakitNotifications />`; rich editor keeps focus after a toolbar group pick; Callout/EmptyState/section footer actions run with the form's state; column manager Reset fix; `<AlfakitComponent>` deferred loading fix.

## 0.1.9

### Patch Changes

- Row action modals work on every list tab; starter kits: the debug panel, "G then D" to the app dashboard and badge contrast; two standalone forms on a page get their own field ids; an `<AlfakitComponent>` in a panel page posts to its own endpoint; tooltips keep the button's `data-slot`; navigation items keyed by URL; modal headers leave room for the close button.
- Updated dependencies
  - @alfakit/core@0.1.9

## 0.1.8

### Patch Changes

- `<AlfakitLanguageSwitcher />`: a drop-in header component for starter kits, so users can switch the panel's language from the app header. `LocaleOptions` is exported for custom switchers.
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
