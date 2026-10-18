---
title: Filters
description: Select, ternary, trashed, custom and query builder filters; layouts, deferred filters and session persistence.
---

# Filters

```php
$table->filters([
    SelectFilter::make('status')->options(['draft' => 'Draft', 'published' => 'Published'])->multiple(),
    SelectFilter::make('category_id')->relationship('category', 'name')->searchable()->preload(),
    TernaryFilter::make('is_featured')->trueLabel('Featured')->falseLabel('Regular'),
    TernaryFilter::make('email_verified_at')->nullable(),
    TrashedFilter::make(),
    Filter::make('popular')->toggle()->query(fn (Builder $query) => $query->where('views', '>', 1000)),
    Filter::make('created')
        ->form([DatePicker::make('from'), DatePicker::make('until')])
        ->query(fn (Builder $query, array $data) => $query
            ->when($data['from'], fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($data['until'], fn ($q, $d) => $q->whereDate('created_at', '<=', $d)))
        ->indicateUsing(fn (array $data) => array_filter([$data['from'] ? "From {$data['from']}" : null, $data['until'] ? "Until {$data['until']}" : null])),
], layout: 'above-content');
```

A select filter and a ternary filter:

```alfakit-example name="table-filters"

```

## Filter types

- `Filter::make('popular')->query(...)` renders a checkbox (`->checkbox()`, the default) or a switch (`->toggle()`); a custom `schema()` replaces it.
- `SelectFilter` takes `options()` or `relationship()`, `multiple()`, `searchable()`, `preload()`, `native(false)` (a combobox instead of the browser select), `placeholder('Any status')` and `optionsLimit(20)` (options listed at once in a searchable select).
- `TernaryFilter` takes `trueLabel()`, `falseLabel()`, `placeholder('All posts')` (the "any" option), `nullable()` and `queries(true:, false:, blank:)`.
- Every filter takes `columnSpan()` / `columnSpanFull()` to span columns of the `filtersFormColumns()` grid (a number applies from `lg` up).

```php
SelectFilter::make('status')->options([...])->native(false)->placeholder('Any status')->columnSpan(2);
TernaryFilter::make('is_featured')->placeholder('All posts');
Filter::make('mine')->checkbox()->query(fn (Builder $query) => $query->whereBelongsTo(auth()->user()));
```

## Layouts

`dropdown` (default — a popover with a badge counting active filters), `above-content`, `above-content-collapsible`, `below-content`, `modal`, and the sidebar layouts `before-content`, `after-content`, `before-content-collapsible` and `after-content-collapsible`. Pass a string or the `FiltersLayout` enum:

```php
use AlfaSix\Alfakit\Tables\Enums\FiltersLayout;

$table->filters([...])->filtersLayout(FiltersLayout::Modal)->filtersFormColumns(2);
```

`->filtersFormColumns(3)` controls the grid. The modal layout opens the filters in a dialog with **Apply** and **Cancel**: changes only reach the table when applied, and cancelling (or closing the dialog) drops them.

The sidebar layouts (`FiltersLayout::BeforeContent`, `FiltersLayout::AfterContent`) put the filters beside the table from the `lg` breakpoint, at its start or end (they follow the reading direction, so `BeforeContent` is on the right in RTL), and above it on smaller screens. The `…Collapsible` variants start closed behind a **Filters** toggle.

### Sizing and layout of the form

```php
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Support\Enums\Width;

$table
    ->filters([...])
    ->filtersFormWidth(Width::Large)   // dropdown, modal or sidebar width ('xs' … '7xl')
    ->filtersFormMaxHeight('400px')    // the dropdown scrolls inside this height
    ->filtersFormSchema(fn (array $filters): array => [
        Section::make('Visibility')
            ->schema([$filters['is_featured'], $filters['published_at']])
            ->columns(2)
            ->columnSpanFull(),
        $filters['author'],
    ])
    ->hiddenFilterIndicators();        // no active filter badges above the table
```

`filtersFormSchema()` receives every filter's fields as a group keyed by the filter's name; place them in sections, grids or other layout components. A filter you leave out is not shown in the form (it still applies its default). `filtersFormMaxHeight()` only accepts a CSS length (`400px`, `30rem`, `60vh`). `hiddenFilterIndicators()` hides the badges; the filters button still counts the active filters.

## Deferred filters

By default every change reloads the table (after a short pause while typing). `->deferFilters()` waits for an **Apply** button instead, in every layout — useful for expensive queries and for the query builder:

```php
$table->filters([...])->deferFilters();
```

## Query builder

`QueryBuilder` lets users compose their own conditions from constraints you define, combine them with **and** / **or**, and nest them in groups:

