<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A customer's order, shown in the customer portal (/portal).
 *
 * @property int $id
 * @property int $user_id
 * @property string $number
 * @property string $status
 * @property int $items_count
 * @property int $total In cents.
 * @property string $currency
 */
class Order extends Model
{
    public const STATUSES = ['processing' => 'warning', 'shipped' => 'info', 'delivered' => 'success', 'cancelled' => 'gray'];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'items_count' => 'integer',
            'total' => 'integer',
            'placed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
