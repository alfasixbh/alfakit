<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Post> */
class PostFactory extends Factory
{
    protected $model = Post::class;

    public function definition(): array
    {
        $title = fake()->unique()->sentence(rand(3, 7));

        return [
            'author_id' => User::factory(),
            'category_id' => Category::factory(),
            'title' => rtrim($title, '.'),
            'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(1, 9999),
            'excerpt' => fake()->sentence(12),
            'content' => '<p>'.implode('</p><p>', fake()->paragraphs(4)).'</p>',
            'status' => fake()->randomElement(['draft', 'review', 'published']),
            'is_featured' => fake()->boolean(20),
            'published_at' => fake()->boolean(70) ? fake()->dateTimeBetween('-1 year') : null,
            'views' => fake()->numberBetween(0, 20000),
            'rating' => fake()->randomFloat(1, 1, 5),
            'meta' => ['seo_title' => fake()->sentence(4), 'reading_time' => fake()->numberBetween(2, 15).' min'],
        ];
    }
}
