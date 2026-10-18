<?php

// Page rendering is tested without the built assets.
beforeEach(fn () => $this->withoutVite());

use App\Support\Documentation;
use App\Support\Site\Blog;

it('renders every public page', function (string $path, string $component) {
    $this->get($path)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component($component)
            ->where('seo.canonical', url($path === '/' ? '' : $path))
            ->has('seo.title')
            ->has('seo.description')
            ->has('seo.image'));
})->with([
    ['/', 'welcome'],
    ['/features', 'site/features'],
    ['/demo', 'site/demo'],
    ['/plugins', 'site/plugins/index'],
    ['/plugins/submit', 'site/plugins/submit'],
    ['/blog', 'site/blog/index'],
    ['/changelog', 'site/changelog'],
    ['/community', 'site/community'],
    ['/services', 'site/services'],
    ['/ai', 'ai'],
]);

it('renders every blog post', function () {
    $posts = app(Blog::class)->posts();

    expect($posts)->not->toBeEmpty();

    foreach ($posts as $post) {
        $this->get('/blog/'.$post['slug'])
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('site/blog/show')
                ->where('post.title', $post['title'])
                ->where('seo.type', 'article'));
    }

    $this->get('/blog/does-not-exist')->assertNotFound();
});

it('puts the page title, description, canonical URL and image in the first response', function () {
    $html = $this->get('/features')->assertOk()->getContent();

    expect($html)
        ->toContain('<title>Features - AlfaKit</title>')
        ->toContain('<link rel="canonical" href="'.url('/features').'" data-inertia="canonical">')
        ->toContain('<meta property="og:image" content="'.url('/screenshots/products-cards-light.webp').'" data-inertia="og:image">')
        ->toContain('name="description"');
});

it('describes the software with JSON-LD on the home page only', function () {
    $html = $this->get('/')->getContent();

    preg_match('#<script type="application/ld\+json">(.*?)</script>#s', $html, $match);
    $data = json_decode($match[1] ?? '', true);

    expect($data)->toMatchArray(['@type' => 'SoftwareApplication', 'name' => 'AlfaKit'])
        ->and($data['author']['name'])->toBe('Alfa Six')
        ->and($this->get('/features')->getContent())->not->toContain('application/ld+json');
});

it('renders the changelog from the repository', function () {
    $this->get('/changelog')->assertInertia(fn ($page) => $page
        ->where('html', fn (?string $html) => str_contains((string) $html, 'Unreleased'))
        ->where('toc.0.text', fn (string $text) => $text !== ''));
});

it('shows the security policy on the community page', function () {
    $this->get('/community')->assertInertia(fn ($page) => $page
        ->where('security', fn (?string $html) => str_contains((string) $html, 'Reporting a Vulnerability')));
});

it('renders the branded 404 page', function () {
    $this->get('/no-such-page')
        ->assertNotFound()
        ->assertSee('data-page', false)
        ->assertSee('site\/error', false)
        ->assertSee('noindex', false);

    // Plain-text endpoints keep a plain 404.
    $this->get('/docs/no-such-page.md')->assertNotFound()->assertDontSee('site\/error', false);
});

it('does not serve blog posts as documentation pages', function () {
    $this->get('/docs/blog/introducing-alfakit')->assertNotFound();
});

it('links only to documentation pages that exist', function () {
    $docs = app(Documentation::class);
    $files = [
        ...glob(resource_path('js/pages/*.tsx')),
        ...glob(resource_path('js/pages/site/*.tsx')),
        ...glob(resource_path('js/pages/site/*/*.tsx')),
        ...glob(resource_path('js/components/site/*.tsx')),
        ...glob(base_path('content/blog/*.md')),
        base_path('content/plugins.json'),
    ];

    $missing = [];

    foreach ($files as $file) {
        preg_match_all('#["\'(]/docs/([a-z0-9\-/]+)(?:\#[a-z0-9\-]+)?["\')]#', (string) file_get_contents($file), $matches);

        foreach ($matches[1] as $slug) {
            if (! $docs->exists($slug)) {
                $missing[] = basename($file).': /docs/'.$slug;
            }
        }
    }

    expect($missing)->toBe([]);
});

it('only references screenshots that exist', function () {
    $sources = implode("\n", array_map('file_get_contents', [
        ...glob(resource_path('js/pages/*.tsx')),
        ...glob(resource_path('js/pages/site/*.tsx')),
        ...glob(resource_path('js/pages/site/*/*.tsx')),
        ...glob(base_path('content/blog/*.md')),
        ...glob(app_path('Http/Controllers/Site/*.php')),
    ]));

    preg_match_all('#(?:name=|name: |shot: )["\']([a-z0-9-]+)["\']#', $sources, $names);
    preg_match_all('#/screenshots/([a-z0-9-]+\.webp)#', $sources, $files);

    $expected = [
        ...array_map(fn (string $name) => $name.'-light.webp', array_unique($names[1])),
        ...array_map(fn (string $theme) => "theme-{$theme}-light.webp", ['alfakit', 'minimal', 'soft', 'corporate', 'filament']),
        ...$files[1],
    ];

    $missing = array_values(array_filter(array_unique($expected), fn (string $file) => ! is_file(public_path('screenshots/'.$file))));

    expect($names[1])->not->toBeEmpty()->and($missing)->toBe([]);
});
