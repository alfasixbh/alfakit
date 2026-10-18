# AlfaKit Tags

<p><picture><source media="(prefers-color-scheme: dark)" srcset="../../../art/alfasix/alfa-six-micro-white.svg"><img src="../../../art/alfasix/alfa-six-micro-navy.svg" alt="" width="24" height="18" align="top"></picture> <sub>by <a href="https://alfasixbh.com">Alfa Six</a></sub></p>

Spatie Laravel Tags input, column and entry for [AlfaKit](https://alfakit.dev) panels. They render in React, Vue and Svelte with AlfaKit's built-in components.

## Installation

```bash
composer require alfasix/alfakit-tags
```

Install and migrate [spatie/laravel-tags](https://spatie.be/docs/laravel-tags), then add `HasTags` to your model.

Registering the plugin is optional:

```php
use AlfaSix\AlfakitTags\TagsPlugin;

$panel->plugin(TagsPlugin::make());
```

## Usage

```php
use AlfaSix\AlfakitTags\Forms\Components\SpatieTagsInput;
use AlfaSix\AlfakitTags\Infolists\Components\SpatieTagsEntry;
use AlfaSix\AlfakitTags\Tables\Columns\SpatieTagsColumn;

// Form: filled from the record's tags of the type, suggests existing tags, saved with syncTagsWithType().
SpatieTagsInput::make('categories')->type('categories');

// Table and infolist: the tag names as badges.
SpatieTagsColumn::make('tags')->type('categories');
SpatieTagsEntry::make('tags')->type('categories');
```

Without `type()` tags of every type are used (and the input saves with `syncTags()`); `type(null)` means tags without a type.

Full documentation: [alfakit.dev/docs/plugins/tags](https://alfakit.dev/docs/plugins/tags).

## License

MIT. See [LICENSE.md](LICENSE.md).
