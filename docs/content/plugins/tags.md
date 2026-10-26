---
title: Tags
description: Edit and show Spatie Laravel Tags in forms, tables and infolists.
---

# Tags

`alfasix/alfakit-tags` connects AlfaKit to [Spatie Laravel Tags](https://spatie.be/docs/laravel-tags). It adds a tags input that reads and syncs a model's tags, and a table column and infolist entry that show them as badges. The API follows Filament's `filament/spatie-laravel-tags-plugin`.

| Class              | Extends      | Does                                                           |
| ------------------ | ------------ | -------------------------------------------------------------- |
| `SpatieTagsInput`  | `TagsInput`  | Edits the record's tags (of a type) and suggests existing ones |
| `SpatieTagsColumn` | `TextColumn` | Shows the tags as badges in a table                            |
| `SpatieTagsEntry`  | `TextEntry`  | Shows the tags as badges in an infolist                        |

They render as the built-in `TagsInput`, `TextColumn` and `TextEntry` in React, Vue and Svelte; there is no frontend package.

**Works in** an [admin panel](../getting-started/installation), a [starter kit](../getting-started/starter-kits) panel and [outside panels](../standalone/overview) (a standalone form bound to a record: the tags are synced after `submit()`). Existing tags are offered as the input's suggestions while typing.

## Installation

```bash
composer require alfasix/alfakit-tags
```

Install Spatie's package as its documentation describes (publish and run the `tags` and `taggables` migration: `php artisan vendor:publish --provider="Spatie\Tags\TagsServiceProvider" --tag="tags-migrations"`, then `php artisan migrate`) and add the trait to your model:

```php
use Spatie\Tags\HasTags;

class Post extends Model
{
    use HasTags;
}
```

Registering the plugin is optional; the components work in any panel and standalone. Register it to declare the dependency and read it back with `TagsPlugin::get()`:

```php
use AlfaSix\AlfakitTags\TagsPlugin;

$panel->plugin(TagsPlugin::make());
```

### When the app already has a `tags` table

Spatie's migration creates `tags` and `taggables`. If your app has its own `tags` table, `php artisan alfakit:add tags` says so and doesn't publish the migration (it would fail on every `migrate`). Give Spatie a table of its own:

```php
namespace App\Models;

use Spatie\Tags\Tag;

class SpatieTag extends Tag
{
    protected $table = 'spatie_tags';

    // The pivot column stays `tag_id`.
    public function getForeignKey(): string
    {
        return 'tag_id';
    }
}
```

Set it as `'tag_model' => App\Models\SpatieTag::class` in `config/tags.php` (`php artisan vendor:publish --tag=tags-config`), publish the migration (`php artisan vendor:publish --tag=tags-migrations`), change `tags` to `spatie_tags` in it (`Schema::create`, `constrained('spatie_tags')`, `dropIfExists`) and migrate. `SpatieTagsInput` uses the configured model. A model that already has a `tags()` relationship can't use `HasTags` as well: the class's own method replaces the trait's, and `syncTagsWithType()` then writes to the wrong table. The [Quick start](../getting-started/quick-start)'s `Post` is such a model (its `tags` table and `tags()` relation are what this section is about), so put `HasTags` and the components on a model without a `tags()` method, or remove your relationship (and its `Select::make('tags')->relationship()` field) before you move that model to Spatie tags.

## Tag types

Spatie tags can have a type (`categories`, `colors`…). Each component takes `type()`:

| Call                 | Uses                                                |
| -------------------- | --------------------------------------------------- |
| no `type()`          | tags of every type (the default)                    |
| `type('categories')` | tags of that type                                   |
| `type(null)`         | tags without a type                                 |
| `anyTagType()`       | tags of every type again, after an earlier `type()` |

`type()` accepts a closure, like every option.

## Form field

```php
use AlfaSix\AlfakitTags\Forms\Components\SpatieTagsInput;

SpatieTagsInput::make('categories')->type('categories')
```

- The field is filled with the names of the record's tags of the type, in their order.
- It suggests the names of the existing tags of the type (from `HasTags::getTagClassName()`, else `config('tags.tag_model')`). `suggestions([...])` replaces them.
- It is never saved to an attribute. After the record is created or saved it calls `syncTagsWithType($tags, $type)`, which leaves tags of other types alone, or `syncTags($tags)` without a `type()` (which replaces tags of every type). New names create tags.

The field's name only identifies it in the form, so several inputs for different types (`categories`, `labels`) can edit the same `tags` relation. Every `TagsInput` option works: `separator()`, `splitKeys()`, `nestedRecursiveRules()`, `color()`, `reorderable()`, `tagPrefix()`, `tagSuffix()`, `trim()`.

## Table column

```php
use AlfaSix\AlfakitTags\Tables\Columns\SpatieTagsColumn;

SpatieTagsColumn::make('tags')->type('categories')
```

The column shows the tag names as badges (`badge(false)` turns that off) and eager loads the `tags` relation. Every `TextColumn` option works, such as `color()`, `limitList()`, `separator()` and `listWithLineBreaks()`.

## Infolist entry

```php
use AlfaSix\AlfakitTags\Infolists\Components\SpatieTagsEntry;

SpatieTagsEntry::make('tags')->type('categories')
```

The entry takes the same options as the column and every `TextEntry` option.

## Translations

Tag names are read with the app's locale (Spatie's tags are translatable). The plugin has no strings of its own.
