---
title: Performance
description: How AlfaKit keeps large forms and tables fast — Inertia page loads, virtualised lists, and the budgets that guard them.
---

# Performance

AlfaKit panels run on Inertia: a visit returns the page as JSON props and the renderer updates the DOM in place, without a full page load or a second request for the data. Sorting, paging, filtering and searching a table are partial reloads of that table's props only. On top of that, long lists render only what is on screen.

## Virtualised lists

Repeater and Builder items and table rows are **virtualised** once a list has more than 50 entries: the renderer keeps the visible items plus a few on each side in the DOM, reserves the height of the rest, and swaps items in as the visitor scrolls. A 500-item Repeater renders about a dozen item cards instead of 500, and a 1,000-row page renders about twenty rows. Below the threshold nothing changes.

```php
Repeater::make('lines')->schema([...])->virtualizeThreshold(200);   // window only above 200 items
Builder::make('content')->blocks([...])->virtualize(false);          // always render every block
Table::make()->virtualizeEstimateSize(64);                           // taller rows: better scrollbar before measuring
```

| Method                        | Effect                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `virtualize(bool\|Closure)`   | Turn windowing off (or on) for this Repeater, Builder or Table. On by default.                                  |
| `virtualizeThreshold(int)`    | Window only when the list has more items than this (default 50).                                                |
| `virtualizeEstimateSize(int)` | Height in pixels assumed for an item before it has been measured. Only affects the scrollbar, never what shows. |

Everything a non-virtualised list does keeps working:

- **Keyboard navigation.** The item that has focus and its neighbours stay rendered, so Tab reaches the next item even when it was outside the window; the browser scrolls it into view and the window follows.
- **Reordering, cloning, collapsing.** Drag-and-drop and the move buttons work between rendered items; collapse state is keyed by index and moves with its item.
- **Validation errors.** When a submit or a live validation adds errors inside a windowed Repeater or Builder, the first errored item scrolls into view and shows its message.
- **File uploads.** A `FileUpload` inside a windowed item keeps the files it uploaded in this session and their local image previews while the item is out of view, and shows them again when it is back.
- **Server-side rendering.** The server renders the first window (about a viewport's worth plus overscan); the browser hydrates it as-is and extends it after mount, so there is no hydration mismatch.
- **Assistive technology.** Windowed items carry `aria-setsize` / `aria-posinset`, windowed tables `aria-rowcount` / `aria-rowindex`, so screen readers announce the real position in the full list; the spacers are `aria-hidden`.

A Repeater with a multi-column `grid()` and a table [content layout](/docs/tables/layout) (stacks, or cards in a `contentGrid()`) are windowed by **whole rows**: the renderer counts the columns of the rendered grid (`grid-template-columns`, so it follows the viewport's breakpoint) and a row is as tall as its tallest item. Before the list is measured it is treated as one column, so the server-rendered first window still matches the client. Windowed content-layout records carry `role="list"` / `role="listitem"` with `aria-setsize` / `aria-posinset`.

### In custom components

The windowing logic lives in `@alfakit/core` (`VirtualList`) and each renderer exposes it for your own long lists:

```tsx
// React
import { useVirtualList } from '@alfakit/react'

const { range, indexes, style, attach, item } = useVirtualList(rows.length, {
    threshold: 50,
    estimateSize: 48,
})

return (
    <ul ref={attach} style={style}>
        {indexes.map((index) => (
            <li key={index} ref={item} data-index={index}>
                {rows[index].label}
            </li>
        ))}
    </ul>
)
```

Vue (`useVirtualList(() => rows.length, () => options)` returns refs; bind `:ref="virtual.attach"`, `:style="virtual.style.value"` and `:ref="virtual.item"` with `:data-index`) and Svelte (`useVirtualList(() => rows.length, () => options)`; use `{@attach virtual.attach}`, `style={virtual.style}` and `{@attach virtual.item}` with `data-index`) mirror this. `virtualizeOptions(schema.virtualize, estimate, gap)` turns the schema prop into options, and `useScrollToErroredItem` adds the error scrolling for a form field.

## Budgets

Three checks keep this from regressing; they run in `composer test`, `pnpm test` and `pnpm run perf:budget`:

- Every renderer renders a 500-item Repeater (TextInput, Select, FileUpload per item) and a 1,000-row, 12-column table in Vitest and asserts the render time and the number of DOM nodes. Measured locally in jsdom, the windowed Repeater renders in 40–250 ms with about 750 nodes; rendering every item takes 1.5–4 s and over 30,000 nodes.
- `LargePayloadBudgetTest` serialises the same payloads in PHP and bounds their JSON size and time (locally 0.03 s / 362 KB for the Repeater, 0.19 s / 494 KB for the table).
- `pnpm run perf:budget` fails when the gzip size of the React panel's initial JavaScript grows past the limit in `scripts/perf-budget.json`; see [Contributing](https://github.com/alfasixbh/alfakit/blob/main/CONTRIBUTING.md#performance-budgets).

## Tips for large panels

- Prefer paging over `paginated(false)`; virtualisation keeps a long page smooth, but the payload still grows with every row.
- Use `deferLoading()` on tables that are slow to query so the page shell appears first.
- Keep per-item Repeater schemas small; each item ships its own resolved schema so closures can see its state.
- Lazy-load heavy custom dependencies (see `lazy.ts` in `@alfakit/core`) rather than adding them to the entry chunk.
