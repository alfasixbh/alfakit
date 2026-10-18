<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Alfakit\Standalone\ContactForm;
use App\Alfakit\Standalone\CustomerOrdersTable;
use App\Alfakit\Standalone\OrderTimeline;
use App\Alfakit\Standalone\ReviewForm;
use App\Demo\Renderer;
use App\Demo\Shop;
use App\Enums\ReviewStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Storefront pages beyond the home page: product, contact and order tracking. Each embeds
 * AlfaKit standalone components (forms, a table, an infolist) in the shop's own layout.
 */
class StorefrontPagesController extends Controller
{
    public function product(Request $request, string $slug): Response
    {
        $product = Shop::products()
            ->with(['brand:id,name', 'category:id,name', 'variants', 'tags:id,name'])
            ->where('slug', $slug)
            ->firstOrFail();

        $reviews = $product->reviews()
            ->with('customer:id,first_name,last_name')
            ->where('status', ReviewStatus::Approved)
            ->latest('approved_at')
            ->limit(6)
            ->get();

        $stats = $product->reviews()
            ->where('status', ReviewStatus::Approved)
            ->selectRaw('count(*) as total, avg(rating) as average')
            ->first();

        $related = Shop::products()
            ->with('brand:id,name')
            ->whereKeyNot($product->id)
            ->where('category_id', $product->category_id)
            ->orderByDesc('featured')
            ->orderBy('sort_order')
            ->limit(4)
            ->get();

        return Inertia::render('Storefront/Product', [
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'sku' => $product->sku,
                'brand' => $product->brand?->name,
                'category' => $product->category?->name,
                'concentration' => $product->concentration->getLabel(),
                'audience' => __('demo.audience.'.$product->audience),
                'size' => $product->size_ml,
                'price' => (float) $product->price,
                'compareAtPrice' => $product->compare_at_price === null ? null : (float) $product->compare_at_price,
                'currency' => 'USD',
                'stock' => $product->stock,
                'description' => $product->description,
                'images' => array_values(array_map(fn (string $path): string => (string) Storage::disk('demo')->url($path), $product->images ?? [])),
                'notes' => $product->scent_notes ?? ['top' => [], 'heart' => [], 'base' => []],
                'tags' => $product->tags->pluck('name')->values()->all(),
                'variants' => $product->variants->map(fn (ProductVariant $variant): array => [
                    'id' => $variant->id,
                    'name' => $variant->name,
                    'size' => $variant->size_ml,
                    'price' => (float) $variant->price,
                    'stock' => $variant->stock,
                    'default' => $variant->is_default,
                ])->values()->all(),
            ],
            'reviews' => [
                'count' => (int) ($stats?->getAttribute('total') ?? 0),
                'average' => $stats?->getAttribute('average') === null ? null : round((float) $stats->getAttribute('average'), 1),
                'items' => $reviews->map(fn (Review $review): array => [
                    'id' => $review->id,
                    'rating' => $review->rating,
                    'title' => $review->title,
                    'body' => $review->body,
                    'author' => $review->customer->first_name ?? __('shop.product.reviews.guest'),
                    'verified' => $review->is_verified_purchase,
                    'date' => $review->approved_at?->translatedFormat('F Y'),
                ])->values()->all(),
            ],
            'related' => $related->map(fn (Product $item): array => [
                'id' => $item->id,
                'name' => $item->name,
                'slug' => $item->slug,
                'brand' => $item->brand?->name,
                'price' => (float) $item->price,
                'currency' => 'USD',
                'image' => $item->imageUrl(),
            ])->values()->all(),
            'reviewForm' => ReviewForm::make(['product' => $product]),
            'copy' => __('shop.product'),
        ]);
    }

    public function contact(Request $request): Response
    {
        return Inertia::render('Storefront/Contact', [
            'form' => ContactForm::make(['renderer' => Renderer::current($request)])->fill(array_filter([
                'topic' => $request->query('product') ? 'product' : null,
                'message' => $request->query('product') ? __('shop.contact.prefill', ['product' => (string) $request->query('product')]) : null,
            ])),
            'store' => Shop::store()?->only(['name', 'email', 'phone', 'city', 'country']),
            'copy' => __('shop.contact'),
        ]);
    }

    public function track(Request $request): Response
    {
        $email = trim((string) $request->query('email', ''));
        $number = trim((string) $request->query('number', ''));
        $customer = null;
        $order = null;
        $state = 'idle';

        if ($email !== '' && $number !== '') {
            $customer = Customer::query()
                ->where('store_id', Shop::store()?->id)
                ->where('email', $email)
                ->first();

            $order = $customer?->orders()->where('number', $number)->first();
            $state = $order === null ? 'not_found' : 'found';
        }

        return Inertia::render('Storefront/Track', [
            'lookup' => ['email' => $email, 'number' => $number, 'state' => $state],
            'orders' => $order === null ? null : CustomerOrdersTable::make(['customer' => $customer, 'selected' => $order->number]),
            'timeline' => $order === null ? null : OrderTimeline::make(['record' => $order->load('latestShipment')]),
            'sample' => $state === 'idle' || $state === 'not_found' ? $this->sampleOrder() : null,
            'copy' => __('shop.track'),
        ]);
    }

    /**
     * A real seeded order the visitor can try, so the page is never a dead end.
     *
     * @return array{email: string, number: string}|null
     */
    private function sampleOrder(): ?array
    {
        $order = Order::query()
            ->where('store_id', Shop::store()?->id)
            ->whereHas('customer')
            ->whereHas('shipments')
            ->with('customer:id,email')
            ->orderByDesc('placed_at')
            ->first();

        return $order === null ? null : ['email' => (string) $order->customer?->email, 'number' => $order->number];
    }
}
