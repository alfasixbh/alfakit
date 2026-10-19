---
title: Tree
description: Drag-and-drop, keyboard-accessible trees of hierarchical records as resource pages and widgets.
---

# Tree

`alfasix/alfakit-tree` shows records with a parent column and an order column as a nested tree that users rearrange by dragging, with buttons or with the keyboard, then save in one request. It provides a `TreePage` for resources, a `TreeWidget` for dashboards and a `HasTreeStructure` trait for the model. The API follows Filament's `solution-forest/filament-tree`.

The tree renders in React, Vue and Svelte (registry key `tree`) with no extra JavaScript dependencies: native drag and drop, move buttons on every node and WAI-ARIA tree roles. It works right to left.

## Installation

```bash
composer require alfasix/alfakit-tree
```

Register the plugin to share the tree's translations with the frontend (trees work without it, in English):

```php
use AlfaSix\AlfakitTree\TreePlugin;

$panel->plugin(TreePlugin::make());
```

## The model

Records need a nullable parent column and an integer order column:

```php
Schema::create('categories', function (Blueprint $table): void {
    $table->id();
    $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
    $table->integer('order')->default(0);
    $table->string('title');
    $table->timestamps();
});
```

Add `HasTreeStructure` (also available as `ModelTree`) to the model:

```php
use AlfaSix\AlfakitTree\Concerns\HasTreeStructure;

class Category extends Model
{
    use HasTreeStructure;
}
```

| Member                             | Does                                           |
| ---------------------------------- | ---------------------------------------------- |
| `parent()`                         | `BelongsTo` the parent record                  |
| `children()`                       | `HasMany` children, by order                   |
| `childrenRecursive()`              | Children with all their descendants loaded     |
| `ancestors()`                      | The parents of the record, nearest first       |
| `isRoot()`                         | Whether the record has no parent               |
| `scopeIsRoot()`                    | `Category::isRoot()`: records without a parent |
| `scopeOrdered($direction = 'asc')` | `Category::ordered()`: by the order column     |

New records are appended after their siblings (the order column is filled when it is empty). Roots have a null parent. Change the columns with properties or by overriding the methods:

| Property            | Method                        | Default     |
| ------------------- | ----------------------------- | ----------- |
| `$treeParentColumn` | `determineParentColumnName()` | `parent_id` |
| `$treeOrderColumn`  | `determineOrderColumnName()`  | `order`     |
| `$treeTitleColumn`  | `determineTitleColumnName()`  | `title`     |

## A tree page

`TreePage` is a resource page. Register it in the resource's pages, as the index or next to it:

```php
use AlfaSix\AlfakitTree\Pages\TreePage;

class CategoryTree extends TreePage
{
    protected static string $resource = CategoryResource::class;

    protected static ?int $maxDepth = 3;
}

// CategoryResource
public static function getPages(): array
{
    return [
        'index' => CategoryTree::route('/'),
        'edit' => EditCategory::route('/{record}/edit'),
    ];
}
```

The tree shows the resource's records from its query (so tenancy and nested resources scope it) and the user needs the resource's `viewAny` ability. The page has a create action in its header, and every node has edit and delete buttons (labelled with the node: "Edit Phones", "Delete Phones"). Create and edit open a modal with `getFormSchema()` when you define it, else the resource's create and edit pages when it has them, else a modal with the resource's `form()`, so a simple (modal) resource works as it is. `content()` components are shown below the tree.

## A tree widget

`TreeWidget` shows the same tree on a dashboard or any page with widgets:

```php
use AlfaSix\AlfakitTree\Widgets\TreeWidget;

class MenuTree extends TreeWidget
{
    protected static ?string $model = MenuItem::class;

    protected static ?int $maxDepth = 2;

    protected ?string $heading = 'Menu';

    public function getFormSchema(): array
    {
        return [TextInput::make('title')->required()];
    }
}
```

