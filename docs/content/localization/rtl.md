---
title: Right-to-left languages
description: How AlfaKit renders Arabic, Hebrew, Persian, Urdu and other right-to-left languages, and how to keep custom components direction-aware.
---

# Right-to-left languages

When the current language is written right to left, the whole panel mirrors. You don't configure anything for this:

- `<html dir="rtl" lang="…">` is set on the first load and updated after every navigation, including a language switch.
- Inside a [starter kit](../getting-started/starter-kits) the whole page mirrors while the user has picked a right-to-left language for the panel: AlfaKit's pages and your app's own pages, the kit's sidebar and header included. See [Starter kits](#starter-kits) below.
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

- **Display values** in table cells, infolist entries and stats are wrapped in `<bdi>`. The browser isolates each value's direction without changing the column's alignment. A value with no right-to-left letters, such as Arabic-locale money (`‏0.00 US$`) or a number, is isolated left to right. Otherwise the invisible right-to-left mark at its start would reorder it into `$US 0.00`. Values with right-to-left letters (`٠٫٠٠٠ د.ب.‏`, Arabic text) keep their own direction. `isolationDirection(value)` from `@alfakit/core` gives the same `dir` for your own `<bdi>`.
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

## Starter kits

In a [starter kit](../getting-started/starter-kits) app the user picks the language with `<AlfakitLanguageSwitcher />` in your header. While that language is right to left, the whole page mirrors. This covers AlfaKit's pages and your own (dashboard, settings), including the kit's sidebar and header:

- AlfaKit shares `alfakitDocument` (`{ tag, direction }`) with every Inertia page, guests' included. The renderer puts it on `<html lang dir>` on the first load and after every visit and language switch. `direction` is the panel language's. `lang` is the page's own language: the panel's on AlfaKit pages and your app's on your pages, so screen readers still read your English pages as English.
- `php artisan alfakit:install --starter-kit` adds `dir="{{ \AlfaSix\Alfakit\Support\StarterKitDocument::direction() }}"` to the `<html>` tag of `resources/views/app.blade.php`. The first paint and server rendering are then already mirrored.
- It docks the kit's sidebar on the end of the line. shadcn's `<Sidebar side>` is physical, so the installer sets it from `useAlfakitDirection()` (`@alfakit/react`, `@alfakit/vue`, `@alfakit/svelte`), which docks it on the right in a right-to-left language. The mobile sheet and the rail follow `side`.
- It switches the kit's logo, user info, user menu and sidebar trigger to logical margins and alignment (`ms-1`, `ms-auto`, `me-2`, `text-start`). AlfaKit's starter kit stylesheet mirrors the inset gap, badges, actions and sub-menu line of the kit's sidebar primitives.

The installer only changes the shapes it knows. If you changed the sidebar's `side` or `<html dir>` yourself, it leaves them and prints a note. Set them from `useAlfakitDirection()` and `StarterKitDocument::direction()`. Your own pages may still use physical classes such as `ml-*` or `text-left` (the kit's header layout does), so switch them to the logical classes above.

Apps set up before this get the changes when you run the installer again: `php artisan alfakit:install --starter-kit --no-npm`, with the `--panel` and `--path` you installed with. It adds only what is missing, and `alfakit:upgrade` reminds you while it is missing. Rebuild your frontend afterwards.

## Fonts

Many Latin fonts have no Arabic, Hebrew or Persian glyphs, so the browser falls back to a system font. For a consistent look, load a font that covers the scripts you support and list it in your panel's font stack. For example, use Noto Sans Arabic, IBM Plex Sans Arabic or Vazirmatn for Arabic and Persian, and Noto Sans Hebrew or Heebo for Hebrew:

Load it at the very top of your stylesheet: an `@import url(…)` must precede every other rule, and below `@import 'tailwindcss'` the build warns and drops it. In a [starter kit](../getting-started/starter-kits) or [outside panels](../standalone/overview), AlfaKit uses your app's fonts, so add it to `resources/css/app.css` and add the family to the `--font-sans` of the stylesheet's `@theme inline` block. The starter kits define `--font-sans` there, and Tailwind writes that value straight into the `font-sans` class on `<body>`, so a `--font-sans` set on `:root` has no effect:

```css
/* resources/css/app.css: first line */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600&display=swap');

/* the starter kit's existing @theme inline block: add the family after the first one */
@theme inline {
    --font-sans:
        Instrument Sans, 'Noto Sans Arabic', ui-sans-serif, system-ui, sans-serif,
        'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
    /* … the block's other tokens stay as they are */
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
