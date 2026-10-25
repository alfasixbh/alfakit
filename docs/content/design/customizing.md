---
title: Customizing layouts and styles
description: Restyle one component, give a panel its own stylesheet, or replace the sidebar, top bar or whole layout.
---

# Customizing layouts and styles

This page is about admin panels. In a [starter kit](../getting-started/starter-kits) your app's layout and stylesheet (`resources/css/app.css`) are in charge: `extraAttributes()` and the other per-component classes work the same, while `->viteTheme()`, the CSS hooks of AlfaKit's chrome and the `panel:*`/`layout:*` registry keys don't apply. Outside panels, see [Customizing standalone components](../standalone/customizing).

Choose the level that fits the change:

| You want to…                             | Use                                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| Pick a complete design                   | [`->theme()`](themes)                                                                  |
| Change one aspect of it                  | [`->design()`, `->density()`, `->radius()`, `->font()`](design-options)                |
| Rebrand                                  | `->colors()`, `->brandName()`, `->brandLogo()`, `->darkModeBrandLogo()`, `->favicon()` |
| Add content somewhere                    | [Slots](slots)                                                                         |
| Style one component                      | `extraAttributes(['class' => '…'])` and friends                                        |
| Give one panel its own CSS               | `->viteTheme('resources/css/portal.css')`                                              |
| Replace the sidebar, top bar or a layout | The component registry                                                                 |
| Replace any field, column or widget      | [Custom components](../adapters/custom-components)                                     |

## Styling a single component

```php
Section::make('Billing')->extraAttributes(['class' => 'border-primary/40 bg-primary/5']);
TextInput::make('sku')->extraInputAttributes(['class' => 'font-mono uppercase']);
TextColumn::make('total')->extraCellAttributes(['class' => 'font-semibold']);
$table->recordClasses(fn (Order $record) => $record->isOverdue() ? 'bg-destructive/5' : null);
```

Tailwind generates these classes because the installer adds your PHP files to the stylesheet's sources:

```css
/* resources/css/alfakit.css */
@source '../../app/**/*.php';
```

Apps installed before this line existed should add it. Without it, classes used only in PHP are silently missing.

Theme rules for surfaces, inputs and buttons take precedence over utility classes. To override one of them on a single component, use Tailwind's important modifier (`!shadow-none`, `!rounded-none`).

## A stylesheet per panel

```php
$panel->id('portal')->viteTheme('resources/css/portal.css');
```

```css
/* resources/css/portal.css */
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@alfakit/react/styles.css'; /* or @alfakit/vue, @alfakit/svelte */

@source '../../node_modules/@alfakit/react/dist'; /* the same package as above */
@source '../js/alfakit';
@source '../../app/**/*.php';

:root {
    --background: oklch(0.985 0.01 180);
}
```

The panel writes `--radius`, `--alfakit-font` and the `->colors()` variables inline on `<html>`, so a stylesheet can't override them without `!important`; set those with `->radius()`, `->font()` and `->colors()` on the panel instead. Use your renderer's package in both lines (`@alfakit/vue/styles.css` and `node_modules/@alfakit/vue/dist` in a Vue app): another renderer's path fails the build with "Can't resolve '@alfakit/react/styles.css'". Add the file to Vite's `input` list. You can also scope CSS in a shared stylesheet with the `data-panel` attribute: `:root[data-panel='portal'] { … }`.

## Hooks for CSS

The layout exposes stable attributes for targeting:

| Selector                                                           | Element                                                               |
| ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `[data-slot='topbar']`                                             | The top bar                                                           |
| `[data-slot='content']`                                            | The main content area                                                 |
| `[data-slot='page-header']`                                        | The page title and actions                                            |
| `[data-surface]`                                                   | Sections, tables, wizards and contained tabs                          |
| `[data-sidebar='menu-button']`, `[data-slot='topnav-link']`        | Navigation items, with `data-active='true'` on the current one        |
| `[data-slot='input']`, `[data-slot='input-group']`, `[data-input]` | Inputs, inputs with prefixes or suffixes, and select or date triggers |
| `[data-slot='table-head']`, `[data-slot='table-row']`              | Table parts                                                           |
| `[data-slot='table-group']`, `[data-slot='table-summary']`         | Group heading rows and summary rows of grouped or summarised tables   |

### Every `data-slot` value

The lists below are generated from the renderers' source (`grep -rhoE 'data-slot="[a-z0-9-]+"' packages/*/src`). Values in the first two lists are emitted by React, Vue and Svelte alike, so a selector on them works whichever renderer you use.

