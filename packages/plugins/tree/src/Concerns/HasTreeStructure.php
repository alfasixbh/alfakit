<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTree\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * For models stored as a tree with a parent column and an order column (`parent_id` and
 * `order` by default; roots have a null parent).
 *
 * ```php
 * class Category extends Model
 * {
 *     use HasTreeStructure;
 * }
 * ```
 *
 * Change the columns with `protected string $treeParentColumn = 'parent'`,
 * `$treeOrderColumn` and `$treeTitleColumn`, or override the `determine…ColumnName()`
 * methods. New records are appended to their siblings.
 *
 * @mixin Model
 */
trait HasTreeStructure
{
    public static function bootHasTreeStructure(): void
    {
        static::creating(static function (Model $model): void {
            if (! method_exists($model, 'determineOrderColumnName') || ! method_exists($model, 'determineParentColumnName')) {
                return;
            }

            $order = $model->determineOrderColumnName();

            if ($model->getAttribute($order) !== null) {
                return;
            }

            $parent = $model->determineParentColumnName();
            $parentKey = $model->getAttribute($parent);
            $query = $model->newQuery();
            $parentKey === null ? $query->whereNull($parent) : $query->where($parent, $parentKey);

            $model->setAttribute($order, ((int) $query->max($order)) + 1);
        });
    }

    public function determineParentColumnName(): string
    {
        return property_exists($this, 'treeParentColumn') && is_string($this->treeParentColumn) ? $this->treeParentColumn : 'parent_id';
    }

    public function determineOrderColumnName(): string
    {
        return property_exists($this, 'treeOrderColumn') && is_string($this->treeOrderColumn) ? $this->treeOrderColumn : 'order';
    }

    public function determineTitleColumnName(): string
    {
        return property_exists($this, 'treeTitleColumn') && is_string($this->treeTitleColumn) ? $this->treeTitleColumn : 'title';
    }

    /**
     * @return BelongsTo<static, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(static::class, $this->determineParentColumnName());
    }

    /**
     * @return HasMany<static, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(static::class, $this->determineParentColumnName())->orderBy($this->determineOrderColumnName());
    }

    /**
     * Children with all their descendants loaded (`$category->childrenRecursive`).
     *
     * @return HasMany<static, $this>
     */
    public function childrenRecursive(): HasMany
    {
        return $this->children()->with('childrenRecursive');
    }

    public function isRoot(): bool
    {
        return $this->getAttribute($this->determineParentColumnName()) === null;
    }

    /**
     * The parents of this record, nearest first (stops at a broken or cyclic chain).
     *
     * @return Collection<int, static>
     */
    public function ancestors(): Collection
    {
        $ancestors = new Collection;
        $seen = [$this->getKey() => true];
        $current = $this;

        while (($parentKey = $current->getAttribute($this->determineParentColumnName())) !== null && ! isset($seen[$parentKey])) {
            $parent = static::query()->find($parentKey);

            if (! $parent instanceof static) {
                break;
            }

            $ancestors->push($parent);
            $seen[$parentKey] = true;
            $current = $parent;
        }

        return $ancestors;
    }

    /**
     * Records without a parent.
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeIsRoot(Builder $query): Builder
    {
        return $query->whereNull($this->qualifyColumn($this->determineParentColumnName()));
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeOrdered(Builder $query, string $direction = 'asc'): Builder
    {
        return $query->orderBy($this->qualifyColumn($this->determineOrderColumnName()), $direction === 'desc' ? 'desc' : 'asc');
    }
}
