<?php

declare(strict_types=1);

namespace App\Models;

use AlfaSix\AlfakitComments\Concerns\HasComments;
use AlfaSix\AlfakitComments\Contracts\Commentable;
use App\Enums\DiscountType;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property int $store_id
 * @property int|null $customer_id
 * @property int|null $discount_id
 * @property string $number
 * @property OrderStatus $status
 * @property string $currency
 * @property string $subtotal
 * @property string $discount_total
 * @property string $shipping_total
 * @property string $tax_total
 * @property string $total
 * @property string|null $discount_code
 * @property array<string, mixed>|null $shipping_address
 * @property array<string, mixed>|null $billing_address
 * @property array<int, array{status: string, at: string, note: string|null}>|null $timeline
 * @property string $channel
 * @property string|null $notes
 * @property Carbon|null $placed_at
 * @property int|null $board_sort
 */
#[Fillable([
    'store_id', 'customer_id', 'discount_id', 'number', 'status', 'currency', 'subtotal', 'discount_total',
    'shipping_total', 'tax_total', 'total', 'discount_code', 'shipping_address', 'billing_address', 'timeline',
    'channel', 'notes', 'placed_at', 'board_sort',
])]
class Order extends Model implements Commentable
{
    // Plugins: internal comments with mentions (alfakit-comments), the audit trail
    // (alfakit-activity-log over spatie/laravel-activitylog).
    use HasComments, LogsActivity;

    /** @use HasFactory<OrderFactory> */
    use HasFactory, SoftDeletes;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->useLogName('orders')->logOnly(['status', 'customer_id', 'channel', 'notes', 'shipping_total', 'discount_id'])->logOnlyDirty()->dontLogEmptyChanges();
    }

    /**
     * The payload of the `order.*` webhook events (alfakit-webhooks): never the addresses.
     *
     * @return array<string, mixed>
     */
    public function toWebhookPayload(string $event): array
    {
        return [...$this->only(['id', 'number', 'currency', 'total', 'channel']), 'status' => $this->status->value, 'placed_at' => $this->placed_at?->toIso8601String()];
    }

    /** @return HasMany<ReturnRequest, $this> */
    public function returnRequests(): HasMany
    {
        return $this->hasMany(ReturnRequest::class);
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return BelongsTo<Discount, $this> */
    public function discount(): BelongsTo
    {
        return $this->belongsTo(Discount::class);
    }

    /** @return HasMany<OrderItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /** @return HasMany<Shipment, $this> */
    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }

    /** @return HasOne<Shipment, $this> */
    public function latestShipment(): HasOne
    {
        return $this->hasOne(Shipment::class)->latestOfMany();
    }

    /**
     * Append a step to the status timeline and move the order to that status.
     */
    public function transitionTo(OrderStatus $status, ?string $note = null, ?Carbon $at = null): static
    {
        $timeline = $this->timeline ?? [];
        $timeline[] = ['status' => $status->value, 'at' => ($at ?? now())->toIso8601String(), 'note' => $note];

        $this->forceFill(['status' => $status, 'timeline' => $timeline]);

        return $this;
    }

    /**
     * Recompute subtotal, discount, tax and total from the items (10% VAT, free shipping on a
     * free-shipping code) and persist them. Called after items, payments or the discount change.
     */
    public function recalculateTotals(): static
    {
        $subtotal = round((float) $this->items()->sum('total'), 2);
        $discount = $this->discount;

        $discountTotal = match ($discount?->type) {
            DiscountType::Percentage => round($subtotal * (float) $discount->value / 100, 2),
            DiscountType::Fixed => min($subtotal, (float) $discount->value),
            default => 0.0,
        };
        $shipping = $discount?->type === DiscountType::FreeShipping ? 0.0 : (float) $this->shipping_total;
        $tax = round(($subtotal - $discountTotal) * 0.1, 2);

        $this->forceFill([
            'subtotal' => $subtotal,
            'discount_total' => $discountTotal,
            'discount_code' => $discount?->code,
            'shipping_total' => $shipping,
            'tax_total' => $tax,
            'total' => round($subtotal - $discountTotal + $shipping + $tax, 2),
        ])->save();

        return $this;
    }

    /** Captured payments minus refunds, in the order currency. */
    public function paidTotal(): float
    {
        $captured = (float) $this->payments()->where('status', PaymentStatus::Captured)->sum('amount');
        $refunded = (float) $this->payments()->where('status', PaymentStatus::Refunded)->sum('amount');

        return round($captured - $refunded, 2);
    }

    /** The next order number for a store: `MA-MAN-01234`. */
    public static function nextNumber(Store $store): string
    {
        $next = ((int) static::withTrashed()->max('id')) + 1;

        return sprintf('MA-%s-%05d', strtoupper(substr($store->slug, 0, 3)), $next);
    }

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'shipping_address' => 'array',
            'billing_address' => 'array',
            'timeline' => 'array',
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'shipping_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'total' => 'decimal:2',
            'placed_at' => 'datetime',
        ];
    }
}
