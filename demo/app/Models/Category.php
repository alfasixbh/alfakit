<?php

declare(strict_types=1);

namespace App\Models;

use AlfaSix\Alfakit\Tenancy\SharedAcrossTenants;
use AlfaSix\AlfakitTree\Concerns\HasTreeStructure;
use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Nested categories (Fragrance › Eau de parfum, Home › Candles).
 *
 * @property int $id
 * @property int|null $parent_id
 * @property string $name
 * @property string $slug
 * @property string|null $icon
 * @property string|null $description
 * @property int $sort_order
 * @property bool $is_visible
 */
#[SharedAcrossTenants]
#[Fillable(['parent_id', 'name', 'slug', 'icon', 'description', 'sort_order', 'is_visible'])]
class Category extends Model
{
    /** @use HasFactory<CategoryFactory> */
    use HasFactory;

    // The drag-and-drop category tree (alfakit-tree): `parent_id`, ordered by `sort_order`.
    use HasTreeStructure;

    protected string $treeOrderColumn = 'sort_order';

    protected string $treeTitleColumn = 'name';

    /** @return BelongsTo<Category, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /** @return HasMany<Category, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }

    /** @return HasMany<Product, $this> */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    protected function casts(): array
    {
        return ['is_visible' => 'boolean', 'sort_order' => 'integer'];
    }
}
