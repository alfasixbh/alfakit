<?php

namespace Database\Factories;

use App\Models\Comment;
use App\Models\Post;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Comment> */
class CommentFactory extends Factory
{
    protected $model = Comment::class;

    public function definition(): array
    {
        return [
            'post_id' => Post::factory(),
            'author_name' => fake()->name(),
            'body' => fake()->sentences(2, true),
            'is_approved' => fake()->boolean(60),
            'sort' => 0,
        ];
    }
}
