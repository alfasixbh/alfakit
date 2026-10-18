<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Comment;
use App\Models\Post;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@example.com'],
            ['name' => 'Alfa Admin', 'password' => Hash::make('password'), 'email_verified_at' => now()],
        );

        $authors = User::factory()->count(4)->create()->push($admin);
        $categories = Category::factory()->count(6)->create();
        $tags = Tag::factory()->count(12)->create();

        Post::factory()->count(60)->make()->each(function (Post $post) use ($authors, $categories, $tags): void {
            $post->author_id = $authors->random()->id;
            $post->category_id = $categories->random()->id;
            $post->save();
            $post->topics()->attach($tags->random(rand(1, 4))->pluck('id'));

            Comment::factory()->count(rand(0, 5))->sequence(fn ($sequence) => ['sort' => $sequence->index])->create(['post_id' => $post->id]);
        });

        // Demo data for the first-party plugins (roles, tags, media, activity, calendar, tree, comments).
        $this->call(PluginsSeeder::class);

        // Kanban, forms, CMS, API, webhooks, workflows, invoices, files, helpdesk, analytics, teams…
        $this->call(WavePluginsSeeder::class);
    }
}
