<?php

namespace Database\Seeders;

use App\Models\Note;
use App\Models\Post;
use Illuminate\Database\Seeder;

class AcceptanceSeeder extends Seeder
{
    public function run(): void
    {
        $post = Post::create(['title' => 'Seeded acceptance post', 'body' => 'The body of the seeded post.']);
        Post::create(['title' => 'Second seeded post', 'body' => 'Another post.']);

        $comment = $post->comments()->create(['body' => 'Seeded comment alpha']);
        $post->comments()->create(['body' => 'Seeded comment beta']);

        $comment->replies()->create(['body' => 'Seeded reply one']);
        $comment->replies()->create(['body' => 'Seeded reply two']);

        Note::create(['title' => 'Seeded note']);
    }
}
