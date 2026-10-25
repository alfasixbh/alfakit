---
title: Design options
description: Layout, navigation, page headers, surfaces, inputs, buttons, tables, the mobile preset, density, radius and fonts.
---

# Design options

Every theme is a combination of the options below. Override any of them on a panel, or combine them into [your own theme](themes#your-own-theme).

Like themes, these options apply to admin panels only; a starter kit panel and components outside panels follow your app's own styles (see [Themes](themes)).

```php
$panel->design(
    layout: 'rail',        // sidebar | topbar | rail
    nav: 'bar',            // soft | pill | bar | underline
    header: 'banner',      // plain | banner | band | compact
    surfaces: 'elevated',  // bordered | elevated | flat | ring
    inputs: 'filled',      // outline | filled | underline
    buttons: 'pill',       // rounded | pill | square
    tables: 'striped',     // lined | striped | minimal
    mobile: 'bottom',      // drawer | bottom
);
```

Each value is also an enum (`Layout::Rail`, `NavStyle::Bar`, `MobileNavigation::Bottom`, …) in `AlfaSix\Alfakit\Theming`. An invalid value throws an exception that lists the valid ones. Every dimension also accepts a closure with `$user`, `$page`, `$tenant`, `$route` and `$request` injectable, resolved once per request: see [Per-role and per-page design](per-role-design).

## Layout

| Value     | Result                                                                                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sidebar` | Navigation in a collapsible sidebar. Choose its style with `sidebarVariant()`: `inset` (content in a rounded card), `floating` (sidebar as a floating card) or `flush` (full height with a border). |
| `topbar`  | No sidebar. Navigation runs across the top: ungrouped items are links, and groups open as dropdowns. Phones get a slide-out menu. `->topNavigation()` is a shortcut.                                |
| `rail`    | A slim column of icons with tooltips that expands on demand. The user's choice is remembered.                                                                                                       |

## Navigation items

| Value       | Result                                                                 |
| ----------- | ---------------------------------------------------------------------- |
| `soft`      | A light background on the active item.                                 |
| `pill`      | Fully rounded items; the active one is tinted with the primary colour. |
| `bar`       | An accent bar on the reading-start edge marks the active item.         |
| `underline` | Underlined tabs, made for the top navigation.                          |

## Page header

| Value     | Result                                            |
| --------- | ------------------------------------------------- |
| `plain`   | Title and actions on the page background.         |
| `banner`  | A tinted hero card behind the title.              |
| `band`    | A full-width strip across the top of the content. |
| `compact` | A small title for dense screens.                  |

## Surfaces, inputs, buttons and tables

| Option                                        | Values                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `surfaces` (cards, sections, tables, wizards) | `bordered` · `elevated` (shadow, no border) · `flat` (tinted, no border) · `ring` (hairline ring and small shadow) |
| `inputs` (text, selects, dates, textareas)    | `outline` · `filled` (tinted until focused) · `underline` (bottom border only)                                     |
| `buttons`                                     | `rounded` (theme radius) · `pill` · `square`                                                                       |
| `tables`                                      | `lined` · `striped` · `minimal` (no row dividers)                                                                  |

## Mobile preset

Below the `md` breakpoint (phones) every panel opens its navigation in a drawer and keeps tables, modals and forms as they are. The `mobile` option switches to a layout made for thumbs:

```php
$panel->mobile();                         // same as ->design(mobile: 'bottom')
$panel->mobile(false);                    // back to the drawer
Theme::make('pocket')->extends('alfakit')->mobile(MobileNavigation::Bottom);
```

| Value    | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drawer` | The default. The sidebar (or top navigation) slides in from the reading-start edge.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `bottom` | A **bottom navigation bar** with the first top-level items (four slots; the rest open in a "More" sheet). **Tables render as stacked cards**: a table without a [content layout](../tables/layout) gets a `Stack` of its visible columns, one with a layout keeps it, and the sort menu stays in the toolbar. **Modals slide over** from the reading-end edge instead of popping up in the middle. **Primary controls get 44px touch targets** (form, page and table buttons, inputs and selects). **Form actions stick** to the bottom of the screen, above the bar. Desktop markup and server rendering are unchanged; the bar is `md:hidden` and the card layout applies in the browser once it knows the viewport. |

The bar is a renderer component: replace it everywhere with `createAlfakit({ components: { 'panel:bottom-nav': MyBar } })`, or restyle it through `[data-slot='bottom-nav']` and `[data-slot='bottom-nav-item']` (`data-active="true"` on the current item). Sticky form actions use `[data-slot='form-actions']`. `--alfakit-bottom-nav-height` (3.75rem) sizes the bar and the room kept for it; safe-area insets are added automatically.

## Density, radius and fonts

```php
use AlfaSix\Alfakit\Theming\FontProvider;

$panel
    ->density('compact')                       // comfortable | compact
    ->radius('0.5rem')                         // any CSS length; 0 for sharp corners
    ->font('Inter')                            // body text, from Bunny Fonts
    ->font('Inter', FontProvider::Google)      // from Google Fonts
    ->font('Brand Sans', FontProvider::None)   // self-hosted: load it in your CSS
    ->font('Inter', url: asset('fonts/inter.css')) // your own stylesheet with @font-face rules
    ->font('system-ui')                        // the operating system's font
    ->headingFont('Fraunces');                 // page titles and section headings
```

`preload:` lists font files to fetch right away with `<link rel="preload" as="font">`, so text doesn't flash in a fallback font: `->font('Inter', url: asset('fonts/inter.css'), preload: [asset('fonts/inter-latin.woff2')])` (`headingFont()` takes it too; only http(s) and relative URLs are kept).

`url:` (Filament's `LocalFontProvider`) links your own stylesheet instead of a font service; it must be an absolute or root-relative URL, and can be a closure. `headingFont()` takes `url:` too. `FontProvider::Local` without a URL loads nothing.

## In CSS

Everything above is reflected on the `<html>` element, so your CSS can react to it:

```html
<html
    data-panel="admin"
    data-alfakit-theme="alfakit"
    data-layout="sidebar"
    data-nav="pill"
    data-header="banner"
    data-surfaces="elevated"
    data-inputs="filled"
    data-buttons="pill"
    data-tables="minimal"
    data-mobile="bottom"
    data-density="comfortable"
    data-sidebar-variant="floating"
></html>
```

```css
:root[data-panel='portal'] [data-slot='topbar'] {
    background: var(--primary);
}
:root[data-layout='topbar'] [data-slot='content'] {
    max-width: 90rem;
}
```
