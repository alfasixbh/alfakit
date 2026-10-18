<?php

namespace App\Support\Site;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/**
 * Blog posts: Markdown files in content/blog with front matter (title, description,
 * date, author, and optionally cover and coverAlt). The file name is the slug.
 */
class Blog
{
    public const REQUIRED = ['title', 'description', 'date', 'author'];

    public function __construct(protected string $directory) {}

    /**
     * Every post, newest first, without the body.
     *
     * @return list<array{slug: string, title: string, description: string, date: string, author: string, cover: string|null, coverAlt: string, readingMinutes: int}>
     */
    public function posts(): array
    {
        $posts = array_map(function (string $file): array {
            $post = $this->post(basename($file, '.md'));
            unset($post['html'], $post['toc']);

            return $post;
        }, $this->files());

        usort($posts, fn (array $a, array $b): int => strcmp($b['date'], $a['date']) ?: strcmp($a['slug'], $b['slug']));

        return $posts;
    }

    public function exists(string $slug): bool
    {
        return preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug) === 1 && File::exists($this->path($slug));
    }

    /**
     * @return array{slug: string, title: string, description: string, date: string, author: string, cover: string|null, coverAlt: string, readingMinutes: int, html: string, toc: array<int, array{id: string, text: string, level: int}>}
     */
    public function post(string $slug): array
    {
        abort_unless($this->exists($slug), 404);

        $path = $this->path($slug);

        return Cache::remember('blog.'.$slug.'.'.filemtime($path), now()->addDay(), function () use ($slug, $path): array {
            $source = File::get($path);
            ['html' => $html, 'frontMatter' => $meta] = Markdown::convert($source);
            $words = str_word_count(strip_tags($html));

            return [
                'slug' => $slug,
                'title' => (string) ($meta['title'] ?? Str::headline($slug)),
                'description' => (string) ($meta['description'] ?? ''),
                'date' => self::date($meta['date'] ?? null),
                'author' => (string) ($meta['author'] ?? 'Alfa Six'),
                'cover' => isset($meta['cover']) ? (string) $meta['cover'] : null,
                'coverAlt' => (string) ($meta['coverAlt'] ?? ''),
                'readingMinutes' => max(1, (int) round($words / 220)),
                'html' => $html,
                'toc' => Markdown::toc($html, 2),
            ];
        });
    }

    /**
     * The raw front matter of a post, for validation in tests.
     *
     * @return array<string, mixed>
     */
    public function frontMatter(string $slug): array
    {
        return Markdown::convert(File::get($this->path($slug)))['frontMatter'];
    }

    /** @return list<string> */
    public function files(): array
    {
        $files = glob($this->directory.'/*.md') ?: [];
        sort($files);

        return $files;
    }

    /** YAML turns an unquoted 2026-10-12 into a timestamp; both forms become Y-m-d. */
    protected static function date(mixed $value): string
    {
        if (is_int($value)) {
            return CarbonImmutable::createFromTimestampUTC($value)->toDateString();
        }

        return CarbonImmutable::parse(is_string($value) ? $value : 'today')->toDateString();
    }

    protected function path(string $slug): string
    {
        return $this->directory.'/'.$slug.'.md';
    }
}
