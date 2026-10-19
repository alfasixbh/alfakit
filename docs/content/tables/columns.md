---
title: Columns
description: Column types, sorting, searching and inline editing.
---

# Columns

```php
TextColumn::make('title')->searchable()->sortable()->wrap()->limit(60)->description(fn ($record) => $record->excerpt);
TextColumn::make('author.name')->sortable()->searchable();            // relationship (BelongsTo/HasOne sort, whereHas search)
TextColumn::make('tags.name')->badge()->color('info');                  // many-relationship → list of badges
TextColumn::make('status')->badge()->color(fn (string $state) => match ($state) { 'published' => 'success', default => 'gray' })->icon('circle');
TextColumn::make('price')->money('USD', inMinorUnits: true)->alignEnd(); // 1999 → $19.99
TextColumn::make('views')->numeric()->sortable();
TextColumn::make('published_at')->dateTime('M j, Y H:i')->since()->toggleable(isToggledHiddenByDefault: true);
TextColumn::make('bio')->markdown()->lineClamp(2)->copyable();
IconColumn::make('is_active')->boolean()->trueIcon('check')->falseIcon('x')->trueColor('success');
ImageColumn::make('cover')->circular()->size(40)->stacked()->limit(3)->disk('public')->defaultImageUrl('/placeholder.png')
    ->alt(fn (Post $record): string => "Cover of {$record->title}");
ColorColumn::make('brand_color')->copyable();
```

## Common options

`label()`, `sortable()`, `searchable()`, `toggleable()`, `alignment()` / `alignStart()` / `alignCenter()` / `alignEnd()`, `verticalAlignment()` / `verticallyAlignStart()` / `verticallyAlignCenter()` / `verticallyAlignEnd()`, `headerTooltip()`, `disabledClick()`, `width()`, `grow(false)`, `wrapHeader()`, `visibleFrom()` / `hiddenFrom()`, `url()`, `openUrlInNewTab()`, `action('actionName')`, `tooltip()`, `hidden()`, `getStateUsing()`, `state()`, `default()`, `placeholder('—')`, `extraAttributes()`, `extraCellAttributes()`, `extraHeaderAttributes()`.

Set defaults for every column of a type with `configureUsing()`, e.g. in a service provider: `TextColumn::configureUsing(fn (TextColumn $column) => $column->placeholder('—'))`. It runs when the column is made, so calls in the table still override it.

`headerTooltip('Stock keeping unit')` adds a tooltip (also read to screen readers) to the header. `disabledClick()` makes a cell inert: clicking it neither follows the row's URL / record action nor the column's own `url()` / `action()`.

Column closures can inject `$rowLoop`, the row's loop variable as in a Blade `@foreach` (`index`, `iteration`, `remaining`, `count`, `first`, `last`, `odd`, `even`), and `$index`: `TextColumn::make('#')->state(fn (stdClass $rowLoop) => $rowLoop->iteration)`. Relationship lists inject `$relatedRecord` (see below).

### Breakpoints

`visibleFrom('md')` shows a column only from that breakpoint up and `hiddenFrom('lg')` hides it from that breakpoint up (`sm`, `md`, `lg`, `xl`, `2xl`; both accept closures). The column stays part of the table: it is still searchable and sortable, listed in the column manager and included in exports; only its header and cells (or its block in a [content layout](layout)) are hidden by the renderer's responsive classes, so the markup is the same on the server and in every viewport. For a column that should not exist at all, use `hidden()` or `toggleable()`.

```php
TextColumn::make('email')->visibleFrom('md');
TextColumn::make('phone')->hiddenFrom('xl');
```

### Sorting

`sortable()` sorts by the column name; pass columns (`sortable(['first_name', 'last_name'])`) or a closure (`sortable(query: fn (Builder $query, string $direction) => …)`). Dotted names sort through BelongsTo/HasOne subqueries. While the sorted records load, the clicked header shows a spinner in place of its sort icon (`[data-slot="table-sort-spinner"]`, with `aria-busy` on the button).

### Searching

`searchable()` joins the global search box; `searchable(isIndividual: true)` adds a per-column input; `searchable(['title', 'excerpt'])` searches several columns; `searchable(query: fn (Builder $query, string $search) => …)` is fully custom. `forceSearchCaseInsensitive()` on MySQL/SQLite.

