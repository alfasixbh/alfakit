<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Demo\Catalog;
use App\Demo\ProductArtwork;
use App\Enums\Concentration;
use App\Enums\DiscountType;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ProductStatus;
use App\Enums\ReviewStatus;
use App\Enums\ShipmentStatus;
use App\Enums\StaffRole;
use App\Models\Address;
use App\Models\Brand;
use App\Models\Category;
use App\Models\ContentPage;
use App\Models\Customer;
use App\Models\Discount;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Review;
use App\Models\Setting;
use App\Models\Shipment;
use App\Models\Store;
use App\Models\Tag;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Seeds the Maison Alfa shop: 3 stores, staff, ~150 products with local SVG artwork,
 * ~400 customers and ~1,200 orders with items, payments, shipments and reviews.
 *
 * `DEMO_SEED_SCALE=0.1` (or `DemoSeeder::$scale`) shrinks everything, e.g. in tests.
 */
class DemoSeeder extends Seeder
{
    public static ?float $scale = null;

    /** @var array<int, Brand> */
    private array $brands = [];

    /** @var array<int, Category> leaf categories */
    private array $leafCategories = [];

    /** @var array<int, Tag> */
    private array $tags = [];

    public function run(): void
    {
        $scale = static::$scale ?? (float) config('demo.seed_scale', 1.0);
        fake()->seed(2026);
        mt_srand(2026);

        Storage::disk(ProductArtwork::DISK)->deleteDirectory(ProductArtwork::DIRECTORY);

        $stores = $this->stores();
        $this->staff($stores);
        $this->referenceData();

        foreach ($stores as $index => $store) {
            $products = $this->products($store, $index, max(8, (int) round(50 * $scale)));
            $customers = $this->customers($store, max(10, (int) round(135 * $scale)));
            $discounts = $this->discounts($store);
            $this->orders($store, $products, $customers, $discounts, max(20, (int) round(400 * $scale)));
            $this->reviews($products, $customers);
            $this->pages($store);
        }
    }

    /** @return Collection<int, Store> */
    private function stores(): Collection
    {
        $stores = new Collection;

        foreach (Catalog::STORES as $data) {
            $store = Store::query()->create([
                'name' => $data['name'],
                'slug' => $data['slug'],
                'tagline' => $data['tagline'],
                'country' => $data['country'],
                'city' => $data['city'],
                'currency' => $data['currency'],
                'timezone' => $data['timezone'],
                'email' => $data['slug'].'@maison-alfa.test',
                'phone' => Catalog::phone($data['country']),
                'brand_color' => $data['color'],
                'is_active' => true,
            ]);

            Setting::query()->create([
                'store_id' => $store->id,
                'support_email' => 'care@maison-alfa.test',
                'support_phone' => $store->phone,
                'order_prefix' => 'MA',
                'low_stock_threshold' => 5,
                'free_shipping_threshold' => 120,
                'tax_rate' => 10,
                'notify_on_new_order' => true,
                'reviews_require_approval' => true,
                'announcement' => 'Complimentary engraving on all 100 ml bottles until the end of the month.',
                'social' => ['instagram' => 'maisonalfa', 'tiktok' => 'maisonalfa'],
                'opening_hours' => ['mon_sat' => '10:00–22:00', 'sun' => '14:00–20:00'],
            ]);

            $stores->push($store);
        }

        return $stores;
    }

