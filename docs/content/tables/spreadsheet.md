---
title: Spreadsheet mode
description: Edit a table like a spreadsheet, with keyboard navigation, copy and paste from Excel or Google Sheets, fill down, undo, per-cell validation and saving in one request.
---

# Spreadsheet mode

`spreadsheet()` adds an **Edit as spreadsheet** button to the table toolbar. It switches the current page of records into an editing grid. Users move through cells with the keyboard, type over values, paste ranges from Excel or Google Sheets and fill down. Edited cells are highlighted until **Save changes** sends them all in one request. The server checks every cell against its column's rules and every record against your `update` policy.

```php
use AlfaSix\Alfakit\Tables\Columns\SelectColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Columns\TextInputColumn;
use AlfaSix\Alfakit\Tables\Columns\ToggleColumn;

$table
    ->columns([
        TextColumn::make('sku'),
        TextInputColumn::make('name')->rules(['required', 'max:120']),
        TextInputColumn::make('price')->type('number')->rules(['numeric', 'min:0']),
        SelectColumn::make('status')->options(Status::class),
        ToggleColumn::make('is_active'),
        TextColumn::make('stock')->editable()->rules(['integer', 'min:0']),
    ])
    ->spreadsheet();
```

The grid's code loads the first time someone opens it, so tables that never use it don't pay for it.

## Editable cells

- The inline-editable columns (`TextInputColumn`, `SelectColumn`, `ToggleColumn`, `CheckboxColumn`) can be edited in the grid. `editable(false)` leaves one out.
- A `TextColumn` becomes editable with `editable()`. The grid edits the raw value (an enum's value, a date as `Y-m-d H:i:s`), not the formatted text. Add `rules()` to validate it. A relationship column (`author.name`) also needs `updateStateUsing()`.
- `disabled()` cells (also per record, with a closure) and every other column stay read-only. Users can still copy them.

Saving reuses the column's own `rules()`, `beforeStateUpdated()`, `afterStateUpdated()` and `updateStateUsing()`, exactly as an inline edit does.

## Keyboard and clipboard

| Key                                   | Action                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------- |
| Arrow keys, Home, End, Page Up / Down | move between cells. Left and right follow the reading direction (RTL)   |
| Shift + arrows                        | select a range                                                          |
| Ctrl/Cmd + Home / End                 | first / last cell                                                       |
| Enter or F2                           | edit the cell. On a toggle, flip it (Space does too)                    |
| Typing                                | replaces the value                                                      |
| Enter / Shift+Enter, Tab / Shift+Tab  | keep the edit and move down / up / right / left                         |
| Escape                                | cancel the edit                                                         |
| Delete or Backspace                   | empty the selected cells                                                |
| Ctrl/Cmd + C                          | copy the cell or range as tab-separated text (select options as labels) |
| Ctrl/Cmd + V                          | paste a range (see below)                                               |
| Ctrl/Cmd + D                          | fill down: copy the top row of the selection into the rows below it     |
| Ctrl/Cmd + Z                          | undo the last change (an edit, paste, fill or clear)                    |
| Ctrl/Cmd + S                          | save                                                                    |

Pasting reads tab-separated text, including quoted cells with tabs, line breaks or quotes, the way Excel and Google Sheets copy it. The block starts at the selected cell. A single copied cell fills the whole selected range. Before anything changes, a preview shows:

- how many cells will change,
- values that can't fit their column (an option that doesn't exist, text in a number column, "maybe" in a toggle),
- the server's validation errors for the pasted values (a dry run), and
- how many pasted cells fall on read-only cells and are skipped.

Toggles accept `1`/`0`, `true`/`false`, `yes`/`no`, `on`/`off` and `x`. Selects accept an option's value or its label, in any case.

## Saving

**Save changes** posts every edited cell in one request (`POST /_alfakit/table/cells`, up to 1,000 cells). For each cell, the server:

1. finds the record through the table's query, so tenant scoping, list tabs, saved views and `modifyQueryUsing()` all apply. Deleted, missing and other tenants' records are refused,
2. checks the `update` policy for the record,
3. refuses read-only columns and `disabled()` cells, and
4. validates the value with the column's rules.

By default a save is all or nothing. If any cell fails, nothing is saved, and the failing cells stay highlighted with their messages (`aria-invalid`, a tooltip, and a list under the grid that jumps to each cell). With `spreadsheet(atomic: false)`, the valid cells are saved and the rest are reported:

```php
$table->spreadsheet(atomic: false);
```

After a save, **Undo last save** puts the previous values back through the same endpoint. If someone else changed a cell in the meantime, that cell is reported as a conflict and isn't overwritten. Edits survive reloads (live updates, polling) for records that are still on the page. Leaving the grid with unsaved changes asks for confirmation first.

## Accessibility and styling

The grid uses `role="grid"` with `aria-rowcount`, `aria-colcount`, `aria-rowindex` and `aria-colindex`. Focus moves between cells (only the active cell is a tab stop), so screen readers announce each cell as you move. Copy, paste, fill, undo and save results are announced in a live region. Long pages are virtualised the same way the table is (`virtualize()`).

Style the grid through `data-slot="spreadsheet"`, `spreadsheet-toolbar`, `spreadsheet-grid`, `spreadsheet-cell` (with `data-dirty` and `data-active`), `spreadsheet-errors`, `spreadsheet-paste` and the toolbar's `spreadsheet-trigger`.
