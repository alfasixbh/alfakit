<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_id
 * @property PaymentMethod $method
 * @property PaymentStatus $status
 * @property string $amount
 * @property string $currency
 * @property string|null $reference
 * @property string|null $card_brand
 * @property string|null $card_last_four
 * @property Carbon|null $paid_at
 */
#[Fillable(['order_id', 'method', 'status', 'amount', 'currency', 'reference', 'card_brand', 'card_last_four', 'paid_at'])]
class Payment extends Model
{
    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    protected function casts(): array
    {
        return ['method' => PaymentMethod::class, 'status' => PaymentStatus::class, 'amount' => 'decimal:2', 'paid_at' => 'datetime'];
    }
}
