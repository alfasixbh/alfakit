<?php

declare(strict_types=1);

namespace App\Demo;

use App\Enums\ProductStatus;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Database\Eloquent\Builder;

/**
 * The public storefront sells the catalogue of one store (the first active one); this is
 * where the storefront pages and standalone components agree on which.
 */
final class Shop
{
    /**
     * Memoised for the request (`once()` is flushed between tests and never outlives a
     * PHP-FPM request), so pages and standalone components agree on the store.
     */
    public static function store(): ?Store
    {
        return once(fn (): ?Store => Store::query()->where('is_active', true)->orderBy('id')->first());
    }

    /**
     * Products visible on the storefront.
     *
     * @return Builder<Product>
     */
    public static function products(): Builder
    {
        $store = self::store();

        return Product::query()
            ->when($store, fn (Builder $query) => $query->where('store_id', $store->id))
            ->where('status', ProductStatus::Active);
    }
}