    /** @param Collection<int, Store> $stores */
    private function staff(Collection $stores): void
    {
        $demo = User::factory()->create([
            'name' => 'Sam Taylor',
            'email' => User::DEMO_EMAIL,
            'password' => User::DEMO_PASSWORD,
            'title' => 'Head of retail',
            'locale' => 'en',
            'timezone' => 'Asia/Bahrain',
            'is_admin' => true,
            'created_at' => now()->subYears(3)->subDays(40),
        ]);

        // The demo user owns the flagship and manages the other stores.
        foreach ($stores as $index => $store) {
            $demo->stores()->attach($store, ['role' => $index === 0 ? StaffRole::Owner->value : StaffRole::Manager->value]);
        }

        $names = [
            ['Emma Clarke', 'Store manager', StaffRole::Manager], ['Omar Rashid', 'Perfumer', StaffRole::Staff],
            ['Lucy Bennett', 'Sales associate', StaffRole::Staff], ['Daniel Brooks', 'Buyer', StaffRole::Manager],
            ['Priya Shah', 'Customer care', StaffRole::Staff], ['Thomas Whitfield', 'Store manager', StaffRole::Manager],
            ['Grace Collins', 'Visual merchandiser', StaffRole::Staff], ['Marco Ferrante', 'Sales associate', StaffRole::Staff],
            ['Hana Yamamoto', 'Store owner', StaffRole::Owner],
        ];

        foreach ($names as $index => [$name, $title, $role]) {
            $user = User::factory()->create([
                'name' => $name,
                'email' => Str::slug($name, '.').'@maison-alfa.test',
                'title' => $title,
                'locale' => $index % 4 === 0 ? 'ar' : 'en',
                'created_at' => fake()->dateTimeBetween('-3 years', '-2 months'),
            ]);

            // Each staff member belongs to two or three stores.
            $memberships = $stores->shuffle()->take(fake()->numberBetween(2, 3));

            foreach ($memberships as $position => $store) {
                $user->stores()->attach($store, [
                    'role' => $position === 0 ? $role->value : StaffRole::Staff->value,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->created_at,
                ]);
            }
        }
    }

    private function referenceData(): void
    {
        foreach (Catalog::BRANDS as $index => $data) {
            $this->brands[] = Brand::query()->create([
                'name' => $data['name'],
                'slug' => Str::slug($data['name']),
                'country' => $data['country'],
                'founded_year' => $data['founded'],
                'description' => $data['description'],
                'website' => 'https://'.Str::slug($data['name']).'.example',
                'is_featured' => $index < 4,
            ]);
        }

        foreach (Catalog::CATEGORIES as $sort => $data) {
            $parent = Category::query()->create([
                'name' => $data['name'],
                'slug' => Str::slug($data['name']),
                'icon' => $data['icon'],
                'sort_order' => $sort,
            ]);

            foreach ($data['children'] as $childSort => $child) {
                $this->leafCategories[] = Category::query()->create([
                    'parent_id' => $parent->id,
                    'name' => $child,
                    'slug' => Str::slug($child),
                    'sort_order' => $childSort,
                ]);
            }
        }

        foreach (Catalog::TAGS as $name => $color) {
            $this->tags[] = Tag::query()->create(['name' => $name, 'slug' => Str::slug($name), 'color' => $color]);
        }
    }

