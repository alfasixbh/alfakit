---
title: Forms
description: How schemas, state and submission work.
---

# Forms

Forms are **schemas**: a tree of components (fields and layout containers) with shared state, a record and an operation (`create`, `edit`, `view`).

```php
public static function form(Schema $schema): Schema
{
    return $schema->components([
        Section::make('Details')->schema([
            TextInput::make('title')->required(),
            Select::make('status')->options([...]),
        ])->columns(2),
    ]);
}
```

## Lifecycle

1. **Hydration** — `Schema::fill()` loads defaults (create) or the record's attributes (edit). Only the attributes that fields read are sent to the browser. Hooks: `default()`, `formatStateUsing()`, `afterStateHydrated()`, relationship loading.
2. **Editing** — the renderer keeps state in a `FormStore`. Fields marked `live()` send the whole state to the server, which re-evaluates closures and `afterStateUpdated()` and returns the refreshed schema. See [Reactivity](reactivity).
3. **Submission** — the form's buttons are actions. The action endpoint rebuilds the schema, calls `validate()` and runs the page's handler (`create()` / `save()`), inside a transaction, then saves relationships.
4. **Dehydration** — `getState()` returns only `dehydrated()` fields, after `dehydrateStateUsing()` / `mutateDehydratedStateUsing()` and type casting.

## Saving and validating fields

```php
TextInput::make('password_confirmation')->password()->required()->saved(false);
TextInput::make('code')->disabled()->saved();               // save the server value of a disabled field
TextInput::make('notes')->dehydrated(false)->validatedWhenNotDehydrated(false);
```

- `saved(false)` keeps the field validated and its value in the form state (`$get()`, live updates), but leaves it out of `getState()` and does not save its relationship. `disabled()->saved()` saves a disabled field's server value, like `disabled()->dehydrated()`.
- Fields that are not dehydrated (`dehydrated(false)`, `saved(false)`) are still validated; `validatedWhenNotDehydrated(false)` skips their rules.
- `saveRelationshipsWhenHidden()` marks a relationship field (BelongsToMany `Select` or `CheckboxList`) to be saved even while it is hidden (`shouldSaveRelationships()`).

## Using schemas outside resources

Any [page](../pages/custom-pages) can define `form(Schema $schema)` and submit it with actions from `getFormActions()`. Actions can also carry their own forms — see [Action modals](../actions/modals).

Build a schema by hand when needed:

```php
$schema = Schema::make()->record($post)->operation('edit')->components([...]);
$schema->fill();
$data = $schema->validate();     // throws ValidationException
$schema->saveRelationships();
```

## Columns

The root schema is a 2-column grid on large screens. Change it with `$schema->columns(3)` or responsive maps `['default' => 1, 'md' => 2, 'xl' => 4]`. Components span with `columnSpan(2)` (from `lg` up, like Filament), `columnSpanFull()` or responsive maps; see [Column span and start](layout#column-span-and-start).

## Global defaults

```php
TextInput::configureUsing(fn (TextInput $input) => $input->maxLength(255));
```
