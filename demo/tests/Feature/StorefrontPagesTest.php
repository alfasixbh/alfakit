<?php

declare(strict_types=1);

use App\Demo\DemoPlugins;
use App\Enums\OrderStatus;
use App\Enums\ReviewStatus;
use App\Models\ContactMessage;
use App\Models\Customer;
use App\Models\NewsletterSubscriber;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\Store;
use Illuminate\Support\Facades\Mail;
use Illuminate\Testing\TestResponse;

/*
 * The storefront pages beyond the home page and the standalone components they embed:
 * the review form, the contact form, the newsletter form, the orders table and the timeline.
 */
dataset('renderers', ['react', 'vue', 'svelte']);

function shopStore(): Store
{
    return Store::factory()->create(['is_active' => true]);
}

function shopProduct(Store $store): Product
{
    return Product::factory()->active()->create(['store_id' => $store->id, 'stock' => 12]);
}

/** @return array<string, mixed> */
function inertiaProps(TestResponse $response): array
{
    return $response->viewData('page')['props'];
}

/** Posts a standalone component's submit action, the way <AlfakitComponent> does. */
function submitStandalone(array $component, array $data): TestResponse
{
    return test()->postJson('/_alfakit/actions', [
        'token' => $component['token'],
        'action' => 'submit',
        'data' => $data,
    ]);
}

it('renders the product page with its reviews and the review form in every renderer', function (string $renderer): void {
    $store = shopStore();
    $product = shopProduct($store);
    Review::factory()->count(2)->create(['product_id' => $product->id, 'status' => ReviewStatus::Approved, 'rating' => 4, 'approved_at' => now()]);
    Review::factory()->create(['product_id' => $product->id, 'status' => ReviewStatus::Pending]);

    $response = $this->get("/{$renderer}/products/{$product->slug}")->assertOk();
    $props = inertiaProps($response);

    expect($response->viewData('page')['component'])->toBe('Storefront/Product')
        ->and($props['renderer'])->toBe($renderer)
        ->and($props['product']['slug'])->toBe($product->slug)
        ->and($props['reviews']['count'])->toBe(2)
        ->and($props['reviews']['average'])->toBe(4.0)
        ->and($props['reviews']['items'])->toHaveCount(2)
        ->and($props['reviewForm']['token'])->toBeString()
        ->and($props['newsletter']['token'])->toBeString()
        ->and($props['storefront']['locales'])->toHaveCount(count(DemoPlugins::LOCALES))
        ->and($props['storefront']['strip']['eyebrow'])->toBe(__('shop.strip.eyebrow'));
})->with('renderers');

it('returns 404 for a product that is not on the storefront', function (): void {
    $store = shopStore();
    $draft = Product::factory()->create(['store_id' => $store->id, 'status' => 'draft']);

    $this->get("/react/products/{$draft->slug}")->assertNotFound();
    $this->get('/react/products/does-not-exist')->assertNotFound();
});

