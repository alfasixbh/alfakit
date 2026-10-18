---
title: Column layouts
description: Split, Stack, Panel and Grid layouts, card grids, collapsible details, column groups and user column reordering.
---

# Column layouts

A table renders each record as a row of cells. Wrap columns in **layout components** and each record becomes a block arranged by the layout instead, which reads better on small screens and suits card-style lists. Columns inside layouts keep all their behaviour: they are still searched, sorted, toggled and formatted on the server.

```php
use AlfaSix\Alfakit\Tables\Columns\Layout\Panel;
use AlfaSix\Alfakit\Tables\Columns\Layout\Split;
use AlfaSix\Alfakit\Tables\Columns\Layout\Stack;

$table->columns([
    Split::make([
        ImageColumn::make('avatar')->circular()->grow(false),
        TextColumn::make('name')->weight('bold')->searchable()->sortable(),
        Stack::make([
            TextColumn::make('phone')->icon('phone'),
            TextColumn::make('email')->icon('mail'),
        ])->space(1)->visibleFrom('md'),
    ])->from('md'),
    Panel::make([
        TextColumn::make('bio')->markdown(),
    ])->collapsible(),
]);
```

## Layout components

| Component                                                | What it does                                                                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `Split::make([...])`                                     | Columns side by side. `from('md')` stacks them below the breakpoint (`sm`, `md`, `lg`, `xl`, `2xl`).                       |
| `Stack::make([...])`                                     | Columns stacked vertically. `space(1 \| 2 \| 3)` sets the gap, `alignment()` / `alignCenter()` / `alignEnd()`.             |
| `Panel::make([...])`                                     | A muted box for secondary details. `collapsible()` hides it behind a per-record toggle; `collapsed(false)` starts it open. |
| `Grid::make(['default' => 1, 'md' => 2])->schema([...])` | Columns in a responsive grid. An integer is the column count from `lg` up.                                                 |

Inside a `Grid`, columns and layouts take `columnSpan()` and `columnStart()`, like form components: a number applies from `lg` up, `columnSpanFull()` spans every column at every size, and a breakpoint map is used as given.

```php
Grid::make(['default' => 1, 'lg' => 3])->schema([
    TextColumn::make('title')->columnSpan(2),
    TextColumn::make('status'),
    Stack::make([TextColumn::make('excerpt'), TextColumn::make('author.name')])->columnSpanFull(),
    TextColumn::make('price')->columnSpan(['md' => 2])->columnStart(['md' => 2]),
]);
```

Every layout accepts `visibleFrom('md')`, `hiddenFrom('lg')`, `hidden()` / `visible()`, `extraAttributes()` and, inside a `Split`, `grow(false)` so it only takes the width of its content. Columns use their own `grow(false)` in a `Split` (an avatar, an icon). Layouts nest freely.

Content layouts have no column headers, so sortable columns are offered in a **Sort by** select in the toolbar instead. Record actions sit at the end of each record (or at the start with `RecordActionsPosition::BeforeCells` / `BeforeColumns`), and the selection checkbox at the start.

### Collapsible details

`Panel::make([...])->collapsible()` adds a show/hide button (`aria-expanded`, `aria-controls`) to each record; the panel's columns are only shown once it is opened. Collapsible panels placed directly in `columns()` render under the record's main row.

## Card grids

`contentGrid()` lays records out as cards:

```php
$table
    ->columns([
        Stack::make([
            ImageColumn::make('cover')->height(160),
            TextColumn::make('title')->weight('bold'),
            TextColumn::make('price')->money('USD'),
        ]),
    ])
    ->contentGrid(['md' => 2, 'xl' => 3]);
```

`contentGrid()` also works without layout components: each card then stacks the table's columns.

## Column groups

`ColumnGroup` puts a shared header above adjacent columns in a regular table:

```php
use AlfaSix\Alfakit\Tables\Columns\ColumnGroup;

$table->columns([
    TextColumn::make('title'),
    ColumnGroup::make('Visibility', [
        IconColumn::make('is_published')->boolean(),
        TextColumn::make('published_at')->date(),
    ])->alignCenter()->wrapHeader(),
    TextColumn::make('author.name'),
]);
```

Group headers span their visible columns; ungrouped columns span both header rows. `extraAttributes()` adds attributes to the group header cell. A group whose columns are all hidden is left out.

## Reordering columns

`reorderableColumns()` lets each user change the column order from the column manager (the **Columns** button): drag a column onto another to drop it there, or use the move up / move down buttons (the keyboard path; every button has a translated label and describes the column's position, and a screen-reader live region announces each move), and reset with the button at the bottom:

```php
$table->reorderableColumns();
```

The order is stored **per user in the session**, keyed by panel, page (or relation manager), table identifier and model, through the internal `POST /_alfakit/table/columns` endpoint. The endpoint authorises from the page's context token like every other internal endpoint, drops names that are not visible columns of that table, and answers 404 for tables without `reorderableColumns()`. Toggleable columns stay in the same menu. Tables with content layouts arrange their columns themselves and can't be reordered.

Columns of a `ColumnGroup` move only inside their group, and a whole group moves as one item among the other columns, so groups stay together. With `deferColumnManager()` moves are kept as a draft until **Apply** (the announcement says so); otherwise the new order shows at once and is saved.

On the server, `$table->persistColumnOrder([...])`, `getPersistedColumnOrder()` and `resetColumnOrder()` work with the stored order.

## Column manager options

```php
use AlfaSix\Alfakit\Tables\Enums\ColumnManagerLayout;
use AlfaSix\Alfakit\Tables\Enums\ColumnManagerResetActionPosition;

$table
    ->deferColumnManager()                                   // toggles wait for "Apply"
    ->columnManagerLayout(ColumnManagerLayout::Modal)        // a dialog instead of a dropdown
    ->columnManagerColumns(2)                                // or ['default' => 1, 'md' => 2]
    ->columnManagerResetActionPosition(ColumnManagerResetActionPosition::Header)
    ->columnManagerTriggerAction(fn (Action $action) => $action->button()->label('Columns'))
    ->columnManagerApplyAction(fn (Action $action) => $action->label('Show'))
    ->columnManagerResetAction(fn (Action $action) => $action->color('danger'));
```

With `ColumnManagerLayout::Modal`, the modal options of `columnManagerTriggerAction()` apply to the column manager, as in Filament:

```php
$table
    ->columnManagerLayout(ColumnManagerLayout::Modal)
    ->columnManagerTriggerAction(fn (Action $action) => $action
        ->slideOver()                      // a slide-over; slideOverPosition(SlideOverPosition::Start) for the start side
        ->modalWidth(Width::Large)
        ->modalHeading('Visible columns')
        ->modalDescription('Pick and order the columns of this table.'));
```

Toggles apply at once by default (`deferColumnManager(false)`; Filament defers them). The reset button restores the defined column order and, for toggleable columns, the default visibility (`toggleable(isToggledHiddenByDefault:)`); it sits below the list by default. Trigger closures work like the [filter buttons](filters#customising-the-filter-buttons).

## Styling hooks

Records of a content layout render as `[data-slot="table-record"]` inside `[data-slot="table-content"]`; layouts carry `data-layout="split|stack|panel|grid"` and columns `data-column="name"`. The column manager popover is `[data-slot="column-manager"]`.
