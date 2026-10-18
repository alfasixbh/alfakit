<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\CustomerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\Tags\HasTags;

/**
 * @property int $id
 * @property int $store_id
 * @property string $first_name
 * @property string $last_name
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property string $locale
 * @property string $country
 * @property Carbon|null $birthday
 * @property bool $accepts_marketing
 * @property bool $is_vip
 * @property string|null $notes
 * @property string|null $avatar_path
 */
#[Fillable(['store_id', 'first_name', 'last_name', 'email', 'phone', 'locale', 'country', 'birthday', 'accepts_marketing', 'is_vip', 'notes', 'avatar_path'])]
class Customer extends Model
{
    /** @use HasFactory<CustomerFactory> */
    use HasFactory, SoftDeletes;

    // Customer segments (alfakit-tags over spatie/laravel-tags, type `segment`).
    use HasTags;

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return HasMany<Address, $this> */
    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    /**
     * The address copied onto new orders: the one flagged as default, else the oldest.
     *
     * @return HasOne<Address, $this>
     */
    public function defaultAddress(): HasOne
    {
        return $this->hasOne(Address::class)->ofMany(['is_default' => 'max', 'id' => 'min'], fn ($query) => $query);
    }

    /** @return HasMany<Order, $this> */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /** Two-letter initials for the generated avatar. */
    public function initials(): string
    {
        return mb_strtoupper(mb_substr($this->first_name, 0, 1).mb_substr($this->last_name, 0, 1));
    }

    /** @return HasMany<Review, $this> */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /** @return Attribute<string, never> */
    protected function name(): Attribute
    {
        return Attribute::get(fn (): string => trim($this->first_name.' '.$this->last_name));
    }

    protected function casts(): array
    {
        return ['birthday' => 'date', 'accepts_marketing' => 'boolean', 'is_vip' => 'boolean'];
    }
}