```php
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\BooleanConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\DateConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\NumberConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\RelationshipConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\SelectConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\TextConstraint;

$table
    ->filters([
        QueryBuilder::make()
            ->constraints([
                TextConstraint::make('title'),
                TextConstraint::make('author.name')->label('Author'),
                NumberConstraint::make('rating')->integer(),
                DateConstraint::make('published_at'),
                BooleanConstraint::make('is_published'),
                SelectConstraint::make('status')
                    ->options(['draft' => 'Draft', 'published' => 'Published'])
                    ->multiple(),
                RelationshipConstraint::make('tags')->titleAttribute('name')->multiple(),
            ])
            ->maxDepth(2),
    ], layout: FiltersLayout::Modal)
    ->deferFilters();
```

| Constraint               | Operators                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `TextConstraint`         | contains, starts with, ends with, equals (each also negated), is filled, is blank — case-insensitive |
| `NumberConstraint`       | equals, does not equal, greater than, at least, less than, at most, is filled, is blank              |
| `DateConstraint`         | is after, is before, is on, is not on, is month, is year, is filled, is blank (panel timezone)       |
| `BooleanConstraint`      | is true, is false                                                                                    |
| `SelectConstraint`       | is, is not (one of the options; `->multiple()` for several), is filled, is blank                     |
| `RelationshipConstraint` | has (one of the related records), has at least N, has at most N, has none, has some                  |

- A constraint named with a dot (`author.name`), or given `->relationship('author', 'name')`, matches records with a related record that satisfies the rule.
- `->attribute('db_column')` reads another column than the constraint's name; `->label()` sets the name users see.
- `RelationshipConstraint` offers the related model's records as options (`->titleAttribute()`, `->multiple()`, `->searchable()`, `->optionsLimit(100)`, `->modifyOptionsQueryUsing(fn (Builder $query) => …)`), scoped to the current tenant. Filament's form works too: `->selectable(IsRelatedToOperator::make()->titleAttribute('name')->searchable()->multiple())` (`Operators\IsRelatedToOperator`, also with `optionsLimit()` and `modifyQueryUsing()`).
- `SelectConstraint::make('status')->options([...])->searchable()` (and a searchable relationship constraint) adds a search box that narrows the options as the user types. The search runs over the options sent with the table, so raise `optionsLimit()` for long relationship lists.
- `DateConstraint::make('published_at')->time()` makes "is after" / "is before" take a date and time (for datetime columns); "is on", "is month" and "is year" still compare whole days, months and years.
- "Is filled" / "is blank" are offered on every constraint; `->nullable(false)` removes them (Filament offers them only with `nullable()`, which AlfaKit accepts as a no-op).
- `->maxDepth(2)` sets how deeply groups nest (`0` allows only top-level rules); `->maxRules(50)` caps the number of rules.
- Each rule shows as an indicator ("Title contains “news”"); removing one clears the query builder.
- `->operators(['contains', 'equals'])` keeps (and orders) built-in operators; `->pushOperators([...])` / `->unshiftOperators([...])` add operators after / before them. A custom operator takes no value unless you give it an `input()`:

    ```php
    use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Operators\Operator;

    TextConstraint::make('email')->pushOperators([
        Operator::make('is_company')
            ->label('is a company address')
            ->query(fn (Builder $query, string $column) => $query->where($column, 'like', '%@acme.com')),
    ]);
    ```

    The closure gets the rule's scoped `$query` (the related records' query for relationship attributes), the qualified `$column` and the `$constraint`.

    `input('text' | 'number' | 'date' | 'datetime' | 'month' | 'year' | 'select')` adds a value input; the value is validated for that input on the server (a `select` value must be one of `options()`), passed as `$value`, and shown in the indicator. `validateValueUsing(fn ($value) => …)` checks it further (return null to ignore the rule):

    ```php
    TextConstraint::make('title')->pushOperators([
        Operator::make('longer_than')
            ->label('is longer than')
            ->input('number')
            ->validateValueUsing(fn (int|float $value): ?int => $value > 0 ? (int) $value : null)
            ->query(fn (Builder $query, string $column, int $value) => $query->whereRaw('char_length('.$column.') > ?', [$value])),
        Operator::make('in_region')
            ->label('is in region')
            ->input('select')
            ->options(['eu' => 'Europe', 'us' => 'United States'])
            ->query(fn (Builder $query, string $value) => $query->whereRelation('author', 'region', $value)),
    ]);
    ```