    /** @return Collection<int, Product> */
    private function products(Store $store, int $storeIndex, int $count): Collection
    {
        $products = new Collection;
        $categoryBySlug = collect($this->leafCategories)->keyBy('slug');

        for ($i = 0; $i < $count; $i++) {
            $concentration = $this->pickConcentration($i);
            $isHome = in_array($concentration, [Concentration::Candle, Concentration::Diffuser], true);
            $name = $isHome
                ? Catalog::HOME_NAMES[($i + $storeIndex * 5) % count(Catalog::HOME_NAMES)]
                // Adjective and noun indexes drift at different rates, so no two products of a
                // store share a name (the pair only repeats after 400 products).
                : Catalog::NAME_PARTS[0][($i * 7 + $storeIndex) % 20].' '.Catalog::NAME_PARTS[1][($i * 3 + $storeIndex * 5 + intdiv($i, 20)) % 20];
            $brand = $this->brands[($i + $storeIndex) % count($this->brands)];
            $size = $isHome ? fake()->randomElement([180, 220, 300]) : fake()->randomElement([50, 75, 100]);
            $price = $isHome ? fake()->numberBetween(38, 95) : match ($concentration) {
                Concentration::Extrait, Concentration::Parfum => fake()->numberBetween(180, 340),
                Concentration::BodyMist => fake()->numberBetween(28, 48),
                default => fake()->numberBetween(65, 185),
            };
            $notes = [
                'top' => fake()->randomElements(Catalog::NOTES['top'], 3),
                'heart' => fake()->randomElements(Catalog::NOTES['heart'], 3),
                'base' => fake()->randomElements(Catalog::NOTES['base'], 3),
            ];
            $sku = sprintf('MA-%s-%03d%d', Str::upper(Str::substr($store->slug, 0, 3)), $i + 1, $storeIndex);
            $status = $i % 17 === 0 ? ProductStatus::Draft : ($i % 23 === 0 ? ProductStatus::Archived : ProductStatus::Active);
            $category = $categoryBySlug->get(match ($concentration) {
                Concentration::Candle => 'candles',
                Concentration::Diffuser => 'reed-diffusers',
                Concentration::BodyMist => 'body-mist',
                Concentration::EauDeToilette => 'eau-de-toilette',
                Concentration::Extrait, Concentration::Parfum => 'extrait-parfum',
                default => 'eau-de-parfum',
            });

            $product = Product::query()->create([
                'store_id' => $store->id,
                'brand_id' => $brand->id,
                'category_id' => $category?->id,
                'sku' => $sku,
                'name' => $name,
                'slug' => Str::slug($name.' '.$size.' '.Str::afterLast($sku, '-')),
                'concentration' => $concentration,
                'audience' => $isHome ? 'unisex' : fake()->randomElement(['unisex', 'unisex', 'women', 'men']),
                'size_ml' => $size,
                'description' => ProductFactory::description($name, $notes, $concentration),
                'price' => $price,
                'compare_at_price' => $i % 6 === 0 ? round($price * 1.2) : null,
                'cost' => round($price * fake()->randomFloat(2, 0.32, 0.55), 2),
                'stock' => $i % 13 === 0 ? 0 : ($i % 9 === 0 ? fake()->numberBetween(1, 4) : fake()->numberBetween(6, 140)),
                'status' => $status,
                'featured' => $status === ProductStatus::Active && $i % 8 === 1,
                'scent_notes' => $notes,
                'images' => [ProductArtwork::store($sku, $name, $concentration, $brand->name)],
                'sort_order' => $i,
                'published_at' => $status === ProductStatus::Draft ? null : fake()->dateTimeBetween('-18 months', '-1 day'),
            ]);

            $product->tags()->attach(collect($this->tags)->shuffle()->take(fake()->numberBetween(1, 3))->pluck('id'));

            if (! $isHome) {
                $sizes = $concentration === Concentration::BodyMist ? [100, 200] : [30, 50, 100];

                foreach ($sizes as $position => $variantSize) {
                    ProductVariant::query()->create([
                        'product_id' => $product->id,
                        'sku' => $sku.'-'.$variantSize,
                        'name' => $variantSize.' ml',
                        'size_ml' => $variantSize,
                        'price' => round($price * ($variantSize / $size), 2),
                        'stock' => fake()->numberBetween(0, 60),
                        'is_default' => $variantSize === $size,
                        'sort_order' => $position,
                    ]);
                }
            }

            $products->push($product);
        }

        return $products;
    }

    private function pickConcentration(int $index): Concentration
    {
        return match ($index % 10) {
            0, 1, 2, 3 => Concentration::EauDeParfum,
            4, 5 => Concentration::EauDeToilette,
            6 => Concentration::Extrait,
            7 => Concentration::BodyMist,
            8 => Concentration::Candle,
            default => Concentration::Diffuser,
        };
    }