The table search splits the term into words and every word must match some column. Table-level options:

```php
$table
    ->splitSearchTerms(false)            // search the whole phrase (exact, faster on large tables)
    ->splitIndividualSearchTerms()       // split per-column searches into words too (off by default)
    ->searchable(['id', 'author.email']) // also search attributes that are not shown as columns
    ->searchUsing(fn (Builder $query, string $search) => $query->whereKey(Post::search($search)->keys())); // e.g. Laravel Scout
```

A column's `splitIndividualSearchTerms(true|false)` overrides the table for its own input. `searchable(true)` shows the search box even without searchable columns, `searchable(false)` hides it. `searchUsing()` replaces the column search entirely (column searches still apply) and shows the search box.

### Formatting (TextColumn)

Dates, numbers and money follow the user's language, currency and timezone. See [Currencies, numbers and dates](../localization/currencies-and-numbers).

`formatStateUsing()`, `date()`, `dateTime()`, `time()`, `since()`, `timezone()`, `money(currency, divideBy:, locale:, inMinorUnits:, decimalPlaces:)`, `numeric(decimalPlaces:, decimalSeparator:, thousandsSeparator:, maxDecimalPlaces:, locale:)`, `limit()`, `words()`, `prefix()`, `suffix()`, `markdown()`, `html(sanitize: true)`, `listWithLineBreaks()`, `bulleted()`, `separator()`, `limitList()`, `boolean()`, `badge()`, `size()`, `weight()`, `fontFamily()`, `lineClamp()`, `copyable()`, `copyMessage()`, `copyMessageDuration()`, `wrap()`, `iconPosition()`, `iconColor()`, `description(position: 'above' | 'below')`.

```php
TextColumn::make('published_at')->dateTime()->timezone('Asia/Dubai');   // any order; default: the panel timezone
TextColumn::make('price')->numeric(decimalPlaces: 2);                   // 1,234.50 in the user's locale
TextColumn::make('price')->numeric(decimalPlaces: 2, decimalSeparator: ',', thousandsSeparator: '.'); // fixed separators: 1.234,50
TextColumn::make('ratio')->numeric(maxDecimalPlaces: 3);                // 0.125, 0.5 (no trailing zeros)
TextColumn::make('total')->money('EUR', decimalPlaces: 0);              // €1,235
TextColumn::make('sku')->copyable()->copyMessage('SKU copied')->copyMessageDuration(3000);
TextColumn::make('title')->description(fn (Post $record) => $record->category, position: 'above');
```

`numeric(2, 'de')` (a locale as the second argument) still reads as `locale`. `locale` may also be a backed enum whose value is a locale code: `numeric(2, locale: AppLocale::German)`. `numeric(decimalPlaces: 2)` always shows two decimals; use `maxDecimalPlaces` to round without padding.

More date formats: `isoDate()`, `isoDateTime()`, `isoTime()` take Carbon `isoFormat()` patterns (`'L'`, `'LLL'`, `'LT'` by default, `'dddd D MMMM'`…); tooltips with the date in another format: `dateTooltip()`, `dateTimeTooltip()`, `timeTooltip()`, `isoDateTooltip()`, `isoDateTimeTooltip()`, `isoTimeTooltip()`, `sinceTooltip()` (an explicit `tooltip()` wins). All are formatted in PHP in the user's locale and the panel's timezone (or the `timezone` argument).

`limitList(3)->expandableLimitedList()` shows the first items with a "+N more" button that expands the list (every item is sent). `getCharacterLimit()` returns the `limit()` length, to show the full text only when it was cut:

```php
TextColumn::make('title')->limit(50)
    ->tooltip(fn (TextColumn $column): ?string => mb_strlen((string) $column->getState()) > $column->getCharacterLimit() ? $column->getState() : null);
```

### Icon, image and color columns

```php
IconColumn::make('is_featured')->boolean()->size('lg');                      // xs, sm, md (default), lg, xl
IconColumn::make('features')->icon(fn (string $state) => "feature-{$state}")->wrap(); // a list state shows one icon per item
ImageColumn::make('gallery')->disk('s3')->visibility('private')            // private: temporary URLs (`temporaryUrlExpiry()`, default config('alfakit.temporary_file_url_expiry_minutes'))
    ->square()->stacked()->limit(3)->limitedRemainingText(size: 'lg')->wrap()
    ->checkFileExistence();                                                  // skip paths missing on the disk
ColorColumn::make('palette')->copyable()->copyMessage('Copied')->copyMessageDuration(1000)->wrap();
```

