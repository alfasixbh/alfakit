<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\FrontMatter\FrontMatterExtension;
use League\CommonMark\Extension\FrontMatter\Output\RenderedContentWithFrontMatter;
use League\CommonMark\Extension\GithubFlavoredMarkdownExtension;
use League\CommonMark\Extension\HeadingPermalink\HeadingPermalinkExtension;
use League\CommonMark\MarkdownConverter;

/**
 * Reads the markdown documentation from the monorepo's docs/content directory.
 */
class Documentation
{
    public function __construct(protected string $root) {}

    /**
     * @return array<int, array{label: string, items: array<int, array{slug: string, title: string}>}>
     */
    public function sidebar(): array
    {
        return json_decode(File::get($this->root.'/_sidebar.json'), true);
    }

    public function firstSlug(): string
    {
        return $this->sidebar()[0]['items'][0]['slug'];
    }

    public function exists(string $slug): bool
    {
        // Blog posts live in content/blog but are served by the blog, not as docs pages.
        return $this->isSafe($slug) && ! str_starts_with($slug, 'blog/') && File::exists($this->path($slug));
    }

    /**
     * @return array{slug: string, title: string, description: string|null, html: string, toc: array<int, array{id: string, text: string, level: int}>, examples: list<string>, previous: array{slug: string, title: string}|null, next: array{slug: string, title: string}|null, editUrl: string}
     */
    public function page(string $slug): array
    {
        abort_unless($this->exists($slug), 404);

        $path = $this->path($slug);

        return Cache::remember('docs.v2.'.$slug.'.'.filemtime($path).'.'.md5(self::demoUrl()), now()->addDay(), function () use ($slug, $path): array {
            $markdown = self::withDemoUrl(File::get($path));
            $examples = app(Examples::class);
            $result = $this->converter()->convert($examples->toPlaceholders($markdown));
            $frontMatter = $result instanceof RenderedContentWithFrontMatter ? $result->getFrontMatter() : [];
            $html = $result->getContent();

            [$previous, $next] = $this->neighbours($slug);

            return [
                'slug' => $slug,
                'title' => $frontMatter['title'] ?? Str::headline(Str::afterLast($slug, '/')),
                'description' => $frontMatter['description'] ?? null,
                'html' => $html,
                'toc' => $this->toc($html),
                // Live examples (```alfakit-example name="…"```), mounted into the placeholders.
                'examples' => $examples->referencedIn($markdown),
                'previous' => $previous,
                'next' => $next,
                'editUrl' => 'https://github.com/alfasixbh/alfakit/edit/main/docs/content/'.$slug.'.md',
            ];
        });
    }

    /**
     * The page's Markdown without front matter, for AI agents and `llms-full.txt`.
     */
    public function markdown(string $slug): string
    {
        abort_unless($this->exists($slug), 404);

        return trim((string) preg_replace('/\A---\R.*?\R---\R/s', '', app(Examples::class)->toCode(self::withDemoUrl(File::get($this->path($slug))))));
    }

    /** The public demo; pages link to the canonical URL, rewritten to the configured one. */
    public const CANONICAL_DEMO_URL = 'https://demo.alfakit.dev';

    public static function demoUrl(): string
    {
        return (string) config('docs.demo_url', self::CANONICAL_DEMO_URL);
    }

    protected static function withDemoUrl(string $contents): string
    {
        return str_replace(self::CANONICAL_DEMO_URL, self::demoUrl(), $contents);
    }

    /**
     * @return array{title: string|null, description: string|null}
     */
    public function meta(string $slug): array
    {
        $contents = File::get($this->path($slug));
        $meta = ['title' => null, 'description' => null];

        if (preg_match('/\A---\R(.*?)\R---/s', $contents, $match) === 1) {
            foreach (['title', 'description'] as $key) {
                if (preg_match('/^'.$key.':\s*(.+)$/m', $match[1], $value) === 1) {
                    $meta[$key] = trim($value[1], " \t\"'");
                }
            }
        }

        return $meta;
    }

    /**
     * @return array<int, array{slug: string, title: string, section: string, excerpt: string}>
     */
    public function search(string $query): array
    {
        $query = Str::lower(trim($query));

        if ($query === '') {
            return [];
        }

        $results = [];

        foreach ($this->sidebar() as $section) {
            foreach ($section['items'] as $item) {
                $content = Str::lower(strip_tags(File::get($this->path($item['slug']))));
                $position = strpos($content, $query);

                if ($position === false && ! str_contains(Str::lower($item['title']), $query)) {
                    continue;
                }

                $start = max(0, ($position ?: 0) - 60);

                $results[] = [
                    'slug' => $item['slug'],
                    'title' => $item['title'],
                    'section' => $section['label'],
                    'excerpt' => trim(Str::substr($content, $start, 160)),
                ];
            }
        }

        return array_slice($results, 0, 12);
    }

    protected function path(string $slug): string
    {
        return $this->root.'/'.$slug.'.md';
    }

    protected function isSafe(string $slug): bool
    {
        return (bool) preg_match('#^[a-z0-9-]+(/[a-z0-9-]+)*$#', $slug);
    }

    protected function converter(): MarkdownConverter
    {
        $environment = new Environment([
            'heading_permalink' => ['symbol' => '#', 'insert' => 'after', 'html_class' => 'heading-anchor', 'aria_hidden' => true],
        ]);

        $environment->addExtension(new CommonMarkCoreExtension);
        $environment->addExtension(new GithubFlavoredMarkdownExtension);
        $environment->addExtension(new FrontMatterExtension);
        $environment->addExtension(new HeadingPermalinkExtension);

        return new MarkdownConverter($environment);
    }

    /**
     * @return array<int, array{id: string, text: string, level: int}>
     */
    protected function toc(string $html): array
    {
        preg_match_all('#<h([23])[^>]*>(.*?)</h\1>#s', $html, $matches, PREG_SET_ORDER);

        return array_map(function (array $match): array {
            preg_match('#id="([^"]+)"#', $match[0], $id);
            $text = trim(strip_tags(preg_replace('#<a[^>]*class="heading-anchor"[^>]*>.*?</a>#s', '', $match[2])));

            return ['id' => $id[1] ?? Str::slug($text), 'text' => $text, 'level' => (int) $match[1]];
        }, $matches);
    }

    /**
     * @return array{0: array{slug: string, title: string}|null, 1: array{slug: string, title: string}|null}
     */
    protected function neighbours(string $slug): array
    {
        $flat = [];

        foreach ($this->sidebar() as $section) {
            foreach ($section['items'] as $item) {
                $flat[] = $item;
            }
        }

        $index = array_search($slug, array_column($flat, 'slug'), true);

        if ($index === false) {
            return [null, null];
        }

        return [$flat[$index - 1] ?? null, $flat[$index + 1] ?? null];
    }
}
