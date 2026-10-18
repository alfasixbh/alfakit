---
title: Modal table select
description: Pick records from a searchable, filterable table in a modal.
---

# ModalTableSelect

`ModalTableSelect` lets users pick one or more records from a full table in a modal: search, filters, sorting and pagination all work, and the field stores the selected keys. Use it instead of a `Select` when users need more than a name to find the right record.

```php
use AlfaSix\Alfakit\Forms\Components\ModalTableSelect;

ModalTableSelect::make('category_id')
    ->relationship('category', 'name')
    ->tableConfiguration(CategoriesTable::class);

ModalTableSelect::make('products')
    ->relationship('products', 'name')
    ->multiple()
    ->maxItems(5)
    ->tableConfiguration(ProductsTable::class);
```

`tableConfiguration()` takes a resource class (its `table()` columns and filters are reused), or any class with a static `configure(Table $table): Table` method:

```php
ModalTableSelect::make('category_id')
    ->relationship('category', 'name')
    ->tableConfiguration(CategoryResource::class);
```

```php
class CategoriesTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')->searchable()->sortable(),
                TextColumn::make('slug'),
            ])
            ->filters([TernaryFilter::make('is_visible')])
            ->modifyQueryUsing(fn (Builder $query) => $query->where('is_archived', false));
    }
}
```

It can also be a closure receiving `$table` (and the usual injections, such as `$get`):

```php
ModalTableSelect::make('author_id')
    ->relationship('author', 'name')
    ->tableConfiguration(fn (Table $table, Get $get) => $table
        ->columns([TextColumn::make('name')->searchable(), TextColumn::make('email')])
        ->modifyQueryUsing(fn (Builder $query) => $query->where('team_id', $get('team_id'))));
```

### Passing form values to the table

`tableArguments()` hands values from the form to the table configuration. A closure configuration receives them as `$arguments`; a configuration class reads them from the field, which is the table's context (`$table->getContext()->getTableArguments()`):

```php
ModalTableSelect::make('product_id')
    ->relationship('product', 'name')
    ->tableArguments(fn (Get $get): array => ['category_id' => $get('category_id')])
    ->tableConfiguration(fn (Table $table, array $arguments) => $table
        ->columns([TextColumn::make('name')->searchable()])
        ->modifyQueryUsing(fn (Builder $query) => $query->when(
            $arguments['category_id'] ?? null,
            fn (Builder $query, $category) => $query->where('category_id', $category),
        )));
```

Arguments only change what the picker shows. To restrict what may be saved, scope the `relationship()` query (its `modifyQueryUsing` argument): submitted keys are validated against it.

## Records and relationships

- With `relationship()`, the table lists the related model's records (`BelongsTo` for a single value, `BelongsToMany` with `multiple()`), limited to the current tenant. `BelongsToMany` selections are synced when the form is saved, like a multiple `Select`.
- Without a relationship, the table configuration must set a `query()` (a resource class lists its model); the current tenant scope is applied to it. Use `recordTitleAttribute('title')` (or `getOptionLabelFromRecordUsing()`) for the labels of selected records.
- The table configuration's `modifyQueryUsing()` narrows the list. Its `checkIfRecordIsSelectableUsing()` disables rows.
- Inside `Repeater` items (also `relationship()` repeaters such as order lines), each item has its own picker: the browser sends the form state with the request, so items added in the browser work before they are saved, and `live()`/`afterStateUpdated()` on the picker run for new items too.

In the picker, record actions, header and bulk actions, record links and reordering are switched off, and editable columns (`ToggleColumn`, `TextInputColumn`, …) render disabled: selecting records is the only interaction.

## Options

| Method                            | Effect                                                       |
| --------------------------------- | ------------------------------------------------------------ |
| `multiple()`                      | Select several records; the state is a list of keys.         |
| `minItems()`, `maxItems()`        | Bounds for `multiple()`; the picker stops at `maxItems()`.   |
| `modalHeading()`                  | Heading of the modal (default "Select {label}").             |
| `selectActionLabel()`             | Label of the button that opens the modal (default "Select"). |
| `selectAction()`                  | Customise the button and its modal (see below).              |
| `tableArguments()`                | Values passed to the table configuration (see above).        |
| `getOptionLabelFromRecordUsing()` | Label of a selected record.                                  |
| `placeholder()`                   | Text shown when nothing is selected.                         |

`selectAction()` receives the button as an `Action`; its label, icon, modal heading, modal description, modal width and submit label are used:

```php
use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Support\Enums\Width;

ModalTableSelect::make('category_id')
    ->relationship('category', 'name')
    ->tableConfiguration(CategoriesTable::class)
    ->selectAction(fn (Action $action) => $action
        ->label('Select a category')
        ->icon('search')
        ->modalHeading('Search categories')
        ->modalDescription('Only visible categories are listed.')
        ->modalSubmitActionLabel('Confirm selection')
        ->modalWidth(Width::FiveExtraLarge));
```

## Security

The modal asks the select options endpoint (`/_alfakit/schema/options?table=1`) for the table, so it is authorised from the page's context token like every field request, and hidden, disabled or read-only fields refuse it. Submitted keys are validated against the same query the picker lists (relationship, `modifyQueryUsing`, tenant), so a record the user can't see can't be selected by editing the request.

Searchable select filters inside the picker table (e.g. `SelectFilter::make('author')->relationship('author', 'name')->searchable()`) load their options through the same endpoint with `pickerFilters=<field path>`: the server resolves the picker table from the field, so the options are tenant-scoped and limited to what the picker lists.