- `IconColumn`: a list state (JSON array, collection, `tags.icon`) renders one icon per item; `icon()` / `color()` closures and `trueIcon()` / `falseIcon()` / `trueColor()` / `falseColor()` run once per item with `$state`. `wrap()` lets the icons wrap onto more lines.
- `ImageColumn`: `circular()` / `square()`, `size()` / `height()` / `width()`, `visibility('public' | 'private')`, `limit()` with `limitedRemainingText(size: 'xs' | 'sm' | 'md' | 'lg')` for the "+N", `wrap()` for several rows, and `checkFileExistence()` (one `exists()` call per image, so leave it off for large tables on remote disks).
- `ColorColumn`: `copyable()` turns each swatch into a copy button; the confirmation uses `copyMessage()` (default "Copied", read to screen readers) for `copyMessageDuration()` milliseconds (1500 by default). `wrap()` lets swatches wrap.

`ImageColumn` (and `ImageEntry`) take `ring(0–8)` (pixels around stacked images, 2 by default), `overlap(0–8)` (quarter rems, 2 by default) and `extraImgAttributes(['loading' => 'lazy'])` for every `<img>` (`class` is merged; per record on columns).

`html()` and `markdown()` sanitise the state on the server (scripts, event handlers and `javascript:` links are removed). An `HtmlString` returned from `formatStateUsing()` is trusted and sent as-is; `html(sanitize: false)` turns sanitising off for content no user can write. `url()` only keeps `http(s)`, `mailto`, `tel` and relative URLs. See [Security](../advanced/security#html-output).

### Relationship lists

For `tags.name` and other *-to-many paths, `color()`, `icon()` and `url()` closures run once per item, with `$relatedRecord` (the `Tag`) and `$state` (the item), so each badge can have its own colour, icon or link: `TextColumn::make('tags.name')->badge()->color(fn (Tag $relatedRecord) => $relatedRecord->color)`. Values that agree for every item are sent once. `formatStateUsing()`, `limit()`, `words()`, `prefix()` / `suffix()` and `timezone()` closures receive `$relatedRecord` per item as well, and so do `IconColumn::icon()` / `color()` for a list of icons.

### Enums

A state that is an enum case (the model casts the attribute) shows the enum's `HasLabel` label, `HasColor` colour and `HasIcon` icon; `IconColumn` takes the icon and colour too. For a stored backing value without a cast, name the enum: `TextColumn::make('meta.status')->badge()->enum(OrderStatus::class)`. Explicit `color()`, `icon()` and `formatStateUsing()` win, and their closures receive the case. See [Enums](../advanced/enums).

## Inline-editable columns

```php
ToggleColumn::make('is_featured')->onColor('success');
CheckboxColumn::make('approved');
SelectColumn::make('status')->options([...])->selectablePlaceholder(false);
TextInputColumn::make('sort')->type('number')->rules(['integer', 'min:0']);
TextInputColumn::make('price')->type('number')->step('0.01')->inputMode('decimal')->prefix('$')->suffix(fn (Product $record) => $record->unit);
ToggleColumn::make('is_active')->onIcon('check')->offIcon('x')->onColor('success')->offColor('danger');
```

`TextInputColumn` also takes `prefix()` / `suffix()` (text beside the input; closures receive `$record`), `prefixIcon()`, `prefixIconColor()`, `suffixIcon()` and `suffixIconColor()` (icons inside the input, on the start / end side), `inputMode()` and `step()`. `ToggleColumn` takes `onIcon()` / `offIcon()` (shown next to the switch) and `onColor()` / `offColor()`.

Edits post to the table cell endpoint and reload the table. Hooks: `updateStateUsing()`, `beforeStateUpdated()`, `afterStateUpdated()`, `rules()`, `disabled()`.

### Select column options

```php
SelectColumn::make('author_id')
    ->native(false)                       // a combobox instead of the browser select
    ->optionsRelationship(name: 'author', titleAttribute: 'name')
    ->searchableOptions(['name', 'email']) // search input; relationship columns to search
    ->optionsLimit(20);                    // options listed at once (50 by default)

SelectColumn::make('parent_id')
    ->optionsRelationship('parent', 'name', ignoreRecord: true, modifyQueryUsing: fn (Builder $query) => $query->whereNull('archived_at'));

SelectColumn::make('technology')
    ->options(['tailwind' => '<span class="text-sky-600">Tailwind</span>', 'laravel' => 'Laravel'])
    ->native(false)
    ->allowOptionsHtml();
```

- A searchable relationship column is searched on the server as the user types (through the table's filters schema and the schema options endpoint); `preloadOptions()` sends the first `optionsLimit()` options with the table instead. A non-searchable relationship column lists every related record.
- `getOptionsSearchResultsUsing(fn (string $search): array => …)` with `getOptionLabelUsing(fn ($value): ?string => …)` searches any source; `getOptionLabelFromRecordUsing(fn (User $record) => …)` builds relationship labels.
- Saved values are validated against the same query that lists the options (tenant scope and `modifyQueryUsing` included), `ignoreRecord` refuses the record's own key, and custom options are checked with `getOptionLabelUsing()`.
- `allowOptionsHtml()` renders labels as HTML in the combobox; they are sanitised on the server with `Support\Html::sanitize()`. A native select shows them as plain text.
- `native()`, `searchableOptions()`, `optionsLimit()` and `allowOptionsHtml()` accept closures.
- `optionsSearchDebounce(500)` sets how long the combobox waits after typing before it searches server options (300 ms by default).
- `wrapOptionLabels(false)` truncates long option labels in the combobox instead of wrapping them (they wrap by default).
- `rememberOptions()` is accepted for Filament compatibility and does nothing: a column's options are always sent once per table page as part of the column, never per cell, so record-specific options are not supported either way.
- The combobox's messages, like the `Select` field's: `searchPrompt('Search authors')` (the search input's prompt), `loadingMessage()` (loading server options), `searchingMessage()` (loading search results), `noSearchResultsMessage()` and `noOptionsMessage()` (no options at all). Each accepts a closure; without them the renderer shows its translated defaults. A native select has no use for them and leaves them out.

## Relationship aggregates

`counts()`, `exists()`, `avg()`, `sum()`, `min()` and `max()` add `withCount()`-style sub-selects to the query: `TextColumn::make('comments_count')->counts('comments')->sortable()->searchable()`. Sorting uses the alias; searching runs against the same sub-select. See [Pagination and data](records#relationship-aggregates).

## View columns

`ViewColumn` renders a cell with a frontend component the application registered with `createAlfakit({ components: { StatusSwitcher } })`:

```php
ViewColumn::make('status')
    ->view('StatusSwitcher')
    ->viewData(fn (Post $record): array => ['canPublish' => auth()->user()->can('publish', $record)]);
```

The component receives the cell's `state`, the `viewData()` props (a closure is evaluated per record, with `$record` and `$state`) and the usual cell props (`column`, `cell`, `recordKey`, `token`, `component`). `component()` and `props()` are aliases of `view()` and `viewData()`. Everything the component shows must come from the server: compute it in `viewData()`, and post changes through an action or your own route. An unregistered name renders a "Component … is not registered." notice.

A custom column class can send per-record data to its renderer by overriding `getCellProps()` (static, per-column data goes in `getSchemaProps()`):

```php
namespace App\Alfakit\Tables\Columns;

use AlfaSix\Alfakit\Tables\Columns\Column;

class ProgressColumn extends Column
{
    protected function getCellProps(): array
    {
        return ['percent' => min(100, (int) $this->getState())]; // runs once per record; $this->getRecord() is set
    }
}
```

The renderer receives these keys on `cell` (next to `cell.state`), and the schema props on `column`.

The cell component of a custom column lives in `resources/js/alfakit/columns/{Class}.*` and registers itself as `column:{Class}` (`php artisan make:alfakit-column` writes both halves; `ColumnProps<TColumn, TCell>` types it). To replace a built-in column type's renderer everywhere, add `columns/TextColumn.tsx` or register a component as `column:<type>` (see [Bring your own components](../advanced/custom-components)).

## Layouts and groups

`Split`, `Stack`, `Panel` and `Grid` layouts, `contentGrid()` card grids, `ColumnGroup` headers and user column reordering are covered in [Column layouts](layout).
