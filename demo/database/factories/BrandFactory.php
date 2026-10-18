<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Demo\Catalog;
use App\Models\Brand;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Brand>
 */
class BrandFactory extends Factory
{
    public function definition(): array
    {
        $brand = fake()->randomElement(Catalog::BRANDS);
        $name = $brand['name'].' '.fake()->unique()->numberBetween(2, 999);

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'country' => $brand['country'],
            'founded_year' => $brand['founded'],
            'description' => $brand['description'],
            'website' => 'https://'.Str::slug($brand['name']).'.example',
            'is_featured' => fake()->boolean(30),
        ];
    }
}