    /** @return Collection<int, Customer> */
    private function customers(Store $store, int $count): Collection
    {
        // Customers joined over the last two years, most of them recently.
        $customers = Customer::factory()->count($count)->create(['store_id' => $store->id])
            ->each(function (Customer $customer): void {
                $joined = fake()->boolean(60)
                    ? fake()->dateTimeBetween('-12 months', '-1 day')
                    : fake()->dateTimeBetween('-24 months', '-12 months');

                $customer->forceFill(['created_at' => $joined, 'updated_at' => $joined])->saveQuietly();
            });
        $rows = [];
        $now = now();

        foreach ($customers as $customer) {
            $places = Catalog::CITIES[$customer->country] ?? Catalog::CITIES['BH'];
            $place = fake()->randomElement($places);

            $rows[] = [
                'customer_id' => $customer->id,
                'label' => 'Home',
                'type' => 'shipping',
                'recipient' => $customer->name,
                'line1' => Catalog::street($customer->country),
                'line2' => fake()->boolean(30) ? 'Apartment '.fake()->numberBetween(1, 48) : null,
                'city' => $place['city'],
                'state' => $place['state'],
                'postal_code' => Catalog::postcode($customer->country),
                'country' => $customer->country,
                'phone' => $customer->phone,
                'is_default' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (fake()->boolean(35)) {
                $rows[] = [
                    'customer_id' => $customer->id,
                    'label' => 'Office',
                    'type' => 'billing',
                    'recipient' => $customer->name,
                    'line1' => Catalog::street($customer->country),
                    'line2' => fake()->randomElement(Catalog::OFFICES),
                    'city' => $place['city'],
                    'state' => $place['state'],
                    'postal_code' => Catalog::postcode($customer->country),
                    'country' => $customer->country,
                    'phone' => $customer->phone,
                    'is_default' => false,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            Address::query()->insert($chunk);
        }

        return $customers;
    }

    /** @return Collection<int, Discount> */
    private function discounts(Store $store): Collection
    {
        $discounts = new Collection;
        $definitions = [
            ['WELCOME10', 'Welcome offer', DiscountType::Percentage, 10, null],
            ['SPRING15', 'Spring edit', DiscountType::Percentage, 15, 80],
            ['FREESHIP', 'Free shipping', DiscountType::FreeShipping, 0, 60],
            ['VIP20', 'VIP appreciation', DiscountType::Percentage, 20, 150],
            ['GIFT25', 'Gift box credit', DiscountType::Fixed, 25, 120],
        ];

        foreach ($definitions as $index => [$code, $name, $type, $value, $minimum]) {
            $discounts->push(Discount::query()->create([
                'store_id' => $store->id,
                'code' => $code,
                'name' => $name,
                'type' => $type,
                'value' => $value,
                'min_order_total' => $minimum,
                'usage_limit' => $index === 3 ? 100 : null,
                'used_count' => 0,
                'starts_at' => now()->subMonths(6),
                'ends_at' => $index === 1 ? now()->subMonth() : now()->addMonths(3),
                'is_active' => $index !== 1,
            ]));
        }

        return $discounts;
    }

    /**
     * @param  Collection<int, Product>  $products
     * @param  Collection<int, Customer>  $customers
     * @param  Collection<int, Discount>  $discounts
     */
    private function orders(Store $store, Collection $products, Collection $customers, Collection $discounts, int $count): void
    {
        $sellable = $products->where('status', ProductStatus::Active)->values();
        $addresses = Address::query()->whereIn('customer_id', $customers->pluck('id'))->get()->groupBy('customer_id');
        $orders = $items = $payments = $shipments = [];
        $now = now();
        $sequence = Order::query()->count();

        $byJoinDate = $customers->sortBy('created_at')->values();

        for ($i = 0; $i < $count; $i++) {
            // Spread over twelve months with steady growth: today is about three times as busy
            // as a year ago (half uniform, half a linear ramp), so every month has orders and
            // the dashboards still show a trend.
            $position = fake()->boolean() ? fake()->randomFloat(6, 0, 1) : sqrt(fake()->randomFloat(6, 0, 1));
            $placed = CarbonImmutable::instance($now)->subMinutes((int) round((1 - $position) * 365 * 24 * 60) + 120);

            // Nobody orders before joining: pick among the customers who had joined by then.
            $joined = $byJoinDate->filter(fn (Customer $candidate): bool => $candidate->created_at === null || $candidate->created_at->lessThanOrEqualTo($placed));
            $customer = $joined->isNotEmpty() ? $joined->random() : $byJoinDate->first();
            $lineCount = fake()->randomElement([1, 1, 1, 2, 2, 3, 4]);
            $subtotal = 0.0;
            $orderId = $i + 1 + $sequence; // SQLite assigns ids sequentially for a fresh table.
            $lines = [];

            foreach ($sellable->random(min($lineCount, $sellable->count())) as $product) {
                $quantity = fake()->randomElement([1, 1, 1, 2]);
                $lines[] = [
                    'order_id' => $orderId,
                    'product_id' => $product->id,
                    'product_variant_id' => null,
                    'name' => $product->name.($product->size_ml ? ' · '.$product->size_ml.' ml' : ''),
                    'sku' => $product->sku,
                    'quantity' => $quantity,
                    'unit_price' => $product->price,
                    'total' => round((float) $product->price * $quantity, 2),
                    'created_at' => $placed,
                    'updated_at' => $placed,
                ];
                $subtotal += (float) $product->price * $quantity;
            }

            $discount = fake()->boolean(22) ? $discounts->where('is_active', true)->random() : null;
            $discountTotal = match ($discount?->type) {
                DiscountType::Percentage => round($subtotal * (float) $discount->value / 100, 2),
                DiscountType::Fixed => min($subtotal, (float) $discount->value),
                default => 0.0,
            };
            $shipping = ($discount?->type === DiscountType::FreeShipping || $subtotal >= 120) ? 0.0 : 9.5;
            $tax = round(($subtotal - $discountTotal) * 0.1, 2);
            $total = round($subtotal - $discountTotal + $shipping + $tax, 2);
            $status = $this->statusFor($placed);
            $timeline = $this->timeline($status, $placed, $carrier = fake()->randomElement(Catalog::CARRIERS));
            $shippingAddress = $addresses->get($customer->id)?->first()?->toSnapshot();

            $orders[] = [
                'id' => $orderId,
                'store_id' => $store->id,
                'customer_id' => $customer->id,
                'discount_id' => $discount?->id,
                'number' => sprintf('MA-%s-%05d', Str::upper(Str::substr($store->slug, 0, 3)), $orderId),
                'status' => $status->value,
                'currency' => 'USD',
                'subtotal' => round($subtotal, 2),
                'discount_total' => $discountTotal,
                'shipping_total' => $shipping,
                'tax_total' => $tax,
                'total' => $total,
                'discount_code' => $discount?->code,
                'shipping_address' => json_encode($shippingAddress),
                'billing_address' => json_encode($shippingAddress),
                'timeline' => json_encode($timeline),
                'channel' => fake()->randomElement(['web', 'web', 'web', 'store', 'phone']),
                'notes' => fake()->boolean(10) ? fake()->randomElement(['Gift wrap, no price on the slip.', 'Leave with concierge.', 'Call before delivery.']) : null,
                'placed_at' => $placed,
                'created_at' => $placed,
                'updated_at' => $now,
            ];

            array_push($items, ...$lines);

            if ($status !== OrderStatus::Pending) {
                $method = fake()->randomElement([PaymentMethod::Card, PaymentMethod::Card, PaymentMethod::Card, PaymentMethod::ApplePay, PaymentMethod::Paypal, PaymentMethod::BankTransfer, PaymentMethod::CashOnDelivery]);
                $payments[] = [
                    'order_id' => $orderId,
                    'method' => $method->value,
                    'status' => ($status === OrderStatus::Refunded ? PaymentStatus::Refunded : ($status === OrderStatus::Cancelled ? PaymentStatus::Failed : PaymentStatus::Captured))->value,
                    'amount' => $total,
                    'currency' => 'USD',
                    'reference' => 'pi_'.Str::lower(Str::random(14)),
                    'card_brand' => $method === PaymentMethod::Card ? fake()->randomElement(['visa', 'mastercard', 'amex']) : null,
                    'card_last_four' => $method === PaymentMethod::Card ? (string) fake()->numberBetween(1000, 9999) : null,
                    'paid_at' => $placed->addMinutes(fake()->numberBetween(1, 40)),
                    'created_at' => $placed,
                    'updated_at' => $placed,
                ];
            }

            if (in_array($status, [OrderStatus::Shipped, OrderStatus::Delivered], true)) {
                $shippedAt = $placed->addDays(fake()->numberBetween(1, 3));
                $shipments[] = [
                    'order_id' => $orderId,
                    'carrier' => $carrier['carrier'],
                    'service' => $carrier['service'],
                    'tracking_number' => $carrier['prefix'].fake()->numerify('##########'),
                    'status' => ($status === OrderStatus::Delivered ? ShipmentStatus::Delivered : ShipmentStatus::InTransit)->value,
                    'shipped_at' => $shippedAt,
                    'delivered_at' => $status === OrderStatus::Delivered ? $shippedAt->addDays(fake()->numberBetween(1, 6)) : null,
                    'created_at' => $shippedAt,
                    'updated_at' => $shippedAt,
                ];
            }
        }

        foreach (array_chunk($orders, 150) as $chunk) {
            Order::query()->insert($chunk);
        }
        foreach (array_chunk($items, 300) as $chunk) {
            OrderItem::query()->insert($chunk);
        }
        foreach (array_chunk($payments, 300) as $chunk) {
            Payment::query()->insert($chunk);
        }
        foreach (array_chunk($shipments, 300) as $chunk) {
            Shipment::query()->insert($chunk);
        }

        foreach ($discounts as $discount) {
            $discount->update(['used_count' => Order::query()->where('discount_id', $discount->id)->count()]);
        }
    }

    private function statusFor(CarbonImmutable $placed): OrderStatus
    {
        $age = $placed->diffInDays(now());

        if ($age < 2) {
            return fake()->randomElement([OrderStatus::Pending, OrderStatus::Paid, OrderStatus::Paid]);
        }

        if ($age < 6) {
            return fake()->randomElement([OrderStatus::Paid, OrderStatus::Processing, OrderStatus::Processing, OrderStatus::Shipped]);
        }

        if ($age < 14) {
            return fake()->randomElement([OrderStatus::Shipped, OrderStatus::Shipped, OrderStatus::Delivered, OrderStatus::Cancelled]);
        }

        return fake()->randomElement(array_merge(array_fill(0, 14, OrderStatus::Delivered), [OrderStatus::Cancelled, OrderStatus::Refunded]));
    }

    /**
     * @param  array{carrier: string, service: string, prefix: string}  $carrier
     * @return array<int, array{status: string, at: string, note: string|null}>
     */
    private function timeline(OrderStatus $status, CarbonImmutable $placed, array $carrier): array
    {
        $steps = [[OrderStatus::Pending, $placed, 'placed']];
        $path = match ($status) {
            OrderStatus::Pending => [],
            OrderStatus::Paid => [OrderStatus::Paid],
            OrderStatus::Processing => [OrderStatus::Paid, OrderStatus::Processing],
            OrderStatus::Shipped => [OrderStatus::Paid, OrderStatus::Processing, OrderStatus::Shipped],
            OrderStatus::Delivered => [OrderStatus::Paid, OrderStatus::Processing, OrderStatus::Shipped, OrderStatus::Delivered],
            OrderStatus::Cancelled => [OrderStatus::Cancelled],
            OrderStatus::Refunded => [OrderStatus::Paid, OrderStatus::Processing, OrderStatus::Shipped, OrderStatus::Delivered, OrderStatus::Refunded],
        };

        $at = $placed;

        foreach ($path as $step) {
            $at = $at->addHours(fake()->numberBetween(1, 36));
            $steps[] = [$step, $at, $step->value];
        }

        return array_map(fn (array $step): array => [
            'status' => $step[0]->value,
            'at' => $step[1]->toIso8601String(),
            // Translated once at seed time, in the application locale.
            'note' => $step[2] === 'shipped' ? __('demo.timeline.shipped', ['carrier' => $carrier['carrier']]) : __('demo.timeline.'.$step[2]),
        ], $steps);
    }

    /**
     * @param  Collection<int, Product>  $products
     * @param  Collection<int, Customer>  $customers
     */
    private function reviews(Collection $products, Collection $customers): void
    {
        $rows = [];
        $now = now();

        foreach ($products->where('status', ProductStatus::Active) as $product) {
            foreach (range(1, fake()->numberBetween(0, 5)) as $ignored) {
                $status = fake()->randomElement([ReviewStatus::Approved, ReviewStatus::Approved, ReviewStatus::Approved, ReviewStatus::Pending, ReviewStatus::Rejected]);
                $created = fake()->dateTimeBetween('-8 months');
                $rows[] = [
                    'product_id' => $product->id,
                    'customer_id' => $customers->random()->id,
                    'rating' => fake()->randomElement([5, 5, 5, 4, 4, 4, 3, 2]),
                    'title' => fake()->randomElement(Catalog::REVIEW_TITLES),
                    'body' => fake()->randomElement(Catalog::REVIEW_BODIES),
                    'status' => $status->value,
                    'is_verified_purchase' => fake()->boolean(70),
                    'approved_at' => $status === ReviewStatus::Approved ? $created : null,
                    'created_at' => $created,
                    'updated_at' => $now,
                ];
            }
        }

        foreach (array_chunk($rows, 300) as $chunk) {
            Review::query()->insert($chunk);
        }
    }

    private function pages(Store $store): void
    {
        foreach (Catalog::PAGES as $index => $page) {
            ContentPage::query()->create([
                'store_id' => $store->id,
                'title' => $page['title'],
                'slug' => Str::slug($page['title']),
                'excerpt' => $page['excerpt'],
                'content' => [
                    ['type' => 'heading', 'data' => ['text' => $page['title'], 'level' => 'h2']],
                    ['type' => 'paragraph', 'data' => ['text' => $page['excerpt'].' '.$store->name.' is open daily; our team is happy to help by email or in the boutique.']],
                ],
                'is_published' => $index !== 2,
                'published_at' => $index !== 2 ? now()->subMonths(3) : null,
            ]);
        }
    }
}
