---
title: Accessibility
description: What the renderers do for keyboard and screen-reader users, and how it is tested.
---

# Accessibility

The three renderers produce the same accessible markup for every schema component. The rules below are enforced by automated checks (axe-core in jsdom and in a real browser) and by a manual review of the main flows; keep them when you eject or replace components.

## What you get

- **Landmarks.** The sidebar navigation is a `<nav aria-label="Sidebar">`, the page body is `<main>`, breadcrumbs and pagination are named `navigation` regions, and the auth and simple layouts render the page title as the level-1 heading.
- **Forms.** Every control is named by its `<label>`; hints, helper text and the validation error are linked with `aria-describedby`; `aria-required` and `aria-invalid` follow the schema and the server's errors, and errors are announced through `role="alert"`. Non-native selects and date pickers are `combobox` buttons that the field label names in all renderers.
- **Tables.** Sortable headers expose `aria-sort`, "select page" is indeterminate when only some rows are selected, row and bulk checkboxes have names, `ToggleColumn` and `CheckboxColumn` controls are named after their column, and the bulk bar announces the selection count.
- **Infolists.** Each entry is a `role="group"` named by its label, so a screen reader reads "Status, group, Published".
- **Actions and modals.** Action buttons carry their label (icon-only buttons through `aria-label`, new-tab links through screen-reader text), modals are dialogs with a title, trap focus and close on Escape, and confirmation dialogs name the record.
- **Colour.** The default `--success`, `--warning` and `--info` tokens reach 4.5:1 as text on the page and under their foregrounds in light and dark mode, badges included; see [Themes › Contrast](../design/themes#contrast) for the full list of checked pairs.
- **Direction.** Every layout works right to left (`dir="rtl"`) and arrow-key navigation follows the reading direction.

## Automated checks

`axe-core` runs the WCAG 2.1 A and AA rule set against the server-rendered fixtures (login, dashboard, resource list, create and edit pages, the kitchen sink of every field and entry) after hydration in each renderer, plus a standalone form:

```bash
pnpm --filter @alfakit/react test -- tests/axe.test.tsx
pnpm --filter @alfakit/vue test -- tests/axe.test.ts
pnpm --filter @alfakit/svelte test -- tests/axe.test.ts
```

One rule is skipped there: `color-contrast`, because jsdom has no layout engine. It is covered twice instead: the theme tokens of all built-in themes by `packages/core/tests/contrast.test.ts`, and the live pages by the Playwright suite (`e2e/tests/a11y.spec.ts`) which runs axe in Chrome with contrast enabled.

A failing test prints the rule, its impact, the offending nodes and their HTML. Fix the component; do not disable the rule.

## Manual review

Before a release, walk the main flows with a keyboard and a screen reader (VoiceOver or NVDA): sign in, open the sidebar groups, sort and select rows in a table, run a record action and confirm its modal, submit a form with errors, and switch the locale to a right-to-left language. Playwright's `page.locator('body').ariaSnapshot()` gives the same accessibility tree a screen reader sees and is a quick way to spot an unnamed control.
