<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Store>
 */
class StoreFactory extends Factory
{
    public function definition(): array
    {
        $city = fake()->unique()->randomElement(['Manama', 'Dubai', 'London', 'Paris', 'Riyadh', 'Doha', 'Milan', 'Kyoto']);

        return [
            'name' => 'Maison Alfa '.$city,
            'slug' => Str::slug($city),
            'tagline' => fake()->randomElement(['Flagship boutique.', 'Atelier and tasting bar.', 'Concept store.']),
            'country' => 'BH',
            'city' => $city,
            'currency' => 'USD',
            'timezone' => 'Asia/Bahrain',
            'email' => Str::slug($city).'@maison-alfa.test',
            'phone' => fake()->e164PhoneNumber(),
            'brand_color' => fake()->randomElement(['#073B78', '#F47A22', '#1E293B']),
            'is_active' => true,
        ];
    }
}
