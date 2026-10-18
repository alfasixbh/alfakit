---
title: Builder
description: Lists of content blocks, each with its own schema.
---

# Builder

A `Builder` holds a list of blocks. Each block type has its own name, label, icon and schema, and the user adds, reorders, clones, collapses and deletes blocks freely. Use it for page content, landing-page sections or any list of mixed items.

```php
use AlfaSix\Alfakit\Forms\Components\Builder;
use AlfaSix\Alfakit\Forms\Components\Builder\Block;

Builder::make('content')
    ->blocks([
        Block::make('heading')
            ->icon('heading')
            ->schema([
                TextInput::make('content')->required(),
                Select::make('level')->options(['h2' => 'H2', 'h3' => 'H3'])->default('h2'),
            ]),
        Block::make('paragraph')
            ->icon('text')
            ->schema([RichEditor::make('content')->required()]),
        Block::make('image')
            ->icon('image')
            ->maxItems(1)
            ->columns(2)
            ->schema([
                FileUpload::make('url')->image()->required(),
                TextInput::make('alt')->required(),
            ]),
    ])
    ->blockPickerColumns(2)
    ->collapsible()
    ->cloneable()
    ->minItems(1)
    ->maxItems(20);
```

## State

The state is a list of items, each with the block name and the block's data, the same shape as Filament:

```php
[
    ['type' => 'heading', 'data' => ['content' => 'Welcome', 'level' => 'h2']],
    ['type' => 'paragraph', 'data' => ['content' => '<p>Hello</p>']],
]
```

Store it in a JSON column with an `array` cast. When the form is filled, items whose block no longer exists are dropped, and fields missing from an item get their defaults.

## Blocks

`Block::make('name')` sets the stored `type`. Then:

- `label()` — a string, or a closure receiving the item's `$state` (its `data`; `null` in the block picker) to label each item after its content:

    ```php
    Block::make('heading')->label(fn (?array $state): string => $state === null ? 'Heading' : ($state['content'] ?? 'Untitled heading'))
    ```

- `summary()` — a one-line, plain-text summary shown after the label in the item header, most useful when items are collapsed. A string, or a closure receiving the item's `$state` (also as `$data`) and `$index`; HTML is stripped, whitespace collapsed and the text cut at 160 characters. It is computed on the server when the form is sent, and shown in its own text direction, so an English heading reads correctly in an Arabic panel:

    ```php
    Block::make('faq')
        ->label('Questions and answers')
        ->summary(fn (array $state): ?string => $state['heading'] ?? null)
    ```

- `icon()` — a Lucide icon name shown in the block picker (and in item headers with `blockIcons()`).
- `schema()` — the block's fields and layout components. Each item gets its own copy, so closures (`hidden`, `options`, `afterStateUpdated`) see the item's data and `$get('../sibling')` works. Repeaters can be nested inside blocks.
- `columns()` — grid columns for the block's fields (one by default).
- `maxItems()` — how many items of this block the builder may hold.
- `hidden()` / `visible()` — hidden blocks are not offered in the picker. Items of a block that is hidden after they were saved are kept and still validate.
- `group()` — the heading the block is listed under in the picker.

Named arrays group blocks under headings in the picker, like Filament. Ungrouped blocks come first, then each group in order; grouping doesn't change the stored state:

```php
Builder::make('content')->blocks([
    Block::make('note')->schema([Textarea::make('text')]),
    'Content' => [
        Block::make('heading')->schema([TextInput::make('text')]),
        Block::make('paragraph')->schema([Textarea::make('text')]),
    ],
    'Media' => [
        Block::make('video')->schema([TextInput::make('url')->url()]),
    ],
])
```

## Options

