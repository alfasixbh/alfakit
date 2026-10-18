<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $product_id
 * @property string $sku
 * @property string $name
 * @property int|null $size_ml
 * @property string $price
 * @property int $stock
 * @property bool $is_default
 * @property int $sort_order
 */
#[Fillable(['product_id', 'sku', 'name', 'size_ml', 'price', 'stock', 'is_default', 'sort_order'])]
class ProductVariant extends Model
{
    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    protected function casts(): array
    {
        return ['is_default' => 'boolean', 'price' => 'decimal:2', 'stock' => 'integer', 'size_ml' => 'integer', 'sort_order' => 'integer'];
    }
}
