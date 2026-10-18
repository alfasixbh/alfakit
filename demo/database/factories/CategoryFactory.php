<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->randomElement(['Eau de parfum', 'Extrait', 'Candles', 'Diffusers', 'Discovery sets', 'Body care', 'Gift boxes', 'Hair mist']).' '.fake()->numberBetween(1, 99);

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'icon' => 'sparkles',
            'sort_order' => fake()->numberBetween(0, 20),
            'is_visible' => true,
        ];
    }
}
