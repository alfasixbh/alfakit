---
title: Right-to-left languages
description: How AlfaKit renders Arabic, Hebrew, Persian, Urdu and other right-to-left languages, and how to keep custom components direction-aware.
---

# Right-to-left languages

When the current language is written right to left, the whole panel mirrors. You don't configure anything for this:

- `<html dir="rtl" lang="…">` is set on the first load and updated after every navigation, including a language switch.
- Inside a [starter kit](../getting-started/starter-kits) the document belongs to your app: AlfaKit never sets `<html dir>` there. Its content area (`data-slot="starter-kit-root"`), its modals, slide-overs, menus and toasts, the header components and the widgets on your `/dashboard` mirror; the kit's own sidebar, header and pages keep their direction.
- The sidebar docks on the right, menus open towards the reading start, and arrows such as pagination, breadcrumbs and submenus point the right way.
- Radix (React) and Reka UI (Vue) primitives receive the direction, so keyboard navigation in menus, selects and tabs follows it. Bits UI (Svelte) supports this for menus and scroll areas. Its selects, tabs and calendar mirror visually, but their left and right arrow keys are not flipped yet.
- Tables, forms, the date picker, charts (reversed x axis, legends and tooltips) and toasts mirror as well.

## How the direction is detected

`TextDirection::detect()` works for any locale code, not a fixed list:

1. A script subtag decides first. `pa_Arab` (Punjabi in Arabic script) is right to left, and `sr_Latn` is left to right.
2. Languages whose main script is right to left are RTL: Arabic, Hebrew, Persian, Urdu, Pashto, Sindhi, Kurdish (Sorani), Dhivehi, Uyghur, Yiddish and others.
3. Otherwise the ICU data in PHP's intl extension decides.

Override it per locale if you ever need to: `Locale::make('xx')->direction(TextDirection::Rtl)`.

## Mixed-direction content

Real data mixes scripts: an English product name in an Arabic table, or an Arabic customer name in an English one. AlfaKit handles the common cases:

- **Display values** in table cells and infolist entries are wrapped in `<bdi>`. The browser isolates each value's direction without changing the column's alignment.
- **Text inputs, textareas, tags and key-value fields** use `dir="auto"`, so each one follows what is typed.
- **Emails, URLs, phone numbers, passwords and numbers** always stay left to right, because that is how they are read in every language.
- **Rich text** paragraphs pick their own direction.

## Writing direction-aware components

Custom components should use Tailwind's logical utilities instead of left/right ones. They flip automatically:

| Instead of                      | Use                             |
| ------------------------------- | ------------------------------- |
| `ml-2` / `mr-2`                 | `ms-2` / `me-2`                 |
| `pl-4` / `pr-4`                 | `ps-4` / `pe-4`                 |
| `left-0` / `right-0`            | `start-0` / `end-0`             |
| `border-l` / `border-r`         | `border-s` / `border-e`         |
| `rounded-l-md` / `rounded-r-md` | `rounded-s-md` / `rounded-e-md` |
| `text-left` / `text-right`      | `text-start` / `text-end`       |

For anything that must flip visually, such as an arrow icon, use the `rtl:` variant: `<ChevronRight className="rtl:rotate-180" />`.

When you need the direction in code, every adapter exposes it:

```tsx
const direction = useDirection() // 'ltr' | 'rtl'
```

Flexbox and grid layouts already follow the document direction, so `flex`, `justify-start` and `gap-*` need no changes.

Keyboard navigation follows the direction too: in date pickers, tabs and reorderable tags the left and right arrows move towards the start and end of the line, not the screen edge. For your own horizontal keyboard handling, `logicalArrowKey(event.key, direction)` from `@alfakit/core` swaps `ArrowLeft` and `ArrowRight` in right-to-left layouts, and `reorderOffset(event, 'horizontal', direction)` reads Alt + arrow as a move of -1 or 1.

## Fonts

Many Latin fonts have no Arabic, Hebrew or Persian glyphs, so the browser falls back to a system font. For a consistent look, load a font that covers the scripts you support and list it in your panel's font stack. For example, use Noto Sans Arabic, IBM Plex Sans Arabic or Vazirmatn for Arabic and Persian, and Noto Sans Hebrew or Heebo for Hebrew:

Load it at the very top of your stylesheet: an `@import url(…)` must precede every other rule, and below `@import 'tailwindcss'` the build warns and drops it. In a [starter kit](../getting-started/starter-kits) or [outside panels](../standalone/overview), AlfaKit uses your app's fonts, so add it to `resources/css/app.css` and extend `--font-sans`:

```css
/* resources/css/app.css: first line */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600&display=swap');

/* at the end */
:root {
    --font-sans: 'Instrument Sans', 'Noto Sans Arabic', ui-sans-serif, system-ui, sans-serif;
}
```

In an admin panel the font comes from the theme: every theme writes `--alfakit-font` (the `->font()` family) inline on `<html>`, and the panel's text uses that variable, so `--font-sans` has no effect there. Override the variable in `resources/css/alfakit.css`; `!important` is needed to win over the inline value:

```css
/* resources/css/alfakit.css: first line */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600&display=swap');

/* at the end */
:root {
    --alfakit-font: 'Instrument Sans', 'Noto Sans Arabic' !important;
}
```

Use the family your theme or `->font()` sets in place of `'Instrument Sans'` (neutral's font; alfakit and filament use Inter, soft Nunito, corporate IBM Plex Sans, minimal `system-ui`): the override replaces the theme's font.

The browser picks the Arabic font only for Arabic characters, so Latin text keeps your main font.
