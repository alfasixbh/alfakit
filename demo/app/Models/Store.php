<?php

declare(strict_types=1);

namespace App\Models;

use AlfaSix\Alfakit\Contracts\HasAvatar;
use AlfaSix\Alfakit\Contracts\HasName;
use App\Alfakit\Support\InitialsAvatar;
use App\Enums\StaffRole;
use Database\Factories\StoreFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

/**
 * A store is the tenant of the admin panels: `/react/admin/{store}`.
 *
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $tagline
 * @property string $country
 * @property string|null $city
 * @property string $currency
 * @property string $timezone
 * @property string|null $email
 * @property string|null $phone
 * @property string $brand_color
 * @property string|null $logo_path
 * @property bool $is_active
 */
#[Fillable(['name', 'slug', 'tagline', 'country', 'city', 'currency', 'timezone', 'email', 'phone', 'brand_color', 'logo_path', 'is_active'])]
class Store extends Model implements HasAvatar, HasName
{
    /** @use HasFactory<StoreFactory> */
    use HasFactory;

    public function getAlfakitName(): string
    {
        return $this->name;
    }

    public function getAlfakitAvatarUrl(): ?string
    {
        // Without a logo: the city's initial on the store colour, so the three boutiques
        // ("Maison Alfa …") don't all show the same "MA" in the store switcher.
        return $this->logo_path
            ? Storage::disk('demo')->url($this->logo_path)
            : InitialsAvatar::url(mb_substr((string) ($this->city ?: $this->name), 0, 1), $this->slug, $this->brand_color);
    }

    /** @return BelongsToMany<User, $this> */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('role')->withTimestamps();
    }

    /** @return BelongsToMany<User, $this> */
    public function owners(): BelongsToMany
    {
        return $this->users()->wherePivot('role', StaffRole::Owner->value);
    }

    /** @return HasMany<Product, $this> */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /** @return HasMany<Customer, $this> */
    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    /** @return HasMany<Order, $this> */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /** @return HasMany<Discount, $this> */
    public function discounts(): HasMany
    {
        return $this->hasMany(Discount::class);
    }

    /** @return HasMany<ContentPage, $this> */
    public function contentPages(): HasMany
    {
        return $this->hasMany(ContentPage::class);
    }

    /** @return HasOne<Setting, $this> */
    public function setting(): HasOne
    {
        return $this->hasOne(Setting::class);
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
