<?php

use App\Support\Documentation;
use Illuminate\Support\Facades\Route;

/*
 * Every internal link in docs/content must land on a page that exists, and every `#anchor`
 * on a heading of that page. Links are resolved the way the browser resolves them: relative
 * to the page's URL (`/docs/panels/configuration` + `layout` = `/docs/panels/layout`).
 */

/**
 * @return array<string, string> URL path => Markdown file, for every page in docs/content.
 */
function docsPages(): array
{
    $root = dirname(__DIR__, 2).'/content';
    $pages = [];

    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)) as $file) {
        if ($file->getExtension() !== 'md') {
            continue;
        }

        $slug = substr($file->getPathname(), strlen($root) + 1, -3);
        $pages[str_starts_with($slug, 'blog/') ? '/'.$slug : '/docs/'.$slug] = $file->getPathname();
    }

    ksort($pages);

    return $pages;
}

/**
 * The links of a Markdown file, outside code blocks and inline code.
 *
 * @return list<string>
 */
function docsLinks(string $markdown): array
{
    $markdown = (string) preg_replace('/\A---\R.*?\R---\R/s', '', $markdown);
    $markdown = (string) preg_replace('/^(\s*)(`{3,}|~{3,}).*?^\1\2\s*$/ms', '', $markdown);
    $markdown = (string) preg_replace('/`[^`\n]*`/', '', $markdown);

    preg_match_all('/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/', $markdown, $inline);
    preg_match_all('/^\s*\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/m', $markdown, $references);
    preg_match_all('/<a\s[^>]*href="([^"]+)"/i', $markdown, $html);

    return array_values(array_unique([...$inline[1], ...$references[1], ...$html[1]]));
}

/**
 * Resolves a link against the page URL; null for links that leave the site.
 */
function resolveDocsLink(string $page, string $link): ?string
{
    if (preg_match('#^([a-z][a-z0-9+.-]*:|//)#i', $link)) {
        return null;
    }

    if (str_starts_with($link, '#')) {
        return $page.$link;
    }

    [$path, $fragment] = array_pad(explode('#', $link, 2), 2, null);
    $path = (string) strtok($path, '?');

    if (! str_starts_with($path, '/')) {
        $path = substr($page, 0, (int) strrpos($page, '/') + 1).$path;
    }

    $segments = [];

    foreach (explode('/', $path) as $segment) {
        if ($segment === '..') {
            array_pop($segments);
        } elseif ($segment !== '.' && $segment !== '') {
            $segments[] = $segment;
        }
    }

    return '/'.implode('/', $segments).($fragment !== null ? '#'.$fragment : '');
}

/**
 * Heading anchors of a docs page, as the rendered page has them.
 *
 * @return list<string>
 */
function docsAnchors(string $url): array
{
    static $cache = [];

    if (isset($cache[$url])) {
        return $cache[$url];
    }

    if (str_starts_with($url, '/docs/')) {
        $html = app(Documentation::class)->page(substr($url, 6))['html'];
    } else {
        $html = (string) test()->get($url)->getContent();
    }

    preg_match_all('/\sid="([^"]+)"/', $html, $ids);

    return $cache[$url] = $ids[1];
}

it('only links to pages and headings that exist', function (string $page, string $file): void {
    $pages = docsPages();
    $broken = [];

    foreach (docsLinks((string) file_get_contents($file)) as $link) {
        $target = resolveDocsLink($page, $link);

        if ($target === null) {
            continue;
        }

        [$path, $fragment] = array_pad(explode('#', $target, 2), 2, null);
        $path = $path === '' ? $page : (string) preg_replace('/\.md$/', '', $path);

        if (str_starts_with($path, '/docs/') || str_starts_with($path, '/blog/')) {
            if (! isset($pages[$path]) || (str_starts_with($path, '/docs/blog/'))) {
                $broken[] = "{$link} → {$path} (no such page)";

                continue;
            }
        } elseif (! in_array($path, ['/', '/docs', '/blog'], true) && ! collect(Route::getRoutes())->contains(fn ($route): bool => in_array('GET', $route->methods(), true) && $route->matches(request()->create($path)))) {
            $broken[] = "{$link} → {$path} (no such route)";

            continue;
        }

        if ($fragment !== null && $fragment !== '' && (str_starts_with($path, '/docs/') || str_starts_with($path, '/blog/')) && ! in_array($fragment, docsAnchors($path), true)) {
            $broken[] = "{$link} → no heading #{$fragment} on {$path}";
        }
    }

    expect($broken)->toBe([], "Broken links in {$page}:\n".implode("\n", $broken));
})->with(fn (): array => collect(docsPages())->mapWithKeys(fn (string $file, string $page): array => [$page => [$page, $file]])->all());

it('resolves links like the browser does', function (): void {
    expect(resolveDocsLink('/docs/panels/configuration', 'layout'))->toBe('/docs/panels/layout')
        ->and(resolveDocsLink('/docs/panels/configuration', '../design/themes#dark-mode'))->toBe('/docs/design/themes#dark-mode')
        ->and(resolveDocsLink('/docs/panels/configuration', './tenancy'))->toBe('/docs/panels/tenancy')
        ->and(resolveDocsLink('/docs/panels/configuration', '#colors'))->toBe('/docs/panels/configuration#colors')
        ->and(resolveDocsLink('/docs/panels/configuration', 'https://laravel.com'))->toBeNull()
        ->and(docsLinks("[a](b) `[c](d)`\n```php\n[e](f)\n```\n[g]: /h"))->toBe(['b', '/h']);
});
