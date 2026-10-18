<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Demo\Catalog;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Tag>
 */
class TagFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->randomElement(array_keys(Catalog::TAGS)).' '.fake()->unique()->numberBetween(1, 999);

        return ['name' => $name, 'slug' => Str::slug($name), 'color' => fake()->randomElement(Catalog::TAGS)];
    }
}
