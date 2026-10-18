---
title: Validation
description: Rules, messages and attribute names.
---

# Validation

Fields contribute Laravel validation rules. Validation always runs on the server; the renderer displays errors next to fields (nested paths like `items.2.qty` are supported).

```php
TextInput::make('slug')->required()->alphaDash()->unique()->maxLength(100);
TextInput::make('email')->email()->rules(['email:rfc,dns'])->rule(new Lowercase);
TextInput::make('password')->password()->confirmed()->rule(Password::min(12));
Select::make('plan')->in(['free', 'pro']);
DatePicker::make('ends_at')->afterOrEqual('starts_at');
```

Built-in shortcuts: `required`, `nullable`, `unique`, `exists`, `in`, `notIn`, `regex`, `notRegex`, `confirmed`, `same`, `different`, `gt`, `gte`, `lt`, `lte`, `requiredWith`, `requiredWithAll`, `requiredWithout`, `requiredWithoutAll`, `requiredIf`, `requiredUnless`, `requiredIfAccepted`, `prohibited`, `prohibitedIf`, `prohibitedUnless`, `prohibits`, `filled`, `distinct`, `date`, `after`, `afterOrEqual`, `before`, `beforeOrEqual`, `string`, `alpha`, `alphaDash`, `alphaNum`, `ascii`, `activeUrl`, `hexColor`, `uuid`, `ulid`, `ip`, `ipv4`, `ipv6`, `macAddress`, `json`, `enum`, `multipleOf`, `startsWith`, `endsWith`, `doesntStartWith`, `doesntEndWith`, plus type rules added by each field (`email`, `numeric`, `integer`, `min`, `max`, `array`, `exists`, `in`, …).

Values passed to `in`, `notIn`, `startsWith`, `endsWith`, `doesntStartWith`, `doesntEndWith`, `requiredIf`, `requiredUnless`, `prohibitedIf` and `prohibitedUnless` are quoted, so they may contain commas and quotes.

Field references (`same`, `different`, `gt`/`gte`/`lt`/`lte`, `after`/`before`…, `requiredWith*`, `requiredIf`, `requiredIfAccepted`, `prohibitedIf`/`Unless`, `prohibits`) are resolved like `$get()`: inside a repeater item, `->gt('min')` compares with the same item's `min`. Values that aren't a field of the form (`->gt(0)`, `->after('today')`) are used as they are.

```php
TextInput::make('max_price')->numeric()->gt('min_price');
TextInput::make('code')->alphaNum()->notRegex('/^0/');
Select::make('status')->enum(Status::class);
TextInput::make('vat_number')->prohibitedUnless('type', 'company');
```

Submit the form below with invalid values: every rule runs on the server, and the messages appear under the fields.

```alfakit-example name="validation-rules"

```

## Unique and exists

`unique()` checks the form's model table and the field's name by default (`unique('users', 'email')` to choose). On edit forms the bound record is ignored, so saving an unchanged value passes; pass `ignoreRecord: false` to check every row, or `ignorable: $model` to ignore another record. The record is only ignored when the rule checks its own table. Inside a relationship repeater each item ignores its own related record.

On tenant-owned tables `unique()` and `exists()` are scoped to the current tenant (see [Tenancy](/docs/panels/tenancy)). Change the rule with `modifyRuleUsing: fn (Unique $rule) => $rule->where('active', true)`.

Laravel's `unique` and `exists` rules query the table, so soft-deleted rows count. `scopedUnique()` and `scopedExists()` query through the Eloquent model instead: its global scopes apply (soft deletes, your own scopes) and tenant-owned models are scoped to the current tenant. Change the query with `modifyQueryUsing`:

```php
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

TextInput::make('slug')->scopedUnique();                       // the form's model, ignoring the edited record
TextInput::make('email')->scopedUnique(User::class, 'email', ignoreRecord: false);
TextInput::make('slug')->scopedUnique(modifyQueryUsing: fn (Builder $query) => $query->withoutGlobalScope(SoftDeletingScope::class));

Select::make('author_id')->scopedExists(User::class, 'id');   // a multiple select must exist entirely
TextInput::make('post_id')->scopedExists(Post::class, 'id', modifyQueryUsing: fn (Builder $query) => $query->where('published', true));
```

`$model` defaults to the form's model and `$column` to the field name. `scopedUnique()` takes `ignorable:` and `ignoreRecord:` like `unique()`. Both use Laravel's `validation.unique` / `validation.exists` messages.

## Distinct values in repeaters

`distinct()` on a field inside a `Repeater` (or a `Builder` block) fails when two items have the same value; the error is shown on each duplicate item (`items.0.sku`, `items.2.sku`). `rule('distinct:ignore_case')` and `rule('distinct:strict')` work the same way. In nested repeaters the values are compared within each inner list.

Every shortcut accepts a condition: `->required(fn (Get $get) => $get('type') === 'company')`.

## Messages and attributes

```php
TextInput::make('title')
    ->validationMessages(['required' => 'Give it a title.'])
    ->validationAttribute('headline');

$schema->validationMessages([...]);
```

Validation messages are shown as text. `allowHtmlValidationMessages()` renders the field's messages as HTML, for custom messages with markup:

```php
TextInput::make('slug')
    ->rule('alpha_dash')
    ->validationMessages(['alpha_dash' => 'Use <strong>letters, numbers and dashes</strong> only.'])
    ->allowHtmlValidationMessages();
```

Laravel inserts `:input` (what the user typed) without escaping, so don't use `:input` in messages rendered as HTML.

## Not dehydrated fields

Fields excluded from the saved data (`dehydrated(false)`, `saved(false)`) are validated anyway. `validatedWhenNotDehydrated(false)` skips their rules.

## Conditional and dynamic rules

Rules are closures too: `->rule(fn (Get $get) => Rule::unique('posts')->where('category_id', $get('category_id')))`.

## Required marker

`required()` adds an asterisk. Hide it with `markAsRequired(false)`.

## Validating actions

Modal forms validate the same way; validation errors keep the modal open.
