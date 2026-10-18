<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Demo\Catalog;
use App\Enums\ReviewStatus;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Review>
 */
class ReviewFactory extends Factory
{
    public function definition(): array
    {
        $status = fake()->randomElement([ReviewStatus::Approved, ReviewStatus::Approved, ReviewStatus::Approved, ReviewStatus::Pending, ReviewStatus::Rejected]);

        return [
            'product_id' => Product::factory(),
            'customer_id' => Customer::factory(),
            'rating' => fake()->randomElement([5, 5, 5, 4, 4, 4, 3, 2]),
            'title' => fake()->randomElement(Catalog::REVIEW_TITLES),
            'body' => fake()->randomElement(Catalog::REVIEW_BODIES),
            'status' => $status,
            'is_verified_purchase' => fake()->boolean(70),
            'approved_at' => $status === ReviewStatus::Approved ? fake()->dateTimeBetween('-6 months') : null,
        ];
    }
}
