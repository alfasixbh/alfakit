# AlfaKit Tree

<p><picture><source media="(prefers-color-scheme: dark)" srcset="../../../art/alfasix/alfa-six-micro-white.svg"><img src="../../../art/alfasix/alfa-six-micro-navy.svg" alt="" width="24" height="18" align="top"></picture> <sub>by <a href="https://alfasixbh.com">Alfa Six</a></sub></p>

Hierarchical records as a drag-and-drop, keyboard-accessible tree in [AlfaKit](https://alfakit.dev) panels: a resource page, a dashboard widget and a model trait. The API follows `solution-forest/filament-tree`.

## Installation

```bash
composer require alfasix/alfakit-tree
```

The tree component is built into `@alfakit/react`, `@alfakit/vue` and `@alfakit/svelte`.

## Register

```php
use AlfaSix\AlfakitTree\TreePlugin;

$panel->plugin(TreePlugin::make());
```

## Usage

The model needs a nullable `parent_id` and an integer `order` column:

```php
use AlfaSix\AlfakitTree\Concerns\HasTreeStructure;

class Category extends Model
{
    use HasTreeStructure;
}
```

A tree page for a resource:

```php
use AlfaSix\AlfakitTree\Pages\TreePage;

class CategoryTree extends TreePage
{
    protected static string $resource = CategoryResource::class;

    protected static ?int $maxDepth = 3;
}

// CategoryResource::getPages()
'index' => CategoryTree::route('/'),
```

Or a widget:

```php
use AlfaSix\AlfakitTree\Widgets\TreeWidget;

class MenuTree extends TreeWidget
{
    protected static ?string $model = MenuItem::class;

    protected ?string $heading = 'Menu';
}
```

Users drag nodes, use the move buttons or Alt + arrow keys, then save the new structure in one request; the server checks the `reorder` ability, the tenant and the structure (no cycles, no duplicates, at most `maxDepth` levels).

See the [documentation](https://alfakit.dev/docs/plugins/tree) for every option.

## License

MIT. See [LICENSE.md](LICENSE.md).
