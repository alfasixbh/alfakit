<?php

// Page rendering is tested without the built assets.
beforeEach(fn () => $this->withoutVite());

use App\Support\Site\Blog;

it('has complete front matter on every post', function () {
    $blog = app(Blog::class);
    $files = $blog->files();

    expect($files)->not->toBeEmpty();

    foreach ($files as $file) {
        $slug = basename($file, '.md');
        $meta = $blog->frontMatter($slug);

        expect($slug)->toMatch('/^[a-z0-9]+(-[a-z0-9]+)*$/');

        foreach (Blog::REQUIRED as $key) {
            expect($meta)->toHaveKey($key, message: "{$slug}: {$key} is missing");
            expect(trim((string) $meta[$key]))->not->toBe('', "{$slug}: {$key} is empty");
        }

        // Quoted, so YAML keeps it a string.
        expect($meta['date'])->toBeString()->toMatch('/^\d{4}-\d{2}-\d{2}$/');
        expect(strlen((string) $meta['description']))->toBeLessThanOrEqual(300);

        if (isset($meta['cover'])) {
            expect(public_path(ltrim($meta['cover'], '/')))->toBeFile()
                ->and($meta)->toHaveKey('coverAlt');
        }
    }
});

it('sorts posts newest first and estimates reading time', function () {
    $posts = app(Blog::class)->posts();
    $dates = array_column($posts, 'date');
    $sorted = $dates;
    rsort($sorted);

    expect($dates)->toBe($sorted)
        ->and($posts[0]['readingMinutes'])->toBeGreaterThanOrEqual(1)
        ->and($posts[0])->not->toHaveKey('html');
});
