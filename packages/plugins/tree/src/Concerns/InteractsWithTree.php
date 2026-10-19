<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTree\Concerns;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\ActionGroup;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Http\Controllers\Concerns\PullsFlashedNotifications;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Support\Authorization;
use AlfaSix\AlfakitTree\Support\TreeStructure;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * The tree shared by `TreePage` and `TreeWidget`: records, per-node actions, the
 * "save structure" action and the serialised tree the renderers' `tree` component draws.
 */
trait InteractsWithTree
{
    use PullsFlashedNotifications;

    /** Levels the tree may have (1 = a flat, sortable list); null for no limit. */
    protected static ?int $maxDepth = 2;

    protected ?int $configuredMaxDepth = null;

    protected bool $hasConfiguredMaxDepth = false;

    /** @var array<string, Action>|null */
    protected ?array $cachedTreeActions = null;

    /**
     * The action context the renderer posts node actions to (`tree` or `widget:<id>`).
     */
    abstract public function getTreeActionComponent(): string;

    /**
     * The records the user may see and arrange (tenant-scoped).
     *
     * @return Builder<Model>|null
     */
    abstract public function getTreeQuery(): ?Builder;

    /**
     * @return class-string<resource>|null
     */
    abstract public function getResourceClass(): ?string;

    public function maxDepth(?int $depth): static
    {
        $this->configuredMaxDepth = $depth;
        $this->hasConfiguredMaxDepth = true;

        return $this;
    }

    /**
     * Levels the tree may have: 1 is a flat list, 2 roots and their children…; null for
     * no limit.
     */
    public function getMaxDepth(): ?int
    {
        $depth = $this->hasConfiguredMaxDepth ? $this->configuredMaxDepth : static::$maxDepth;

        return $depth === null || $depth < 1 ? null : $depth;
    }

    public function getTreeHeading(): ?string
    {
        return null;
    }

    /**
     * Whether nodes start collapsed (the user can expand and collapse them).
     */
    public function isTreeCollapsedByDefault(): bool
    {
        return false;
    }

    protected function getTreeModelInstance(): ?Model
    {
        return $this->getTreeQuery()?->getModel();
    }

    public function getParentColumnName(): string
    {
        $model = $this->getTreeModelInstance();

        return $model !== null && method_exists($model, 'determineParentColumnName') ? $model->determineParentColumnName() : 'parent_id';
    }

    public function getOrderColumnName(): string
    {
        $model = $this->getTreeModelInstance();

        return $model !== null && method_exists($model, 'determineOrderColumnName') ? $model->determineOrderColumnName() : 'order';
    }

    public function getTitleColumnName(): string
    {
        $model = $this->getTreeModelInstance();

        return $model !== null && method_exists($model, 'determineTitleColumnName') ? $model->determineTitleColumnName() : 'title';
    }

    /**
     * The label of a node: the resource's record title (when it has one, not the shared model
     * label), else the title column.
     */
    public function getTreeRecordTitle(Model $record): string
    {
        $resource = $this->getResourceClass();
        $title = $resource !== null && $resource::hasRecordTitle() ? $resource::getRecordTitle($record) : null;
        $title ??= $record->getAttribute($this->getTitleColumnName());

        return is_scalar($title) && (string) $title !== '' ? (string) $title : (string) $record->getKey();
    }

    /**
     * An icon shown before a node's title (any icon name the panel knows).
     */
    public function getTreeRecordIcon(Model $record): ?string
    {
        return null;
    }

    /**
     * Fields of the default edit and view actions' modals. Without fields, edit and view
     * open the resource's pages when it has them.
     *
     * @return array<\AlfaSix\Alfakit\Schemas\Components\Component>
     */
    public function getFormSchema(): array
    {
        return [];
    }

    protected function hasEditAction(): bool
    {
        return true;
    }

    protected function hasDeleteAction(): bool
    {
        return true;
    }

    protected function hasViewAction(): bool
    {
        return false;
    }

