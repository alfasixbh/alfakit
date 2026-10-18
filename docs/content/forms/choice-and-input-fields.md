---
title: Toggle buttons, slider & code editor
description: ToggleButtons, Slider and CodeEditor fields.
---

# Toggle buttons, slider & code editor

## ToggleButtons

A group of buttons acting as a radio, or with `multiple()` as a set of toggles. Options take colours and icons.

```php
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;

ToggleButtons::make('status')
    ->options(['draft' => 'Draft', 'scheduled' => 'Scheduled', 'published' => 'Published'])
    ->colors(['draft' => 'gray', 'scheduled' => 'warning', 'published' => 'success'])
    ->icons(['draft' => 'pencil', 'scheduled' => 'clock', 'published' => 'check'])
    ->inline();

ToggleButtons::make('feature')->boolean()->grouped();          // Yes / No, stored as booleans
ToggleButtons::make('channels')->options(Channel::class)->multiple();

ToggleButtons::make('status')
    ->options([...])
    ->tooltips(['draft' => 'Set as a draft before publishing.', 'published' => 'Publish now'])
    ->size(Size::Small)                // AlfaSix\Alfakit\Support\Enums\Size
    ->inline()
    ->fullWidth();
```

- `options()` accepts arrays, enums and closures like `Select`; `colors()`, `icons()` and `disableOptionWhen()` work per option.
- `inline()` lays the buttons out in a row; `grouped()` joins them into one segmented control.
- `multiple()` stores a list of values.
- `boolean()` adds Yes / No options (labels can be passed), stores `true` / `false`, and colours them success / danger with check / x icons unless `colors()` / `icons()` say otherwise.
- `hiddenButtonLabels()` shows only the icons; the labels stay as the buttons' accessible names.
- `tooltips()` gives options a tooltip (option value → text), shown on hover and focus.
- `size()` takes `Size::ExtraSmall`, `Small`, `Medium` (default), `Large`, `ExtraLarge` (or `'xs'` … `'xl'`); any other string is added to the buttons as a CSS class, `null` restores the default. It applies to `grouped()` buttons too.
- `fullWidth()` stretches the buttons to fill the field: stacked buttons take the full width, `inline()` and `grouped()` buttons share it.
- `columns(3)` lays the buttons out in a grid of full-width buttons from the `md` breakpoint (a breakpoint map uses its `lg` value); `gridDirection('column')` fills each column top to bottom instead of row by row. Ignored with `inline()` or `grouped()`.

Each button reports its state with `aria-pressed`. Submitted values must be enabled options.

## Slider

```php
use AlfaSix\Alfakit\Forms\Components\Slider;

Slider::make('volume')->range(minValue: 0, maxValue: 100)->step(5)->tooltips();

Slider::make('price')
    ->range(minValue: 0, maxValue: 1000)
    ->default([200, 800])        // two thumbs: the state is [min, max]
    ->step(10)
    ->pips(density: 100)
    ->minDifference(50);
```

