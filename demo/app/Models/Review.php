<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReviewStatus;
use Database\Factories\ReviewFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Reviews reach the store through the product, so tenancy scopes them via `product.store`.
 *
 * @property int $id
 * @property int $product_id
 * @property int|null $customer_id
 * @property int $rating
 * @property string|null $title
 * @property string|null $body
 * @property ReviewStatus $status
 * @property bool $is_verified_purchase
 * @property Carbon|null $approved_at
 */
#[Fillable(['product_id', 'customer_id', 'rating', 'title', 'body', 'status', 'is_verified_purchase', 'approved_at'])]
class Review extends Model
{
    /** @use HasFactory<ReviewFactory> */
    use HasFactory;

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** Moderation: approve or reject, stamping the approval time. */
    public function moderate(ReviewStatus $status): void
    {
        $this->forceFill([
            'status' => $status,
            'approved_at' => $status === ReviewStatus::Approved ? now() : null,
        ])->save();
    }

    /** `★★★★☆` for the rating, for compact table cells. */
    public function stars(): string
    {
        return str_repeat('★', max(0, min(5, $this->rating))).str_repeat('☆', max(0, 5 - $this->rating));
    }

    protected function casts(): array
    {
        return ['status' => ReviewStatus::class, 'rating' => 'integer', 'is_verified_purchase' => 'boolean', 'approved_at' => 'datetime'];
    }
}