    /**
     * Buttons on each node. They receive the node's record (`$record`).
     *
     * @return array<Action|ActionGroup>
     */
    protected function getTreeActions(): array
    {
        $actions = [];

        if ($this->hasViewAction() && ($schema = $this->getTreeModalSchema('view')) !== false) {
            $actions[] = ViewAction::make()->iconButton()->schema($schema)
                ->label(fn (?Model $record): string => $this->getTreeActionLabel('view', $record));
        }

        if ($this->hasEditAction() && ($schema = $this->getTreeModalSchema('edit')) !== false) {
            $actions[] = EditAction::make()->iconButton()->schema($schema)
                ->label(fn (?Model $record): string => $this->getTreeActionLabel('edit', $record));
        }

        if ($this->hasDeleteAction()) {
            $actions[] = DeleteAction::make()->iconButton()
                ->label(fn (?Model $record): string => $this->getTreeActionLabel('delete', $record));
        }

        return $actions;
    }

    /**
     * What a view / edit / create button opens: a modal with `getFormSchema()`; else the
     * resource's page when it has one (`null`: the action links to it); else a modal with
     * the resource's form (a simple resource edits in modals); `false` when there is neither.
     *
     * @return (Closure(): array<\AlfaSix\Alfakit\Schemas\Components\Component>)|false|null
     */
    protected function getTreeModalSchema(string $page): Closure|false|null
    {
        if ($this->getFormSchema() !== []) {
            return fn (): array => $this->getFormSchema();
        }

        $resource = $this->getResourceClass();

        if ($resource === null) {
            return false;
        }

        if ($resource::hasPage($page)) {
            return null;
        }

        return $this->getResourceFormSchema() === [] ? false : fn (): array => $this->getResourceFormSchema();
    }

    /**
     * The resource's form fields, for the modals of a resource without create / edit pages.
     *
     * @return array<\AlfaSix\Alfakit\Schemas\Components\Component>
     */
    protected function getResourceFormSchema(): array
    {
        $resource = $this->getResourceClass();

        return $resource === null ? [] : $resource::form(\AlfaSix\Alfakit\Schemas\Schema::make())->getComponents(withHidden: true);
    }

    /**
     * A node button's label names the node ("Delete Phones"), like the move buttons.
     */
    protected function getTreeActionLabel(string $action, ?Model $record): string
    {
        return (string) __('alfakit-tree::tree.actions.'.$action, ['title' => $record === null ? '' : $this->getTreeRecordTitle($record)]);
    }

    /**
     * Whether the user may rearrange the tree: the resource's (or the model policy's)
     * `reorder` ability.
     */
    public function canReorderTree(): bool
    {
        $resource = $this->getResourceClass();

        if ($resource !== null) {
            return $resource::can('reorder');
        }

        $model = $this->getTreeModelInstance();

        return Authorization::allows('reorder', $model === null ? null : $model::class);
    }

    /**
     * The node actions and the reorder action, by name, prepared with this context.
     *
     * @return array<string, Action>
     */
    protected function getTreeActionMap(): array
    {
        if ($this->cachedTreeActions !== null) {
            return $this->cachedTreeActions;
        }

        $map = [];

        foreach ($this->getPreparedTreeActions() as $action) {
            foreach ($action instanceof ActionGroup ? $action->getFlatActions() : [$action] as $flat) {
                $map[$flat->getName()] = $flat;
            }
        }

        $map[TreeStructure::REORDER_ACTION] = $this->makeReorderAction();

        return $this->cachedTreeActions = $map;
    }

    /**
     * @return array<Action|ActionGroup>
     */
    protected function getPreparedTreeActions(): array
    {
        $actions = $this->getTreeActions();

        foreach ($actions as $action) {
            $action->context($this);

            if ($action instanceof Action) {
                $action->recordTitle(fn (?Model $record): ?string => $record === null ? null : $this->getTreeRecordTitle($record));
            }
        }

        return $actions;
    }

