<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ShipmentStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_id
 * @property string $carrier
 * @property string|null $service
 * @property string|null $tracking_number
 * @property ShipmentStatus $status
 * @property Carbon|null $shipped_at
 * @property Carbon|null $delivered_at
 */
#[Fillable(['order_id', 'carrier', 'service', 'tracking_number', 'status', 'shipped_at', 'delivered_at'])]
class Shipment extends Model
{
    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    protected function casts(): array
    {
        return ['status' => ShipmentStatus::class, 'shipped_at' => 'datetime', 'delivered_at' => 'datetime'];
    }
}
