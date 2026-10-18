---
title: Reactivity
description: live fields, afterStateUpdated, Get and Set.
---

# Reactivity

AlfaKit forms are reactive **on the server**. Mark a field `live()` and every change (debounced) posts the full form state to the schema refresh endpoint. The server rebuilds the schema, runs `afterStateUpdated()` hooks, re-evaluates closures (`hidden`, `disabled`, `options`, `required`, …) and returns the updated components and state. The renderer merges them, keeping anything you typed meanwhile.

```php
TextInput::make('title')
    ->live(onBlur: true)
    ->afterStateUpdated(fn (Set $set, ?string $state) => $set('slug', str($state ?? '')->slug()->toString())),

Select::make('type')->options([...])->live(),

TextInput::make('company')->required()->visible(fn (Get $get) => $get('type') === 'company'),

Select::make('city_id')->options(fn (Get $get) => City::where('country_id', $get('country_id'))->pluck('name', 'id')),
```

- `live()` — refresh after each change. Fields you type or drag in (`TextInput`, `Textarea`, editors, `KeyValue`, `ColorPicker`, `Slider`, custom fields) wait 150 ms after the last change, like Livewire's `wire:model.live`, so fast typing sends one request; fields that change once per choice (`Select`, `Toggle`, `Checkbox`, `CheckboxList`, `Radio`, `ToggleButtons`, date and time pickers, `FileUpload`, `IconPicker`, `Repeater`, `Builder`) refresh at once. Set your own with `live(debounce: 500)` in milliseconds, or a duration string: `live(debounce: '750ms')`, `live(debounce: '1s')`. A custom field picks its default by overriding `getDefaultLiveDebounce(): int`. A newer change cancels a refresh that is still in flight, so typing never queues up requests.
- `live(onBlur: true)` — refresh when the field loses focus.
- `afterStateUpdated()` implies `live()`; it keeps the options of an earlier `live(onBlur: true)` or `live(debounce: …)` call.

Type a title and leave the field: the slug follows. Pick "Video" to reveal the URL field.

```alfakit-example name="live-fields"

```

## Get and Set

`$get('field')` and `$set('field', $value)` resolve paths from the component's container, as in Filament: a field's siblings, or a layout component's fellow children. Inside a repeater item that is the item (`items.0`), for fields and layout components (`Text`, `Section`, `Group`…) alike. Each leading `../` goes one level up (`../../total` from a repeater item reaches the root), and `isAbsolute: true` takes a path from the root. A field named with dots (`TextInput::make('settings.url')`) sits in its container like any other field, so its siblings are read by their full name: `$get('settings.mode')`.

```php
Repeater::make('items')->schema([
    Select::make('product_id')->live()->afterStateUpdated(fn (Set $set, $state) => $set('price', Product::find($state)?->price)),
    TextInput::make('price')->numeric(),
    TextInput::make('qty')->live()->afterStateUpdated(fn (Get $get, Set $set) => $set('../../total', collect($get('../../items'))->sum(fn ($i) => $i['price'] * $i['qty']))),
]);
```

`$set()` doesn't run the target field's `afterStateUpdated()` hooks. Pass `shouldCallUpdatedHooks: true` when it should, e.g. so a computed field updates the fields that depend on it:

```php
Select::make('country')->live()->afterStateUpdated(fn (Set $set) => $set('region', null, shouldCallUpdatedHooks: true));
```

### Typed accessors

Form state from the browser is mostly strings. The typed accessors cast the value the way Filament's do; with `isNullable: true` a blank value returns `null` instead of the cast empty value:

```php
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;

TextInput::make('total')->visible(fn (Get $get): bool => $get->integer('qty') > 10);

$get->string('name');                    // '' when blank
$get->string('name', isNullable: true);  // null when blank
$get->integer('qty');                    // int
$get->float('price');                    // float
$get->boolean('is_paid');                // bool ("false" and "0" are false)
$get->array('tags');                     // array ([] when missing)
$get->date('published_at');              // Carbon (now when blank, unless isNullable)
$get->enum('status', Status::class);     // Status case or null
$get->filled('coupon');                  // bool
$get->blank('coupon');                   // bool
```

Every accessor takes `isAbsolute: true` like `$get()` itself.

### `$rawState`

Closures can ask for `$rawState` next to `$state`. On fields it is the value exactly as stored in the form state (the same as `$state`, except in closures such as `dehydrateStateUsing()` that receive a transformed `$state`). On entries it is the record's attribute before Eloquent casts, `getStateUsing()` and `default()`:

```php
// `status` is cast to the Status enum; $rawState is the stored string.
TextEntry::make('status')->formatStateUsing(fn (Status $state, string $rawState): string => "{$state->name} ({$rawState})");
```

## Partial refreshes

Forms with live fields (or [field actions](field-actions)) carry a fingerprint of every component. The renderer sends the fingerprints back with a refresh, and the server answers with only the components whose schema changed (as patches at their place in the tree) and the top-level state keys that differ from what was sent. The renderers replace just those components; everything else keeps its identity and isn't re-rendered, so open dropdowns, rich editors and focus stay as they are.

When the structure changed at the top level (a component appeared or disappeared there) the server sends the whole form, and when a patch doesn't fit the tree the browser holds, the renderer asks for the whole form again. Nothing needs configuring.

### Limiting what a field re-renders

The diff already sends only what changed, so these are rarely needed. They help when a live field changes something that is expensive to re-send, or that the browser should keep as it is until a later refresh:

```php
TextInput::make('quantity')
    ->live()
    ->afterStateUpdated(fn (Set $set, $state) => $set('total', $state * 10))
    ->partiallyRenderComponentsAfterStateUpdated(['total']);   // re-send only `total`

TextInput::make('search')->live()->partiallyRenderAfterStateUpdated();   // only the field itself

TextInput::make('notes')
    ->live(onBlur: true)
    ->afterStateUpdated(fn (Set $set) => $set('notes_changed', true))
    ->skipRenderAfterStateUpdated();                                     // no components at all
```

- `partiallyRenderComponentsAfterStateUpdated([...])` re-sends only the listed components, if they changed: names of fields next to this one, component keys or absolute state paths. A field inside a Repeater item re-sends its Repeater.
- `partiallyRenderAfterStateUpdated()` re-sends only the updated field.
- `skipRenderAfterStateUpdated()` re-sends nothing: `afterStateUpdated()` runs and the state it `$set()`s still reaches the browser. A field with this and no `afterStateUpdated()` hook makes no request at all.

State changes are always sent in full (top-level keys). Components that were left out keep their fingerprints in the browser, so the next normal refresh sends them if they still differ. The server still rebuilds the whole schema; these options limit the response, and the work the renderer does with it.

## Performance notes

A refresh sends the whole form state; the server still rebuilds and re-evaluates the whole schema, but only the changed parts travel back. Keep heavy option closures cheap (searchable selects fetch options on demand instead). Only mark fields `live()` when something depends on them.
