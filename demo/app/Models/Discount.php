<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\DiscountType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $store_id
 * @property string $code
 * @property string $name
 * @property DiscountType $type
 * @property string $value
 * @property string|null $min_order_total
 * @property int|null $usage_limit
 * @property int $used_count
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property bool $is_active
 */
#[Fillable(['store_id', 'code', 'name', 'type', 'value', 'min_order_total', 'usage_limit', 'used_count', 'starts_at', 'ends_at', 'is_active'])]
class Discount extends Model
{
    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return HasMany<Order, $this> */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    protected function casts(): array
    {
        return [
            'type' => DiscountType::class,
            'value' => 'decimal:2',
            'min_order_total' => 'decimal:2',
            'usage_limit' => 'integer',
            'used_count' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }
}