| Method                                                               | Effect                                                                                                                                                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minItems()`, `maxItems()`                                           | Bounds on the number of items.                                                                                                                                                                    |
| `addable(false)`, `deletable(false)`, `reorderable(false)`           | Lock the list. Enforced on the server.                                                                                                                                                            |
| `cloneable()`                                                        | A clone button per item (respects the block's and the builder's `maxItems()`).                                                                                                                    |
| `collapsible()`, `collapsed()`                                       | Collapse items; `collapsed()` starts them collapsed.                                                                                                                                              |
| `blockPickerColumns(2)`                                              | Columns of the block picker menu; an array sets breakpoints (`['default' => 1, 'md' => 3]`).                                                                                                      |
| `blockNumbers(false)`                                                | Hide the item numbers in headers.                                                                                                                                                                 |
| `blockIcons()`                                                       | Show each block's icon in its item header.                                                                                                                                                        |
| `blockLabels(false)`                                                 | Hide the item labels in headers.                                                                                                                                                                  |
| `blockActionsMenu()`                                                 | Put the item actions (move up / down, duplicate, extra item actions, delete) in a compact **More** menu in each item header instead of a row of icon buttons. The collapse toggle stays a button. |
| `addActionLabel()`                                                   | Label of the add button (default "Add to {label}").                                                                                                                                               |
| `virtualize(false)`, `virtualizeThreshold(200)`                      | Windowed rendering of long lists; on above 50 items by default ([Performance](/docs/advanced/performance)).                                                                                       |
| `readOnly()`, `disabled()`                                           | Show the blocks without editing controls. Fields inside are read-only or disabled too.                                                                                                            |
| `blockPickerWidth(Width::TwoExtraLarge)`                             | Width of the block picker menu.                                                                                                                                                                   |
| `addActionAlignment(Alignment::End)`                                 | Where the add button sits (start by default).                                                                                                                                                     |
| `reorderableWithButtons(false)`, `reorderableWithDragAndDrop(false)` | Hide the move up / down buttons, or the drag handle.                                                                                                                                              |
| `searchable()`, `searchDebounce(500)`                                | A search field in the block picker, matching block labels (and group headings) in the browser; `searchDebounce()` (alias `blockSearchDebounce()`) waits that many milliseconds after typing.      |
| `searchPrompt('Find a block')`, `noSearchResultsMessage('No match')` | Placeholder and accessible label of the picker search, and the text shown when nothing matches.                                                                                                   |
| `deferLoading()`                                                     | Send the field without its items on the page's first response and load it when it scrolls into view ([Repeater](fields#repeater)).                                                                |

With `blockActionsMenu()` the header keeps just the label, the summary, the collapse toggle and the menu, which suits long builders and narrow screens:

```php
Builder::make('content')
    ->blocks([
        Block::make('heading')
            ->label('Heading')
            ->summary(fn (array $state): ?string => $state['text'] ?? null)
            ->schema([TextInput::make('text')->required()]),
    ])
    ->collapsible()
    ->cloneable()
    ->blockActionsMenu()
```

The block picker opens below the add button, or above it when there is no room below; either way it stays clear of the panel's sticky top bar.

The move up / down buttons announce the new position to screen readers and keep the focus on the moved item; a second press while a move is still rendering is ignored (Repeater and KeyValue do the same).

The item buttons are actions, customised exactly as on a [Repeater](fields#item-actions): `addAction()`, `deleteAction()`, `cloneAction()`, `reorderAction()`, `moveUpAction()`, `moveDownAction()`, `collapseAction()`, `expandAction()`, `collapseAllAction()`, `expandAllAction()` and `extraItemActions()`. The add action runs with `$arguments['block']`, the block picked in the menu; `addBlock('heading', [...])` adds one from your own action.

## Previews

`blockPreviews()` shows each item as its block's preview instead of its form. The edit button in the item header (or clicking a preview) opens the form; closing it re-renders the previews from the server.

```php
Builder::make('content')
    ->blockPreviews()                    // or blockPreviews(areInteractive: true)
    ->blocks([
        Block::make('heading')
            ->preview('blocks.previews.heading')   // Blade view; the item's data are its variables
            ->schema([TextInput::make('content')]),
        Block::make('quote')
            ->preview(fn (array $data): HtmlString => new HtmlString('<q>'.e($data['text'] ?? '').'</q>'))
            ->schema([Textarea::make('text')]),
        Block::make('chart')
            ->previewComponent('chart')            // frontend component `builder-preview:chart`
            ->schema([TextInput::make('title')]),
    ]);
```

A Blade preview gets the item's fields as variables plus `$data` and `$index`; escape output with `{{ }}`. A preview component is registered with the renderer (`createAlfakit({ components: { 'builder-preview:chart': ChartPreview } })`) and receives `data`, `block` and `index`, so it updates as the user types. Non-interactive previews ignore pointer events inside them; `areInteractive: true` keeps their links and buttons clickable. Blocks without a preview show their form.

## Validation

Everything is validated on the server: each item's `type` must be one of the builder's blocks, each block's `maxItems()` and the builder's bounds are checked, and every block field runs its own rules. Errors are reported on the field's path (`content.0.data.content`), so they show next to the right input.

`relationship()` and `simple()` are Repeater features and throw a `LogicException` on a Builder: blocks are stored together in one column.

## Renderers

React, Vue and Svelte render the Builder with the same `data-slot="builder"` hook and a `data-block` attribute on each item. Freshly added, moved or cloned items render from the block template until the next server round trip, so they work before the server has seen them.