**AlfaKit components** (target these with `[data-slot='…']`): `actions`, `badge`, `bottom-nav`, `bottom-nav-item`, `builder`, `builder-add`, `builder-preview`, `button-group`, `callout`, `callout-icon`, `chart-assistive-content`, `chart-canvas`, `chart-empty-state`, `chart-filters`, `chart-filters-apply`, `chart-filters-reset`, `chart-filters-trigger`, `checkbox-list-empty`, `code-editor`, `code-entry`, `code-entry-copy`, `color-copy`, `color-picker-alpha`, `column-manager`, `column-manager-apply`, `column-manager-reset`, `content`, `copy-button`, `create-another`, `debug-panel`, `debug-toggle`, `deferred-schema`, `deselect-all`, `dropdown-section`, `empty-state`, `entry`, `entry-content`, `entry-label`, `entry-value`, `field`, `field-affix-actions`, `field-content`, `field-content-slot`, `file-upload`, `filter-indicators`, `filters-apply`, `filters-remove-all`, `filters-reset`, `flex`, `flex-item`, `form-actions`, `form-block`, `fullscreen-exit`, `fused-group`, `fused-group-controls`, `global-search-actions`, `global-search-suffix`, `header-tooltip`, `icon`, `icon-column-icons`, `image`, `image-editor`, `image-editor-crop`, `image-remaining`, `impersonation-banner`, `infolist`, `input-group`, `input-prefix`, `input-prefix-icon`, `input-suffix`, `input-suffix-icon`, `item-actions`, `item-add-action`, `item-collapse-actions`, `lazy-placeholder`, `list-expand`, `list-tabs`, `modal-table-select`, `modal-table-select-description`, `modal-table-select-dialog`, `notifications-trigger`, `option-label`, `page-header`, `pagination-first`, `pagination-last`, `password-confirmation`, `query-builder-group`, `query-builder-rule`, `repeatable-entry-table`, `repeater-row`, `repeater-table`, `rich-editor-floating-toolbar`, `rich-editor-panel`, `rich-editor-suggestions`, `rich-editor-table-toolbar`, `rich-editor-text-colors`, `rich-editor-toolbar`, `schema`, `schema-actions`, `schema-container`, `schema-contract-mismatch`, `schema-item`, `section`, `section-footer`, `select-all`, `select-column-message`, `select-empty`, `select-loading`, `select-reorder-list`, `sign-in-link`, `slider`, `slider-fill`, `slider-range`, `standalone`, `stat-chart`, `stat-chart-area`, `stat-chart-line`, `stat-placeholder`, `sub-navigation`, `sub-navigation-layout`, `summary-icons`, `table-block`, `table-content`, `table-filters-layout`, `table-filters-sidebar`, `table-group`, `table-grouping-inline`, `table-loading-skeleton`, `table-record`, `table-summary`, `table-trigger`, `tenant-menu`, `tenant-menu-search`, `text-copy`, `toggle-buttons`, `topbar`, `topnav`, `topnav-group`, `topnav-layout`, `topnav-link`, `translatable-field`, `translatable-locales`, `unordered-list`, `virtual-spacer`, `widgets`, `wizard-submit`.