- `RelationshipConstraint::emptyable(false)` removes the "has none" / "has some" operators (AlfaKit offers them by default; Filament only with `emptyable()`).
- String keys group constraints under a label: `QueryBuilder::make()->constraints([TextConstraint::make('title'), 'Dates' => [DateConstraint::make('created_at'), DateConstraint::make('updated_at')]])`. The "add rule" menu shows ungrouped constraints first, then a labelled section per group, and a rule's field select uses option groups. `getConstraints()` stays flat; `getGroupedConstraints()` returns the groups.
- `QueryBuilder::make()->constraintPickerColumns(2)->constraintPickerWidth('lg')` lays the "add rule" menu out as a grid (a number or a breakpoint map) of the given width (`xs` … `7xl`). Each constraint's `icon()` shows next to its label in that menu.

The rule tree lives in the query string (`filters[queryBuilder][query][rules][0][constraint]=title&…`), so a built query can be bookmarked and shared. The server validates every rule against the constraints before it touches the query and ignores anything it does not recognise; see [Security](/docs/advanced/security#table-state).

## Remembering the table state

```php
$table
    ->persistFiltersInSession()
    ->persistSearchInSession()
    ->persistColumnSearchesInSession()
    ->persistSortInSession()
    ->persistRecordsPerPageInSession()
    ->persistColumnsInSession()   // toggled columns
    ->persistGroupInSession();    // grouping and its direction

// or everything at once, optionally switching single parts off again:
$table->persistInSession()->persistSortInSession(false);
```

The table keeps these values in the session, per panel, tenant, user and table, and restores them when the user comes back to the page without them in the URL. A value in the query string always wins, and clearing a value clears it in the session too (the renderers send cleared keys as empty values, `?search=`, `?columns=`). `persistInSession(false)` turns every part off; a per-part method called on the table wins over it. Nothing is persisted unless you ask for it (in Filament, records per page and toggled columns are persisted by default).

## Indicators

Active filters render as removable chips, followed by a **Remove all filters** button. Select and ternary filters generate labels automatically; custom filters use `indicateUsing()`, returning strings or `Indicator` objects:

```php
use AlfaSix\Alfakit\Tables\Filters\Indicator;

Filter::make('created_at')
    ->schema([DatePicker::make('from'), DatePicker::make('until')])
    ->indicateUsing(fn (array $data): array => array_filter([
        $data['from'] ?? null ? Indicator::make('Created from '.$data['from'])->removeField('from') : null,
        $data['until'] ?? null ? Indicator::make('Created until '.$data['until'])->removeField('until') : null,
    ]));
```

Removing a chip clears the whole filter, or only its `removeField()`; `removable(false)` hides the chip's remove button (and "Remove all" keeps that filter).

## Customising the filter buttons

Each button takes a closure that receives a prepared `Action`; label, icon, colour, variant (`button()`, `link()`, `iconButton()`, `outlined()`), size, badge, tooltip, extra attributes and `hidden()` are used, while the table still decides what the button does:

```php
use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Tables\Enums\FiltersResetActionPosition;

$table
    ->filtersTriggerAction(fn (Action $action) => $action->button()->label('Filter'))
    ->filtersApplyAction(fn (Action $action) => $action->link()->label('Save filters to table'))
    ->filtersResetAction(fn (Action $action) => $action->icon('x')->label('Clear filters'))
    ->filtersRemoveAllAction(fn (Action $action) => $action->tooltip('Clear filters'))
    ->filtersResetActionPosition(FiltersResetActionPosition::Header); // default: Footer, next to Apply
```

## Built-in fields, base query and empty options

- `modifyFormFieldUsing(fn (Select $field) => $field->native())` customises a filter's own field (the checkbox / toggle of `Filter`, the select of `SelectFilter` and `TernaryFilter`); it is not applied to a custom `schema()`.
- `baseQuery(fn (Builder $query, array $data) => …)` changes the table's base query itself, not the filter's `where` group, e.g. to remove a global scope. It runs on every request with the filter's `$data`, before the filters, and also when an action resolves its record, so records the filter shows can be acted on. Filters are controlled by the client: keep tenant and ownership restrictions in `getEloquentQuery()` / `modifyQueryUsing()`.
- `excludeWhenResolvingRecord()` is accepted for Filament compatibility: AlfaKit never applies a filter's `query()` when resolving a record (only `baseQuery()`).
- `SelectFilter::make('author')->relationship('author', 'name', hasEmptyOption: true)` (or `->hasEmptyOption()`) adds a "None" option matching records without a related record; rename it with `->emptyRelationshipOptionLabel('No author')`. With `multiple()`, "None" combines with other options (or).

## Defaults

`->default(['value' => 'published'])` pre-applies a filter until the user resets it.
