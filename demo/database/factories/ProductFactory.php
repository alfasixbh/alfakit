<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Demo\Catalog;
use App\Enums\Concentration;
use App\Enums\ProductStatus;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    public function definition(): array
    {
        $concentration = fake()->randomElement([
            Concentration::EauDeParfum, Concentration::EauDeParfum, Concentration::EauDeParfum,
            Concentration::EauDeToilette, Concentration::Extrait, Concentration::Parfum, Concentration::BodyMist,
            Concentration::Candle, Concentration::Diffuser,
        ]);
        $isHome = in_array($concentration, [Concentration::Candle, Concentration::Diffuser], true);
        $name = $isHome
            ? fake()->randomElement(Catalog::HOME_NAMES)
            : fake()->randomElement(Catalog::NAME_PARTS[0]).' '.fake()->randomElement(Catalog::NAME_PARTS[1]);
        $size = $isHome ? fake()->randomElement([180, 220, 300]) : fake()->randomElement([30, 50, 75, 100]);
        $price = $isHome ? fake()->numberBetween(38, 95) : fake()->numberBetween(65, 320);
        $notes = [
            'top' => fake()->randomElements(Catalog::NOTES['top'], 3),
            'heart' => fake()->randomElements(Catalog::NOTES['heart'], 3),
            'base' => fake()->randomElements(Catalog::NOTES['base'], 3),
        ];
        $sku = 'MA-'.Str::upper(Str::random(3)).'-'.fake()->unique()->numberBetween(1000, 99999);

        return [
            'store_id' => Store::factory(),
            'brand_id' => Brand::factory(),
            'category_id' => Category::factory(),
            'sku' => $sku,
            'name' => $name,
            'slug' => Str::slug($name.'-'.$size.'-'.Str::lower(Str::afterLast($sku, '-'))),
            'concentration' => $concentration,
            'audience' => fake()->randomElement(['unisex', 'unisex', 'women', 'men']),
            'size_ml' => $size,
            'description' => self::description($name, $notes, $concentration),
            'price' => $price,
            'compare_at_price' => fake()->boolean(25) ? round($price * 1.2) : null,
            'cost' => round($price * fake()->randomFloat(2, 0.32, 0.55), 2),
            'stock' => fake()->boolean(8) ? 0 : fake()->numberBetween(2, 140),
            'status' => fake()->randomElement([ProductStatus::Active, ProductStatus::Active, ProductStatus::Active, ProductStatus::Active, ProductStatus::Draft, ProductStatus::Archived]),
            'featured' => fake()->boolean(12),
            'scent_notes' => $notes,
            'images' => [],
            'sort_order' => fake()->numberBetween(0, 200),
            'published_at' => fake()->dateTimeBetween('-18 months', '-1 day'),
        ];
    }

    public function active(): static
    {
        return $this->state(fn (): array => ['status' => ProductStatus::Active]);
    }

    public function featured(): static
    {
        return $this->active()->state(fn (): array => ['featured' => true]);
    }

    /** @param array<string, array<int, string>> $notes */
    public static function description(string $name, array $notes, Concentration $concentration): string
    {
        $top = implode(', ', $notes['top']);
        $heart = implode(', ', $notes['heart']);
        $base = implode(', ', $notes['base']);
        $kind = match ($concentration) {
            Concentration::Candle => 'A hand-poured candle with a cotton wick and around 45 hours of burn time.',
            Concentration::Diffuser => 'A reed diffuser that scents a room for roughly three months.',
            Concentration::BodyMist => 'A light body mist to layer or wear alone on warm days.',
            Concentration::Extrait, Concentration::Parfum => 'A dense, slow-burning composition made for evenings and cold weather.',
            default => 'A balanced eau with an easy, everyday presence.',
        };

        return "<p><strong>{$name}</strong> opens with {$top}, settles into a heart of {$heart} and dries down to {$base}.</p><p>{$kind} Blended and bottled in small batches.</p>";
    }
}