`$model` names the model (its query is scoped to the current tenant through the panel's tenant ownership relationship), or `$resource` uses a resource's query, policies and pages. Override `getTreeQuery()` to narrow the records (`MenuItem::query()->where('menu', 'main')`). Widgets span the full width by default.

## Options

These work on both the page and the widget:

| Property or method                                                      | Default                                            | Does                                                                                                      |
| ----------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `$maxDepth` / `getMaxDepth()` / `maxDepth(?int)`                        | `2`                                                | Levels the tree may have: `1` is a flat sortable list, `2` roots and their children…; `null` for no limit |
| `getTreeRecordTitle(Model $record)`                                     | the resource's record title, else the title column | The label of a node                                                                                       |
| `getTreeRecordIcon(Model $record)`                                      | `null`                                             | An icon before the label                                                                                  |
| `getTreeHeading()`                                                      | `null` (the widget's `$heading`)                   | A title above the tree                                                                                    |
| `isTreeCollapsedByDefault()`                                            | `false`                                            | Nodes start collapsed                                                                                     |
| `getFormSchema()`                                                       | `[]`                                               | Fields of the edit and view modals (and the page's create modal)                                          |
| `getTreeActions()`                                                      | edit and delete                                    | Buttons on each node                                                                                      |
| `hasEditAction()` / `hasDeleteAction()` / `hasViewAction()`             | `true` / `true` / `false`                          | Which default node actions to show                                                                        |
| `canReorderTree()`                                                      | the `reorder` ability                              | Whether the user may rearrange the tree                                                                   |
| `afterTreeReordered(int $changed)`                                      | sends "Order saved"                                | Runs after a new structure was saved                                                                      |
| `getParentColumnName()`, `getOrderColumnName()`, `getTitleColumnName()` | from the model                                     | The columns                                                                                               |

### Node actions

`getTreeActions()` returns actions that receive the node's record, like a table's record actions:

```php
use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\EditAction;

protected function getTreeActions(): array
{
    return [
        Action::make('publish')
            ->icon('send')
            ->iconButton()
            ->visible(fn (Category $record): bool => ! $record->published)
            ->action(fn (Category $record) => $record->publish()),
        EditAction::make()->iconButton()->schema(fn (): array => $this->getFormSchema()),
        DeleteAction::make()->iconButton(),
    ];
}
```

Without fields, edit and view open the resource's pages when it has them. Visibility and authorisation are checked per node; records are resolved within the tree's query, so a user can't act on a record of another tenant. Deleting a parent leaves its children to your foreign key (`nullOnDelete()` makes them roots, `cascadeOnDelete()` deletes them).

## Rearranging

Users rearrange the tree in the browser, then click **Save order**; **Discard changes** goes back to the saved structure:

- drag a node onto the top or bottom edge of another to put it before or after it, or onto its middle to put it inside;
- the arrow buttons on each node move it up or down among its siblings, into the node above (indent) or out of its parent (outdent);
- on a focused node, Alt + ↑/↓ moves it, Alt + →/← indents and outdents it (mirrored right to left).

The tree never offers a move deeper than `maxDepth` or into the node's own descendants. Moves are announced to screen readers.

Saving sends the whole structure in one request. The server checks `canReorderTree()` (the resource's `reorder` ability, or the model policy's `reorder` method; allowed when the policy doesn't define it, unless the panel uses `strictAuthorization()`), then validates the structure before writing anything: every record and parent must be in the tree's (tenant-scoped) query, no record may appear twice, the result may not contain a cycle and may not be deeper than `maxDepth`. The parent and order columns of the records that changed are saved in one transaction. A rejected structure shows the reason and keeps the user's changes.

## Keyboard and screen readers

The tree uses the `tree`, `treeitem` roles with `aria-level`, `aria-setsize`, `aria-posinset` and `aria-expanded`, and one node in the tab order at a time:

| Key                 | Does                                      |
| ------------------- | ----------------------------------------- |
| ↓ / ↑               | Next / previous visible node              |
| → (← right to left) | Expand the node, or go to its first child |
| ← (→ right to left) | Collapse the node, or go to its parent    |
| Home / End          | First / last visible node                 |
| Alt + ↑ / ↓         | Move the node up / down                   |
| Alt + → / ←         | Indent / outdent the node                 |

**Expand all** and **Collapse all** are in the header.

## Theming

The renderers emit `data-slot="tree-widget"` (the card), `tree` (the list), `tree-item` (a node, with `data-drop="before|after|inside"` while something is dragged over it and `data-dragging` on the dragged node) and `tree-move-buttons`. The drop indicator is styled in the shared theme CSS. Register your own component for `tree` in `createAlfakit({ components })` to replace the renderer.

## Translations

PHP strings live in the `alfakit-tree::tree` group. The frontend strings are under `alfakit-tree::tree.ui` and reach the renderers as `tree.*` when the plugin is registered: `label`, `expand_all`, `collapse_all`, `expand`, `collapse`, `move_up`, `move_down`, `indent`, `outdent`, `save`, `saving`, `discard`, `unsaved`, `save_failed`, `empty`, `moved`.

## Testing

Saving is an action of the tree (`tree` on a page, `widget:<id>` on a widget):

```php
use AlfaSix\AlfakitTree\Support\TreeStructure;

$token = $this->get('/admin/categories', ['X-Inertia' => 'true'])->json('props.page.token');

$this->postJson('/admin/_alfakit/actions', [
    'token' => $token,
    'component' => 'tree',
    'action' => TreeStructure::REORDER_ACTION,
    'arguments' => ['tree' => [
        ['key' => $books->id, 'parent' => null],
        ['key' => $novels->id, 'parent' => $books->id],
    ]],
])->assertOk();
```

`TreeStructure::save($query, $items, $parentColumn, $orderColumn, $maxDepth)` validates and saves a structure from your own code as well.
