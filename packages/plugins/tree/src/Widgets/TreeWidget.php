<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTree\Widgets;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Contracts\HasResource;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Widgets\Widget;
use AlfaSix\AlfakitTree\Concerns\InteractsWithTree;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * A drag-and-drop tree of records on a dashboard or any page with widgets.
 *
 * ```php
 * class MenuTree extends TreeWidget
 * {
 *     protected static ?string $model = MenuItem::class;
 *
 *     protected ?string $heading = 'Menu';
 * }
 * ```
 *
 * Node actions and the reorder action run through the widget (`widget:<id>`).
 */
abstract class TreeWidget extends Widget implements HasResource
{
    use InteractsWithTree;

    /** The renderer component (`tree` in every renderer's registry). */
    protected static ?string $component = 'tree';

    /** @var class-string<Model>|null */
    protected static ?string $model = null;

    /** @var class-string<resource>|null */
    protected static ?string $resource = null;

    /** @var int|string|array<string, int|string|null> */
    protected int|string|array $columnSpan = 'full';

    protected ?string $heading = null;

    public function getType(): string
    {
        return 'Tree';
    }

    public function getResourceClass(): ?string
    {
        return static::$resource;
    }

    /**
     * @return class-string<Model>|null
     */
    public function getModel(): ?string
    {
        if (static::$model !== null) {
            return static::$model;
        }

        $resource = static::$resource;

        return $resource !== null ? $resource::getModel() : null;
    }

    public function getTreeHeading(): ?string
    {
        return $this->heading;
    }

    public function getTreeActionComponent(): string
    {
        return 'widget:'.$this->getId();
    }

    /**
     * The resource's (tenant-scoped) query, or the model's query scoped to the current
     * tenant.
     *
     * @return Builder<Model>|null
     */
    public function getTreeQuery(): ?Builder
    {
        $resource = static::$resource;

        if ($resource !== null) {
            return $resource::getEloquentQuery();
        }

        $model = $this->getModel();

        if ($model === null) {
            return null;
        }

        $query = $model::query();
        $panel = alfakit()->getCurrentPanel();
        $tenant = $panel?->getTenant();

        if ($panel !== null && $tenant !== null && method_exists($query->getModel(), $panel->getTenantOwnershipRelationshipName())) {
            Resource::scopeEloquentQueryToTenant($query, $tenant);
        }

        return $query;
    }

    /**
     * Node actions and the reorder action, for the action endpoint.
     */
    public function getAction(string $name): ?Action
    {
        return $this->getTreeAction($name);
    }

    protected function getSchemaProps(): array
    {
        return ['tree' => $this->serializeTree()];
    }
}