    protected function makeReorderAction(): Action
    {
        return Action::make(TreeStructure::REORDER_ACTION)
            ->context($this)
            ->authorize(fn (): bool => $this->canReorderTree())
            ->action(function (array $arguments): array {
                $changed = TreeStructure::save(
                    $this->getTreeQuery() ?? abort(404),
                    $arguments['tree'] ?? null,
                    $this->getParentColumnName(),
                    $this->getOrderColumnName(),
                    $this->getMaxDepth(),
                );

                $this->afterTreeReordered($changed);

                return ['ok' => true, 'changed' => $changed, 'notifications' => $this->pullFlashedNotifications(request())];
            });
    }

    /**
     * Runs after a new structure was saved (`$changed` records moved). By default it sends
     * a success notification.
     */
    protected function afterTreeReordered(int $changed): void
    {
        Notification::make()->success()->title(__('alfakit-tree::tree.notifications.saved'))->send();
    }

    /**
     * A node action (with the node's record, posted as `record` and found within the tree
     * query) or the reorder action, for the action endpoint.
     */
    public function getTreeAction(string $name): ?Action
    {
        $action = $this->getTreeActionMap()[$name] ?? null;

        if ($action === null) {
            return null;
        }

        $key = request()->input('record');

        if ($name !== TreeStructure::REORDER_ACTION && (is_string($key) || is_int($key)) && $key !== '') {
            $record = $this->resolveTreeRecord($key);

            abort_if($record === null, 404);

            $action->record($record);
        }

        return $action;
    }

    public function resolveTreeRecord(int|string $key): ?Model
    {
        $query = $this->getTreeQuery();

        if ($query === null) {
            return null;
        }

        if (in_array(SoftDeletes::class, class_uses_recursive($query->getModel()), true)) {
            $query->withTrashed();
        }

        return $query->whereKey($key)->first();
    }

    /**
     * The tree for the renderer's `tree` component.
     *
     * @return array<string, mixed>
     */
    public function serializeTree(): array
    {
        $query = $this->getTreeQuery();
        $records = $query === null ? new \Illuminate\Database\Eloquent\Collection : $query->orderBy($query->getModel()->qualifyColumn($this->getOrderColumnName()))->get();
        $actions = $this->getPreparedTreeActions();

        return [
            'type' => 'tree',
            'key' => 'tree',
            'actionComponent' => $this->getTreeActionComponent(),
            'heading' => $this->getTreeHeading(),
            'maxDepth' => $this->getMaxDepth(),
            'reorderable' => $this->canReorderTree(),
            'collapsed' => $this->isTreeCollapsedByDefault() ?: null,
            'reorderAction' => TreeStructure::REORDER_ACTION,
            'nodes' => $this->serializeNodes(TreeStructure::nest($records, $this->getParentColumnName()), $actions),
        ];
    }

    /**
     * @param  array<int, array{record: Model, children: array<mixed>}>  $nodes
     * @param  array<Action|ActionGroup>  $actions
     * @return array<int, array<string, mixed>>
     */
    protected function serializeNodes(array $nodes, array $actions): array
    {
        $serialized = [];

        foreach ($nodes as $node) {
            $record = $node['record'];
            $schemas = [];

            foreach ($actions as $action) {
                $action->record($record);

                if ($action->isVisible()) {
                    $schemas[] = $action->toSchema();
                }
            }

            /** @var array<int, array{record: Model, children: array<mixed>}> $children */
            $children = $node['children'];

            $serialized[] = array_filter([
                'key' => (string) $record->getKey(),
                'title' => $this->getTreeRecordTitle($record),
                'icon' => $this->getTreeRecordIcon($record),
                'actions' => $schemas ?: null,
                'children' => $this->serializeNodes($children, $actions),
            ], static fn (mixed $value): bool => $value !== null);
        }

        foreach ($actions as $action) {
            $action->record(null);
        }

        return $serialized;
    }
}
