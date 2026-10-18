<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per store: edit it with a singular resource (ManageSingularRecord).
 *
 * @property int $id
 * @property int $store_id
 * @property string|null $support_email
 * @property string|null $support_phone
 * @property string $order_prefix
 * @property int $low_stock_threshold
 * @property string $free_shipping_threshold
 * @property string $tax_rate
 * @property bool $notify_on_new_order
 * @property bool $reviews_require_approval
 * @property string|null $announcement
 * @property array<string, string>|null $social
 * @property array<string, string>|null $opening_hours
 * @property array<string, string>|null $welcome_message
 */
#[Fillable([
    'store_id', 'support_email', 'support_phone', 'order_prefix', 'low_stock_threshold', 'free_shipping_threshold',
    'tax_rate', 'notify_on_new_order', 'reviews_require_approval', 'announcement', 'social', 'opening_hours', 'welcome_message',
])]
class Setting extends Model
{
    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    protected function casts(): array
    {
        return [
            'low_stock_threshold' => 'integer',
            'free_shipping_threshold' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'notify_on_new_order' => 'boolean',
            'reviews_require_approval' => 'boolean',
            'social' => 'array',
            'opening_hours' => 'array',
            'welcome_message' => 'array',
        ];
    }
}
