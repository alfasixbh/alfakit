<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $customer_id
 * @property string|null $label
 * @property string $type
 * @property string $recipient
 * @property string $line1
 * @property string|null $line2
 * @property string $city
 * @property string|null $state
 * @property string|null $postal_code
 * @property string $country
 * @property string|null $phone
 * @property bool $is_default
 */
#[Fillable(['customer_id', 'label', 'type', 'recipient', 'line1', 'line2', 'city', 'state', 'postal_code', 'country', 'phone', 'is_default'])]
class Address extends Model
{
    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** Snapshot stored on orders. */
    public function toSnapshot(): array
    {
        return $this->only(['recipient', 'line1', 'line2', 'city', 'state', 'postal_code', 'country', 'phone']);
    }

    protected function casts(): array
    {
        return ['is_default' => 'boolean'];
    }
}
