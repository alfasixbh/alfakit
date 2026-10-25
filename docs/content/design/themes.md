---
title: Themes
description: Six complete designs, from a classic sidebar to top navigation and an icon rail, chosen per panel.
---

# Themes

A theme is a complete design, not a colour palette. It decides the page structure, how navigation, page titles, cards, inputs, buttons and tables look, and the spacing, corner radius, fonts and colours in light and dark mode.

Themes apply to admin panels. A [starter kit](../getting-started/starter-kits#styles-and-theme) panel uses your app's own theme and appearance setting, and [components outside panels](../standalone/customizing) use your page's shadcn tokens, so `->theme()`, `->design()` and the other options on [Design options](design-options) and [Per-role design](per-role-design) have no effect there. [Slots](slots), per-component classes ([Customizing](customizing)) and [Icons](icons) still apply, as those pages describe.

```php
$panel->theme('alfakit');
```

| Theme               | Structure                      | What makes it different                                                                                                                                                                 |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `neutral` (default) | Sidebar, inset content         | The classic shadcn look: bordered cards, plain titles, outlined inputs.                                                                                                                 |
| `alfakit`           | Floating sidebar               | The AlfaKit brand: Alfa Navy and Fox Orange on warm cream, Montserrat titles and Inter text, pill navigation, a hero banner on every page, elevated cards, filled inputs, pill buttons. |
| `minimal`           | **Top navigation, no sidebar** | Underlined tabs, a compact title, flat hairline surfaces, underlined inputs, square buttons, compact spacing, the system font.                                                          |
| `soft`              | **Icon rail**                  | A slim rail that expands on demand, large serif titles (Fraunces), tinted borderless cards, filled rounded inputs, striped tables, Nunito.                                              |
| `corporate`         | Navy sidebar                   | Accent-bar navigation, a full-width title band, square bordered surfaces, uppercase table headers, dense striped tables, IBM Plex Sans.                                                 |
| `filament`          | Flush sidebar                  | For teams coming from FilamentPHP: grey canvas, transparent sidebar, white ringed cards, amber accents, Inter.                                                                          |

Fonts load automatically from [Bunny Fonts](https://fonts.bunny.net), a privacy-friendly mirror of Google Fonts. Every theme supports dark mode and right-to-left languages.

Set the default for every panel in `config/alfakit.php` (`'theme' => 'alfakit'`) or with `ALFAKIT_THEME`. A closure lets users or tenants choose:

```php
$panel->theme(fn () => auth()->user()?->preferred_theme ?? 'alfakit');
```

## Different panels, different designs

Each panel has its own theme, so an internal admin panel and a customer portal can look nothing alike:

```php
// AdminPanelProvider
$panel->id('admin')->theme('corporate');

// PortalPanelProvider
$panel->id('portal')->theme('soft')->colors(['primary' => '#0f766e']);
```

## Changing one part of a theme

Keep a theme and change single aspects. See [Design options](design-options) for everything you can set:

```php
$panel
    ->theme('alfakit')
    ->design(layout: 'topbar', inputs: 'outline')
    ->sidebarVariant('flush')
    ->density('compact')
    ->radius('0.5rem')
    ->font('Sora')
    ->headingFont('Fraunces')
    ->colors(['primary' => '#7c3aed']);
```

## Your own theme

Generate one with:

```bash
php artisan make:alfakit-theme acme --extends=alfakit --panel=admin
```

It writes `app/Alfakit/Themes/AcmeTheme.php` (`AcmeTheme::make()` returns the `Theme`), `resources/css/alfakit/themes/acme.css` with the token blocks for light and dark mode, imports that file in `resources/css/alfakit.css`, and adds `->theme(\App\Alfakit\Themes\AcmeTheme::make())` to the panel provider (passing a `Theme` to `theme()` registers it). When the provider already calls `->theme(…)`, it leaves that call alone and prints the line to use instead; replace it yourself. Rebuild your assets afterwards.

You can also register a theme yourself, usually on top of a built-in one, in a service provider:

```php
use AlfaSix\Alfakit\Theming\Theme;
use AlfaSix\Alfakit\Theming\Themes;

Themes::register(
    Theme::make('acme')
        ->label('Acme')
        ->extends('alfakit')
        ->layout('topbar')
        ->header('band')
        ->buttons('square')
        ->font('Sora')
        ->colors(['primary' => '#ea580c']),
);
```

```php
$panel->theme('acme');
```

`label()` and `description()` also take a closure, resolved when they are read, so a theme picker can show them in the user's language: `->label(fn (): string => __('themes.acme'))`. The built-in themes are translated this way.

The page gets `data-alfakit-theme="alfakit acme"`, so your CSS only adds what changes:

```css
/* resources/css/alfakit.css */
:root[data-alfakit-theme~='acme'] {
    --background: oklch(0.985 0.004 60);
    --sidebar: oklch(0.2 0.03 40);
    --sidebar-foreground: oklch(0.95 0.01 60);
}

:root.dark[data-alfakit-theme~='acme'] {
    --background: oklch(0.17 0.02 40);
}

/* Anything else, scoped to your theme. */
:root[data-alfakit-theme~='acme'] [data-slot='page-header'] h1 {
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
```

Colour tokens follow the [shadcn](https://ui.shadcn.com/docs/theming) convention: `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--accent`, `--border`, `--input`, `--ring`, the `--sidebar-*` family, `--chart-1` to `--chart-5`, and AlfaKit's `--success`, `--warning` and `--info`. Keep the `var(--alfakit-primary, …)` form for semantic colours if `->colors()` should still override them.

## Colours

`->colors([...])` takes any CSS colour per name:

```php
$panel->colors([
    'primary' => '#2563eb',
    'gray' => '#64748b',       // tints the neutral tokens
    'brand' => '#7c3aed',      // a custom name
]);
```

- `primary`, `danger`, `success`, `warning` and `info` replace the theme's semantic colours.
- `gray` tints the neutral tokens of every theme, in light and dark mode: `--muted`, `--accent`, `--secondary` and the sidebar accent are mixed from it, `--muted-foreground` is the gray itself and borders take a light tint. `<html>` gets `data-alfakit-gray` while it is set.
- A closure picks the colours per request (evaluated once per request, with `$user`, `$tenant`, `$page` and `$request` injectable): `->colors(fn (?Team $tenant) => ['primary' => $tenant?->brand_color ?? '#2563eb'])`. Calls add up; later names win.
- `Colors::register([...])` (`AlfaSix\Alfakit\Support\Colors\Colors`, Filament's `FilamentColor::register()`) sets colours for every panel from a service provider. It takes an array or a closure; theme colours come first, then registered ones, then the panel's `colors()`.
- Any other name (letters, digits and dashes) is emitted as `--alfakit-{name}` with a readable `--alfakit-{name}-foreground`, and works as a colour wherever components take one: `Action::make('upgrade')->color('brand')`, `TextColumn::make('plan')->badge()->color('brand')`. The server adds an `.alfakit-color-{name}` rule that points the generic colour utilities of `themes.css` (`alfakit-solid`, `alfakit-soft`, `alfakit-outline`, `alfakit-ghost`, `alfakit-text`) at it; renderers use those for names they have no classes for. A name without a value falls back to gray.

### Palettes

Instead of one CSS colour, a name can take an 11-shade palette (50 to 950), as in Filament: a Tailwind palette constant or one generated from a single colour.

```php
use AlfaSix\Alfakit\Support\Colors\Color;

$panel->colors([
    'primary' => Color::Indigo,               // every Tailwind CSS v4 palette: Slate … Rose
    'warning' => Color::Amber,
    'brand' => Color::hex('#ff5500'),         // generated: Color::rgb('rgb(255, 85, 0)'), Color::generatePalette('oklch(…)')
    'danger' => '#dc2626',                    // single colours still work
]);
```

A palette emits `--alfakit-{name}-50` … `--alfakit-{name}-950` for your own CSS (`background: var(--alfakit-primary-50)`), and `--alfakit-{name}` itself is the 600 shade, or the 500 shade when white text on 600 doesn't reach WCAG AA (Amber, Yellow, Lime…), with its readable `--alfakit-{name}-foreground` picked as for single colours. The built-in themes look the same as before unless you set a palette; theme CSS can use the shade variables with a fallback (`var(--alfakit-primary-100, color-mix(…))`). `Theme::make('acme')->colors([...])` takes palettes too.

Generated palettes keep the colour's hue, follow Tailwind's lightness ladder and scale the chroma with the input's, so a grey gives a neutral palette. `Color` also has the WCAG helpers Filament has: `Color::calculateContrastRatio($a, $b)`, `Color::isTextContrastRatioAccessible()`, `Color::isNonTextContrastRatioAccessible()`, `Color::findShade(Color::Amber, '#ffffff', Color::WCAG_AA_TEXT)` (the lightest shade that reaches the ratio, `700` here; pass `shouldStartFromDarkest: true`, `minShade:` or `maxShade:` to narrow it), the constants `WCAG_AA_TEXT`, `WCAG_AA_LARGE_TEXT`, `WCAG_AA_NON_TEXT`, `WCAG_AAA_TEXT` and `WCAG_AAA_LARGE_TEXT`, `Color::isLight()`, and `convertToOklch()` / `convertToRgb()` / `convertToHex()`.

## Contrast

Every built-in theme meets WCAG 2.1 AA in light and dark mode: text tokens (`--foreground`, `--muted-foreground` on the page and on cards, `--primary-foreground` on `--primary`, `--primary` used as text, `--destructive` text, the sidebar and accent pairs) reach 4.5:1; the status colours `--success`, `--warning` and `--info` reach 4.5:1 both as text on the page (badges, `text-success`) and under their `-foreground` tokens (solid buttons); and `--input`, the border that outlines form controls, reaches 3:1 against the page and cards. A test in `@alfakit/core` checks these pairs, so a token change that breaks them fails the build.

The check does not cover tokens in your own theme; test those pairs yourself, for example with the WebAIM contrast checker. For `primary`, `danger`, `success`, `warning`, `info` and custom colour names passed to `->colors()` as hex, `rgb()` or `oklch()`, AlfaKit picks the text colour itself: it emits `--alfakit-primary-foreground` (and so on) with near-black text on pale colours such as amber and near-white text on deep ones. Colours it can't read (`var()`, named colours) keep the theme's own foreground. In your own theme, write `--primary-foreground: var(--alfakit-primary-foreground, …)` to keep this behaviour.