it('stores a pending review from the standalone form and marks verified purchases', function (): void {
    $store = shopStore();
    $product = shopProduct($store);
    $customer = Customer::factory()->create(['store_id' => $store->id, 'email' => 'noor@example.com']);
    $order = Order::factory()->create(['store_id' => $store->id, 'customer_id' => $customer->id, 'status' => OrderStatus::Delivered]);
    $order->items()->create(['product_id' => $product->id, 'name' => $product->name, 'sku' => $product->sku, 'quantity' => 1, 'unit_price' => $product->price, 'total' => $product->price]);

    $form = inertiaProps($this->get("/vue/products/{$product->slug}"))['reviewForm'];

    submitStandalone($form, ['rating' => 5, 'name' => 'Noor', 'email' => 'noor@example.com', 'title' => 'Lasts all day', 'body' => 'Opens bright and settles into a warm, quiet amber that lasts well into the evening.'])
        ->assertRedirect();

    $review = Review::query()->where('product_id', $product->id)->firstOrFail();

    expect($review->status)->toBe(ReviewStatus::Pending)
        ->and($review->customer_id)->toBe($customer->id)
        ->and($review->is_verified_purchase)->toBeTrue()
        ->and($review->rating)->toBe(5);

    // Validation runs on the server: a short body is rejected per field.
    submitStandalone($form, ['rating' => 3, 'name' => 'Guest', 'email' => 'guest@example.com', 'title' => 'Hmm', 'body' => 'Too short.'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['body']);
});

it('renders the contact page and stores a message through the standalone form', function (string $renderer): void {
    Mail::fake();
    $store = shopStore();

    $response = $this->get("/{$renderer}/contact?product=Amber+Noir")->assertOk();
    $props = inertiaProps($response);

    expect($response->viewData('page')['component'])->toBe('Storefront/Contact')
        ->and($props['store']['name'])->toBe($store->name)
        ->and($props['form']['token'])->toBeString();

    submitStandalone($props['form'], ['name' => 'Layla Rahimi', 'email' => 'layla@example.com', 'topic' => 'order', 'order_number' => 'MA-2026-000123', 'message' => 'My order has not arrived yet, could you check the shipment status for me?'])
        ->assertRedirect();

    $message = ContactMessage::query()->firstOrFail();

    expect($message->topic)->toBe('order')
        ->and($message->order_number)->toBe('MA-2026-000123')
        ->and($message->renderer)->toBe($renderer)
        ->and($message->store_id)->toBe($store->id);
})->with('renderers');

it('requires the order number only when the topic is an order', function (): void {
    Mail::fake();
    shopStore();
    $form = inertiaProps($this->get('/react/contact'))['form'];

    submitStandalone($form, ['name' => 'Omar', 'email' => 'omar@example.com', 'topic' => 'order', 'message' => 'Where is my parcel? It was due last week and I have had no update.'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['order_number']);

    submitStandalone($form, ['name' => 'Omar', 'email' => 'omar@example.com', 'topic' => 'press', 'message' => 'I am writing a feature on Gulf perfumery and would love to talk.'])
        ->assertRedirect();

    expect(ContactMessage::query()->count())->toBe(1);
});

it('rate limits the contact form to three messages per visitor', function (): void {
    Mail::fake();
    shopStore();
    $form = inertiaProps($this->get('/svelte/contact'))['form'];
    $data = ['name' => 'Sara', 'email' => 'sara@example.com', 'topic' => 'other', 'message' => 'A question about gift wrapping for a corporate order of twenty bottles.'];

    foreach (range(1, 3) as $attempt) {
        submitStandalone($form, $data)->assertRedirect();
    }

    // The fourth attempt is refused with a translated notification instead of a message.
    submitStandalone($form, $data)->assertRedirect();

    expect(ContactMessage::query()->count())->toBe(3);
});

it('subscribes to the newsletter once per address', function (): void {
    shopStore();
    $newsletter = inertiaProps($this->get('/react'))['newsletter'];

    submitStandalone($newsletter, ['email' => 'reader@example.com'])->assertRedirect();
    submitStandalone($newsletter, ['email' => 'reader@example.com'])->assertStatus(422)->assertJsonValidationErrors(['email']);

    expect(NewsletterSubscriber::query()->where('email', 'reader@example.com')->count())->toBe(1);
});

it('tracks an order by e-mail and number and offers a sample otherwise', function (string $renderer): void {
    $store = shopStore();
    $customer = Customer::factory()->create(['store_id' => $store->id, 'email' => 'hana@example.com']);
    $order = Order::factory()->create(['store_id' => $store->id, 'customer_id' => $customer->id, 'number' => 'MA-2026-000777', 'status' => OrderStatus::Shipped]);
    $order->shipments()->create(['carrier' => 'Aramex', 'tracking_number' => 'ARX123', 'status' => 'in_transit', 'shipped_at' => now()]);

    $idle = inertiaProps($this->get("/{$renderer}/track")->assertOk());

    expect($idle['lookup']['state'])->toBe('idle')
        ->and($idle['orders'])->toBeNull()
        ->and($idle['sample'])->toBe(['email' => 'hana@example.com', 'number' => 'MA-2026-000777']);

    $found = inertiaProps($this->get("/{$renderer}/track?email=hana%40example.com&number=MA-2026-000777")->assertOk());

    expect($found['lookup']['state'])->toBe('found')
        ->and($found['sample'])->toBeNull()
        ->and($found['orders']['token'])->toBeString()
        ->and($found['timeline']['token'])->toBeString()
        ->and(json_encode($found['timeline']))->toContain('MA-2026-000777');

    $missing = inertiaProps($this->get("/{$renderer}/track?email=hana%40example.com&number=MA-0000")->assertOk());

    expect($missing['lookup']['state'])->toBe('not_found')
        ->and($missing['orders'])->toBeNull()
        ->and($missing['sample'])->not->toBeNull();
})->with('renderers');

it('follows the storefront language toggle and renders Arabic strings', function (): void {
    shopStore();

    $this->get('/demo/locale/ar?back=/react/contact')->assertRedirect('/react/contact');

    $props = inertiaProps($this->get('/react/contact')->assertOk());

    expect($props['locale'])->toBe('ar')
        ->and($props['copy']['heading'])->toBe(trans('shop.contact.heading', [], 'ar'))
        ->and(collect($props['storefront']['locales'])->firstWhere('code', 'ar')['active'])->toBeTrue();
});

it('offers every demo locale in the storefront language menu, with native names and RTL for ar and fa', function (string $locale, string $label, string $dir): void {
    shopStore();

    $this->get("/demo/locale/{$locale}?back=/react/contact")->assertRedirect('/react/contact');

    $response = $this->get('/react/contact')->assertOk();
    $props = inertiaProps($response);
    $link = collect($props['storefront']['locales'])->firstWhere('code', $locale);

    expect($props['locale'])->toBe($locale)
        ->and($props['copy']['heading'])->toBe(trans('shop.contact.heading', [], $locale))
        ->and($link['label'])->toBe($label)
        ->and($link['dir'])->toBe($dir)
        ->and($link['active'])->toBeTrue();

    $response->assertSee('dir="'.$dir.'"', false);
})->with([
    ['fr', 'Français', 'ltr'],
    ['fa', 'فارسی', 'rtl'],
    ['zh_CN', '简体中文', 'ltr'],
]);
