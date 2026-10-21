---
title: Reusable schemas
description: Share a group of fields between forms with fragments, and infer fields from a model.
---

# Reusable schemas

The same address block, the same SEO fields, the same audit section: when several forms need the same components, put them in a **fragment**, a class that returns components and drops into any `components([...])` like a single component.

## Fragments

```bash
php artisan make:alfakit-schema AddressFields
```

The command writes `app/Alfakit/Schemas/AddressFields.php`:

```php
namespace App\Alfakit\Schemas;

use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Schemas\Components\Component;
use AlfaSix\Alfakit\Schemas\Fragment;

class AddressFields extends Fragment
{
    /** @return array<Component> */
    public function define(): array
    {
        return [
            TextInput::make('street')->required()->maxLength(255),
            TextInput::make('city')->required()->maxLength(255),
            TextInput::make('postal_code')->maxLength(20),
        ];
    }
}
```

Use it anywhere components are accepted: resource forms, standalone forms, wizard steps, repeater items, infolists (with entries instead of fields):

```php
$schema->components([
    TextInput::make('name'),
    AddressFields::make(),
]);
```

A fragment is an invisible `Group`, so everything a group can do works on it:

```php
AddressFields::make()->statePath('billing');              // billing.street, billing.city, …
AddressFields::make()->relationship('shippingAddress');   // edits the related HasOne/BelongsTo record
AddressFields::make()->hidden(fn (Get $get) => ! $get('ships_physically'));
AddressFields::make()->columns(2)->columnSpanFull();
```

`statePath()` nests the fields' state under a key, so two copies of the same fragment never collide; `relationship()` loads, validates and saves a related record exactly like [`Section::relationship()`](layout#relationships). Pass `--model=Post` to start from the fields inferred for a model: the generator writes the same code as the resource generator's form (relationship selects, enum options, input types, imports), ready to edit.

Fragments take constructor arguments through `make()`, so one class can serve variations:

```php
namespace App\Alfakit\Schemas;

use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Schemas\Fragment;

class AddressFields extends Fragment
{
    public function __construct(private readonly bool $withCountry = true)
    {
        parent::__construct();
    }

    public function define(): array
    {
        return array_values(array_filter([
            TextInput::make('street')->required(),
            $this->withCountry ? Select::make('country_id')->relationship('country', 'name') : null,
        ]));
    }
}
```

```php
AddressFields::make(withCountry: false);
```

`define()` runs once per fragment instance, the first time the schema reads its children. Each `make()` builds fresh component instances, so tweaking one copy never affects another.

## Inferring fields from a model

`Schema::fromModel()` builds a schema from a model's casts and table columns, using the same rules the resource generator applies when it writes a form:

```php
use AlfaSix\Alfakit\Schemas\Schema;

$schema = Schema::fromModel(Post::class);
```

| Source                                           | Field                                                    |
| ------------------------------------------------ | -------------------------------------------------------- |
| `*_id` with a matching `BelongsTo` method        | `Select` with `relationship()`, searchable and preloaded |
| Backed enum cast                                 | `Select` with the enum cases                             |
| `boolean` cast or column, `is_*`/`has_*` tinyint | `Toggle`                                                 |
| `array`/`json`/`collection` cast, json column    | `KeyValue`                                               |
| `date` cast or column                            | `DatePicker`                                             |
| `datetime` cast, datetime/timestamp column       | `DateTimePicker`                                         |
| time column                                      | `TimePicker`                                             |
| integer cast or column                           | `TextInput` with `integer()`                             |
| decimal/float cast or column                     | `TextInput` with `numeric()`                             |
| text column                                      | `Textarea`, full width                                   |
| name containing `email`                          | `TextInput` with `email()`                               |
| name containing `image`, `avatar` or `photo`     | `FileUpload` with `image()`                              |
| name containing `color`                          | `ColorPicker`                                            |
| anything else                                    | `TextInput` with `maxLength(255)`                        |

Non-nullable columns without a default are `required()`. The primary key, timestamps, soft-delete and authentication columns are skipped, and when the model declares `$fillable`, only those attributes are included.

The result is a normal schema with normal components, so tweak it before using it:

```php
$schema = Schema::fromModel(Post::class, except: ['slug']);
$schema->getComponent('title')?->maxLength(120)->live(onBlur: true);
$schema->components([...$schema->getComponents(), Toggle::make('featured')]);

// Or pick the attributes, in this order:
Schema::fromModel(Post::class, only: ['title', 'content', 'is_published']);

// Just the fields, for a fragment or a section:
AlfaSix\Alfakit\Schemas\ModelSchema::fields(Post::class, except: ['meta']);
```

In a resource, `form()` receives a schema already bound to the model, so fill it from the model and adjust:

```php
public static function form(Schema $schema): Schema
{
    return $schema->components([
        ...ModelSchema::fields(Post::class, except: ['author_id']),
        AddressFields::make()->relationship('address'),
    ])->columns(2);
}
```
