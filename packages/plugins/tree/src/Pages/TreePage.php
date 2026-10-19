<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTree\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\Exceptions\ActionNotResolvableException;
use AlfaSix\Alfakit\Resources\Pages\Page;
use AlfaSix\AlfakitTree\Concerns\InteractsWithTree;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * A resource page that shows the resource's records as a drag-and-drop tree.
 *
 * ```php
 * class CategoryTree extends TreePage
 * {
 *     protected static string $resource = CategoryResource::class;
 *
 *     protected static ?int $maxDepth = 3;
 * }
 *
 * // CategoryResource::getPages()
 * 'index' => CategoryTree::route('/'),
 * ```
 *
 * The records come from the resource's (tenant-scoped) query and need a parent and an
 * order column (`HasTreeStructure`). Node actions run as the `tree` component of the page.
 */
abstract class TreePage extends Page
{
    use InteractsWithTree;

    /** The action context of node actions and of the reorder action. */
    public const TREE_COMPONENT = 'tree';

    public static function canAccess(): bool
    {
        return static::getResource()::canViewAny();
    }

    public static function getNavigationLabel(): string
    {
        return \AlfaSix\Alfakit\Support\Html::toText(static::getResource()::getNavigationLabel());
    }

    public function getTitle(): string
    {
        return static::$title ?? static::getResource()::getTitleCasePluralModelLabel();
    }

    public function getBreadcrumbs(): array
    {
        $resource = static::getResource();

        return [...$this->getParentBreadcrumbs(), $resource::getUrl() => $resource::getTitleCasePluralModelLabel(), $this->getBreadcrumb()];
    }

    public function getTreeActionComponent(): string
    {
        return self::TREE_COMPONENT;
    }

    /**
     * @return Builder<Model>|null
     */
    public function getTreeQuery(): ?Builder
    {
        return static::getResource()::getEloquentQuery();
    }

    /**
     * A create action: a modal with `getFormSchema()`, a link to the resource's create page
     * when it has one, else a modal with the resource's form (simple resources).
     */
    protected function getHeaderActions(): array
    {
        $schema = $this->getTreeModalSchema('create');

        return $schema === false ? [] : [CreateAction::make()->schema($schema)];
    }

    /**
     * The tree, followed by any `content()` components.
     */
    protected function getContentBlocks(): array
    {
        $tree = [...$this->serializeTree(), 'columnSpan' => ['default' => 'full']];
        $blocks = [['type' => 'Schema', 'key' => 'tree', 'components' => [$tree]]];

        foreach (parent::getContentBlocks() as $block) {
            $blocks[] = $block;
        }

        return $blocks;
    }

    /**
     * Node actions and the reorder action resolve from the tree; everything else as usual.
     */
    public function resolveAction(?string $component, string $name, bool $isBulk = false): Action
    {
        if ($component !== self::TREE_COMPONENT) {
            return parent::resolveAction($component, $name, $isBulk);
        }

        $path = explode(Action::PATH_SEPARATOR, $name);
        $action = $isBulk ? null : $this->getTreeAction((string) array_shift($path));

        if ($action !== null && $path !== []) {
            $action = $action->getNestedModalAction($path);
        }

        if ($action === null) {
            throw new ActionNotResolvableException("Action [{$name}] could not be resolved on [".static::class.'] for the tree.');
        }

        return $this->applyPageDatabaseTransactions($action);
    }

    protected function flushCaches(): void
    {
        parent::flushCaches();

        $this->cachedTreeActions = null;
    }
}