**shadcn primitives** (the same names shadcn/ui uses): `alert`, `alert-description`, `alert-title`, `avatar`, `avatar-fallback`, `avatar-image`, `breadcrumb`, `breadcrumb-item`, `breadcrumb-link`, `breadcrumb-list`, `breadcrumb-page`, `breadcrumb-separator`, `button`, `card`, `card-action`, `card-content`, `card-description`, `card-footer`, `card-header`, `card-title`, `checkbox`, `checkbox-indicator`, `collapsible`, `collapsible-content`, `collapsible-trigger`, `command`, `command-empty`, `command-group`, `command-input`, `command-input-wrapper`, `command-item`, `command-list`, `dialog-close`, `dialog-content`, `dialog-description`, `dialog-footer`, `dialog-header`, `dialog-overlay`, `dialog-title`, `dialog-trigger`, `dropdown-menu-checkbox-item`, `dropdown-menu-content`, `dropdown-menu-group`, `dropdown-menu-item`, `dropdown-menu-label`, `dropdown-menu-radio-group`, `dropdown-menu-radio-item`, `dropdown-menu-separator`, `dropdown-menu-shortcut`, `dropdown-menu-sub-content`, `dropdown-menu-sub-trigger`, `dropdown-menu-trigger`, `input`, `label`, `popover-content`, `popover-trigger`, `radio-group`, `radio-group-indicator`, `radio-group-item`, `scroll-area`, `scroll-area-viewport`, `select-content`, `select-group`, `select-item`, `select-trigger`, `select-value`, `separator`, `sheet-close`, `sheet-content`, `sheet-description`, `sheet-footer`, `sheet-header`, `sheet-title`, `sheet-trigger`, `sidebar`, `sidebar-container`, `sidebar-content`, `sidebar-footer`, `sidebar-gap`, `sidebar-group`, `sidebar-group-content`, `sidebar-group-label`, `sidebar-header`, `sidebar-inner`, `sidebar-inset`, `sidebar-menu`, `sidebar-menu-button`, `sidebar-menu-item`, `sidebar-menu-sub`, `sidebar-menu-sub-button`, `sidebar-menu-sub-item`, `sidebar-rail`, `sidebar-trigger`, `sidebar-wrapper`, `skeleton`, `switch`, `switch-thumb`, `table`, `table-body`, `table-cell`, `table-container`, `table-footer`, `table-head`, `table-header`, `table-row`, `tabs`, `tabs-content`, `tabs-list`, `tabs-trigger`, `textarea`, `tooltip-content`, `tooltip-trigger`.

**Only in some renderers** (implementation details of one framework's primitives; avoid them in shared CSS): `action-disabled-tooltip`, `alfakit-toast`, `breadcrumb-ellipsis`, `calendar`, `command-group-heading`, `command-separator`, `command-shortcut`, `dialog`, `dialog-portal`, `dropdown-menu`, `dropdown-menu-portal`, `dropdown-menu-sub`, `field-label`, `page-block`, `popover`, `popover-anchor`, `popover-close`, `query-builder-constraint-picker`, `query-builder-search`, `rich-editor`, `scroll-area-scrollbar`, `scroll-area-thumb`, `select`, `select-group-heading`, `select-label`, `select-scroll-down-button`, `select-scroll-up-button`, `select-separator`, `sheet`, `sheet-overlay`, `sheet-portal`, `sidebar-group-action`, `sidebar-input`, `sidebar-menu-action`, `sidebar-menu-badge`, `sidebar-menu-skeleton`, `sidebar-separator`, `slider-track`, `table-caption`, `tooltip`, `tooltip-provider`.

Other stable attributes: `data-surface` (`section`, `table`, `wizard`, contained tabs), `data-input` (select and date triggers styled like inputs), `data-sidebar` (shadcn sidebar parts such as `menu-button`, `group-label`, `rail`), `data-active='true'` on the current navigation item, `data-slot-name` on the wrapper of rendered [slot](slots) content, and on `<html>` `data-panel` (the panel id), `data-alfakit-gray` and the design attributes `data-alfakit-theme`, `data-layout`, `data-nav`, `data-header`, `data-surfaces`, `data-inputs`, `data-buttons`, `data-tables`, `data-mobile`, `data-density` and `data-sidebar-variant`. Icons drawn by `<Icon>` from a URL or SVG markup carry `data-slot='icon'`.

## Replacing the sidebar, top bar or a layout

Every structural piece is in the component registry. Register your own in the frontend entry:

```tsx
import { AppSidebar, Slot, createAlfakit } from '@alfakit/react'
import { MySidebar } from './components/my-sidebar'
import { MarketingLayout } from './layouts/marketing-layout'

void createAlfakit({
    components: {
        'panel:sidebar': MySidebar, // the sidebar in sidebar and rail layouts
        'panel:topbar': MyTopbar, // the top bar (receives { breadcrumbs })
        'panel:language-switcher': MyLanguageMenu, // the top bar language button (`languageSwitcher('topbar')`)
        'layout:app': MarketingLayout, // every signed-in page (receives { page, breadcrumbs, maxContentWidth, children })
        'layout:auth': MyAuthLayout, // sign-in, registration, password pages
        'layout:blank': MyBlankLayout,
    },
})
```

The built-in parts are exported (`AppSidebar`, `Topbar`, `Brand`, `UserMenu`, `GlobalSearch`, `NotificationsMenu`, `ThemeToggle`, `LocaleSwitcher`, `Breadcrumbs`, `Slot`, `AppLayout`, `TopNavLayout`, `AuthLayout`). Your replacement can compose them and add only what's different. The same keys work in `@alfakit/vue` and `@alfakit/svelte`.
