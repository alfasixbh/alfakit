<?php

// Page rendering is tested without the built assets.
beforeEach(fn () => $this->withoutVite());

use App\Support\Site\Plugins;
use App\Support\Site\Showcase;

/*
 * The plugin directory (content/plugins.json) is edited by pull request; this checks every
 * entry so a malformed one never reaches the site.
 */
it('has a valid plugin directory', function () {
    $data = json_decode((string) file_get_contents(base_path('content/plugins.json')), true, flags: JSON_THROW_ON_ERROR);

    expect($data)->toHaveKeys(['categories', 'plugins'])
        ->and($data['categories'])->toBeArray()->not->toBeEmpty()
        ->and($data['plugins'])->toBeArray();

    $packages = [];

    foreach ($data['plugins'] as $index => $plugin) {
        $label = "plugins[{$index}]";

        expect($plugin)->toHaveKeys(['name', 'package', 'description', 'author', 'category', 'renderers', 'alfakit', 'links'], $label)
            ->and(array_diff(array_keys($plugin), ['name', 'package', 'description', 'author', 'category', 'renderers', 'alfakit', 'links', 'firstParty']))->toBe([], "{$label} has unknown keys")
            ->and($plugin['name'])->toBeString()->not->toBeEmpty()
            ->and($plugin['package'])->toMatch('#^[a-z0-9]([_.-]?[a-z0-9]+)*/[a-z0-9](([_.]?|-{0,2})[a-z0-9]+)*$#')
            ->and(strlen($plugin['description']))->toBeGreaterThan(20)->toBeLessThan(400)
            ->and($plugin['author']['name'] ?? null)->toBeString()
            ->and(array_keys($data['categories']))->toContain($plugin['category'])
            ->and($plugin['renderers'])->toBeArray()->not->toBeEmpty()
            ->and(array_diff($plugin['renderers'], Plugins::RENDERERS))->toBe([], "{$label} has an unknown renderer")
            ->and($plugin['alfakit'])->toBeString()->not->toBeEmpty()
            ->and($plugin['links']['repository'] ?? null)->toStartWith('https://');

        foreach ($plugin['links'] as $key => $url) {
            expect(['repository', 'docs', 'packagist', 'npm'])->toContain($key)
                ->and(str_starts_with($url, 'https://') || str_starts_with($url, '/docs/'))->toBeTrue("{$label}.links.{$key} must be https:// or /docs/");
        }

        if (isset($plugin['author']['url'])) {
            expect($plugin['author']['url'])->toStartWith('https://');
        }

        $packages[] = $plugin['package'];
    }

    expect($packages)->toHaveCount(count(array_unique($packages)));
});

it('lists first-party plugins that exist in the repository', function () {
    foreach (app(Plugins::class)->all()['plugins'] as $plugin) {
        if (! ($plugin['firstParty'] ?? false)) {
            continue;
        }

        $composer = collect([...glob(dirname(base_path()).'/packages/*/composer.json'), ...glob(dirname(base_path()).'/packages/plugins/*/composer.json')])
            ->map(fn (string $file) => json_decode((string) file_get_contents($file), true)['name'] ?? null);

        expect($composer)->toContain($plugin['package']);
    }
});

it('passes the plugins, categories and renderers to the directory page', function () {
    $this->get('/plugins')->assertInertia(fn ($page) => $page
        ->component('site/plugins/index')
        ->where('plugins.0.firstParty', true)
        ->where('plugins', fn ($plugins) => collect($plugins)->contains('package', 'alfasix/alfakit-translations'))
        ->where('renderers', Plugins::RENDERERS)
        ->has('categories.localization'));
});

it('has a showcase page for every first-party plugin', function () {
    $showcase = app(Showcase::class);
    $slugs = $showcase->slugs();

    expect($slugs)->toContain('kanban', 'forms', 'helpdesk', 'analytics')->toHaveCount(count(glob(dirname(base_path()).'/packages/plugins/*/composer.json')));

    foreach ($slugs as $slug) {
        $this->get('/plugins/'.$slug)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('site/plugins/show')
                ->where('plugin.slug', $slug)
                ->where('plugin.install', 'php artisan alfakit:add '.$slug)
                ->where('plugin.docsUrl', '/docs/plugins/'.$slug)
                ->where('plugin.highlights', fn ($items) => count($items) >= 5 && count($items) <= 8)
                ->where('plugin.tour', fn ($items) => count($items) >= 3 && count($items) <= 5)
                ->has('plugin.demo.react')
                ->has('plugin.demo.vue')
                ->has('plugin.demo.svelte')
                ->has('plugin.clips')
                ->where('plugin.snippet', fn ($snippet) => $snippet === null || is_string($snippet))
                ->where('seo.canonical', url('/plugins/'.$slug)));
    }

    $this->get('/plugins/not-a-plugin')->assertNotFound();
});

it('links the live demo from the configurable base URL and tenant', function () {
    config(['docs.demo_url' => 'https://demo.example.com', 'docs.demo_tenant' => 'dubai']);

    $this->get('/plugins/kanban')->assertInertia(fn ($page) => $page
        ->where('plugin.demo.react', 'https://demo.example.com/react/admin/dubai/orders/board')
        ->where('plugin.demo.svelte', 'https://demo.example.com/svelte/admin/dubai/orders/board')
        ->where('plugin.worksWith.0.slug', 'workflows')
        ->where('plugin.bundles', ['Back office'])
        ->where('plugin.snippet', fn (string $snippet) => str_contains($snippet, 'KanbanPlugin')));
});

it('only lists clips that were recorded', function () {
    $page = app(Showcase::class)->page('kanban');

    foreach ($page['clips'] as $variant => $clip) {
        expect($variant)->toMatch('/^(react|vue|svelte)-(light|dark)$/')
            ->and(file_exists(public_path(ltrim($clip['video'], '/'))))->toBeTrue();
    }
});

it('shows the plugin bundles and the showcase links on the directory page', function () {
    $this->get('/plugins')->assertInertia(fn ($page) => $page
        ->where('bundles.0.name', 'saas')
        ->where('bundles.0.command', 'php artisan alfakit:setup --bundle=saas')
        ->where('bundles', fn ($bundles) => collect($bundles)->pluck('name')->all() === ['saas', 'content', 'backoffice', 'support', 'ops'])
        ->where('showcases', fn ($slugs) => collect($slugs)->contains('kanban')));

    expect($this->get('/sitemap.xml')->getContent())->toContain(url('/plugins/kanban'));
});