- `range(minValue:, maxValue:)`, or `minValue()` / `maxValue()`, set the bounds (0–100 by default).
- `step()` sets the increment; `decimalPlaces()` rounds stored values (and implies a step of `0.1`, `0.01`… when no step is set).
- An array `default()` (or `multiple()`) gives the slider one thumb per value; the state is a sorted list. A list filled from the record (an `array` cast, `fill()`) is a range too, and so is a list posted for a field the server left empty (an action form); a list sent for a field the server filled with a number is rejected.
- `tooltips()` shows each thumb's value; `tooltips([true, false])` sets it per thumb (here only the first). `pips()` draws tick marks with labels every step, or every `density` units (at most eleven labels).
- `fillTrack()` colours the track up to a single thumb; ranges always fill between their thumbs. With several thumbs, `fillTrack([false, true, false])` picks the sections to colour, one more than there are thumbs (before the first thumb, between the first and second…).
- `minDifference()` / `maxDifference()` limit the distance between the thumbs of a range.
- `rangePadding(10)` (or `[10, 20]` for the start and end) keeps the thumbs that far from the ends of the track; validation enforces it too.
- `vertical()` draws the slider vertically, with the minimum at the bottom; `vertical(isTopToBottom: true)` puts the minimum at the top (Filament's `vertical()->rtl(false)` does the same).

### Pips

```php
use AlfaSix\Alfakit\Forms\Components\Slider\Enums\PipsMode;

Slider::make('rating')->range(0, 100)->pips(PipsMode::Count)->pipsValues(5);
Slider::make('rating')->range(0, 100)->pips(PipsMode::Positions, density: 5)->pipsValues([0, 25, 50, 75, 100]);
Slider::make('rating')->range(0, 100)->pips(PipsMode::Values)->pipsValues([10, 50, 90]);
Slider::make('rating')->range(0, 10)->pips(PipsMode::Steps);

Slider::make('rating')
    ->range(0, 100)
    ->pips(density: 5)
    ->pipsFilter(fn (int|float $value): int => match (true) {
        $value % 50 === 0 => 1,  // large label
        $value % 10 === 0 => 2,  // small label
        $value % 25 === 0 => 0,  // tick without a label
        default => -1,           // hidden
    });
```

`PipsMode::Steps` labels every step (large labels at the ends and at non-linear points), `Positions` puts pips at percentages of the track, `Count` spreads a number of pips evenly and `Values` puts them at values. In a mode, `density` (or `pipsDensity()`) adds unlabelled ticks every so many percent of the track. `steppedPips()` rounds labelled pips to values the thumbs can take. `pipsFilter()` decides per pip with a PHP closure, run on the server (Filament's `RawJs` filter: write the same expression in PHP). Pips are computed on the server and sent as a list.

### Non-linear tracks

```php
Slider::make('price')
    ->range(0, 10000)
    ->nonLinearPoints(['10%' => [500, 500], '50%' => [4000, 1000]])
    ->pips(PipsMode::Positions, density: 4)
    ->pipsValues([0, 25, 50, 75, 100])
    ->steppedPips();
```

`nonLinearPoints()` places values at positions of the track: `'20%' => 50` puts 50 at a fifth of the track. `'20%' => [50, 5]` also sets the step from there on. As in Filament, the steps of non-linear sections are not validated. Thumbs keep their real values (`aria-valuetext` and tooltips show them); the slider primitive works in positions, so arrow keys move by 0.1% of the track.

### Behaviour and direction

```php
use AlfaSix\Alfakit\Forms\Components\Slider\Enums\Behavior;

Slider::make('window')->default([20, 40])->behavior([Behavior::Tap, Behavior::Drag]);
Slider::make('window')->default([20, 40])->behavior([Behavior::Drag, Behavior::Fixed]);
Slider::make('volume')->behavior(null)->rtl();
```

- `Behavior::Tap` (the default) moves the nearest thumb to where the track is pressed; `Snap` does the same. Without either, presses on the track are ignored and only the thumbs move.
- `Drag` lets users drag the filled range between two thumbs to move them together; with `Fixed` the distance between thumbs never changes (keyboard moves included).
- Thumbs stop at their neighbours (`minDifference()` apart) instead of passing them; `Unconstrained` lets them pass. When two thumbs sit on the same value, the next move may push either one.
- `SmoothSteps` lets dragged thumbs move freely and snaps them to the nearest step on release.
- `behavior(null)` turns everything off. Filament's `Hover` and `InvertConnects` have no equivalent.
- `rtl()` puts the minimum on the right; `rtl(false)` keeps a slider left to right in a right-to-left panel.

The slider follows the page's reading direction by default (the minimum is on the right in right-to-left languages), supports the arrow, Page Up/Down, Home and End keys, and formats values with the panel's locale. Values are validated (`numeric`, within bounds and padding, distances) and cast to numbers on the server.

## CodeEditor

A code field with syntax highlighting. The state is the code as a string.

```php
use AlfaSix\Alfakit\Forms\Components\CodeEditor;
use AlfaSix\Alfakit\Forms\Components\CodeEditor\Enums\Language;

CodeEditor::make('snippet')->language(Language::Php)->maxHeight(400);
CodeEditor::make('config')->language('yaml')->lineNumbers(false)->wrap();
```

- `language()` takes a `Language` case or its value: `cpp`, `css`, `go`, `html`, `java`, `javascript`, `json`, `markdown`, `php`, `python`, `sql`, `typescript`, `xml`, `yaml`. Other values render as plain text.
- `lineNumbers(false)`, `wrap()`, `tabSize()`, `minHeight()` / `maxHeight()` (pixels), `maxLength()`.

The editor is a native textarea layered over its highlighted copy, so selection, undo, spell-check settings and screen readers work as in any textarea. Tab indents and Shift+Tab outdents the selected lines; press Escape, then Tab, to move focus on. Enter keeps the current line's indentation. Code always reads left to right, also in right-to-left layouts.

The highlighter is a small built-in tokenizer (no editor library is downloaded), and the editor's code loads the first time a code editor is shown. The server render shows the code as plain, read-only text, so the page is SSR-safe. Highlighted tokens are rendered as text, never as HTML.
