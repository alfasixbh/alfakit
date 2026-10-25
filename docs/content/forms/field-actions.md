---
title: Field actions
description: Prefix, suffix and hint actions on fields and entries, and creating or editing a select's options in a modal.
---

# Field actions

Fields and infolist entries can carry their own [actions](../actions/overview): buttons before the control (`prefixActions()`), after it (`suffixActions()`) and next to the label (`hintActions()`). They are ordinary `Action`s (modals, forms, confirmation, `authorize()`, notifications) that run in the field's context.

```php
use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;

TextInput::make('slug')
    ->suffixAction(
        Action::make('generate')
            ->icon('sparkles')
            ->iconButton()
            ->action(fn (Get $get, Set $set) => $set('slug', str($get('title'))->slug()->toString())),
    )
    ->hintAction(Action::make('help')->label('Format')->url('https://example.com/slugs', shouldOpenInNewTab: true));

TextInput::make('vat_number')
    ->prefixActions([
        Action::make('lookup')
            ->icon('search')
            ->schema([TextInput::make('company')->required()])
            ->action(fn (array $data, Set $set) => $set('vat_number', Vat::lookup($data['company']))),
    ]);
```

`prefixAction()`, `suffixAction()` and `hintAction()` add one action; the plural methods add several (an array, or a closure returning one).

## What a field action receives

The renderer sends the form's current state with the action. On the server, the action's closures receive:

| Parameter       | Value                                                              |
| --------------- | ------------------------------------------------------------------ |
| `$component`    | The field (or entry) the action belongs to                         |
| `$state`        | The field's current state                                          |
| `$get` / `$set` | Read and write the **form** the field is in, relative to the field |
| `$data`         | The action's own modal form data                                   |
| `$record`       | The form's record (null on create pages)                           |
| `$arguments`    | Arguments passed with the action                                   |

After the action ran, the response carries the re-rendered form, so whatever `$set()` changed shows up in the browser without a page visit. With [partial refreshes](reactivity#partial-refreshes) only the changed components come back.

Actions of infolist entries work the same way (`TextEntry::make('email')->hintAction(...)`), with `$record` being the infolist's record.

## Security

Field actions go through the action endpoint like every other action, addressed by the schema and the field (`field:{schema}::{key}`):

- the field must exist and be visible for the current state (hidden fields, or fields in hidden sections, can't run actions);
- a disabled field shows its actions disabled, and the endpoint refuses to run them;
- the action must be one the field defines, and its own `visible()`, `disabled()` and `authorize()` apply.

## Creating and editing select options

A relationship Select can create the related record in a modal and select it, and edit the selected record:

```php
Select::make('author_id')
    ->relationship('author', 'name')
    ->searchable()
    ->createOptionForm([
        TextInput::make('name')->required(),
        TextInput::make('email')->email()->required()->unique('users', 'email'),
    ])
    ->editOptionForm([
        TextInput::make('name')->required(),
    ]);
```

The create modal saves exactly the fields of `createOptionForm()` with `create()`, so the related model must accept them (fillable) and every other required column needs a default. A new Laravel app's `users` table requires a `password`, so for authors add `createOptionUsing()` (see below) to set one, or the create fails with "NOT NULL constraint failed: users.password".

The buttons are suffix actions named `createOption` and `editOption`. The create modal validates its form, creates the related record on the server (owned by the current tenant on tenant panels), saves the form's own relationships and selects the new record; on a `multiple()` select it is added to the selection. The edit button shows for a single select with a value, fills the modal from the selected record and saves it.

Both check the related model's policy: creating needs `create`, editing needs `update` on the selected record (missing policies or methods allow it, as for [resources](../resources/authorization)). The record being edited is looked up through the select's own query, so `modifyQueryUsing` constraints and the tenant scope apply; a value outside that query can't be edited. Neither button is shown on a disabled or read-only select.

Customise them:

```php
Select::make('author_id')
    ->relationship('author', 'name')
    ->createOptionForm([...])
    ->createOptionModalHeading('New author')
    ->createOptionAction(fn (Action $action) => $action->modalWidth('lg')->slideOver())
    ->createOptionUsing(function (array $data): int {
        return User::create([...$data, 'password' => Str::random(32)])->getKey();
    })
    ->editOptionForm([...])
    ->editOptionModalHeading('Rename author')
    ->updateOptionUsing(fn (array $data, User $record) => $record->update($data));
```

- `createOptionUsing()` receives `$data` (and `$schema`) and returns the new option's key. Selects without a relationship need it.
- `updateOptionUsing()` receives `$data`, `$record` and `$schema`. Selects without a relationship need it.
- `createOptionAction()` / `editOptionAction()` receive the `Action` to change anything about it (heading, width, icon, `authorize()`).
