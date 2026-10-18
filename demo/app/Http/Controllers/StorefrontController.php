<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ProductStatus;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Storefront shell: `/react`, `/vue` and `/svelte` render the same pages with a different
 * renderer. Pages are registered in resources/js/{renderer}/app.* under `Storefront/*`.
 */
class StorefrontController extends Controller
{
    public function home(Request $request): Response
    {
        $store = Store::query()->where('is_active', true)->orderBy('id')->first();

        $featured = Product::query()
            ->with(['brand:id,name'])
            ->when($store, fn ($query) => $query->where('store_id', $store->id))
            ->where('status', ProductStatus::Active)
            ->where('featured', true)
            ->orderBy('sort_order')
            ->limit(8)
            ->get()
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'brand' => $product->brand?->name,
                'concentration' => $product->concentration->getLabel(),
                'size' => $product->size_ml,
                'price' => (float) $product->price,
                'compareAtPrice' => $product->compare_at_price === null ? null : (float) $product->compare_at_price,
                'currency' => 'USD',
                'image' => $product->imageUrl(),
                'notes' => [
                    'top' => implode(', ', $product->scent_notes['top'] ?? []),
                    'heart' => implode(', ', $product->scent_notes['heart'] ?? []),
                    'base' => implode(', ', $product->scent_notes['base'] ?? []),
                ],
            ])
            ->values();

        return Inertia::render('Storefront/Home', [
            'store' => $store?->only(['name', 'slug', 'tagline', 'city']),
            'featured' => $featured,
            'copy' => [
                'hero' => __('demo.storefront.hero'),
                'featured' => __('demo.storefront.featured'),
                'from' => __('demo.storefront.from'),
                'notes' => __('demo.storefront.notes'),
                'by' => __('demo.storefront.by'),
                'empty' => __('demo.storefront.empty'),
            ],
        ]);
    }
}
