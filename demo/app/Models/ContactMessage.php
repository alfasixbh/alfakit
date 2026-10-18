<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A message sent through the storefront contact form.
 *
 * @property int $id
 * @property int|null $store_id
 * @property string $name
 * @property string $email
 * @property string $topic
 * @property string|null $order_number
 * @property string $message
 * @property string $locale
 * @property string|null $renderer
 */
#[Fillable(['store_id', 'name', 'email', 'topic', 'order_number', 'message', 'locale', 'renderer'])]
class ContactMessage extends Model
{
    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
