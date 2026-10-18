<?php

// Page rendering is tested without the built assets.
beforeEach(fn () => $this->withoutVite());

use App\Support\Documentation;
use App\Support\Examples;

/*
 * Live examples: ```alfakit-example name="…"``` blocks in docs/content render the PHP class
 * of app/Examples next to its result in React, Vue and Svelte.
 */

it('has at least ten examples, each a standalone component that serialises', function () {
    $examples = app(Examples::class);

    expect($examples->names())->toHaveCount(14)->toContain('text-input-basic', 'table-basic', 'action-modal-form', 'layout-tabs');

    foreach ($examples->names() as $name) {
        $payload = json_decode((string) json_encode($examples->make($name)), true);

        expect($payload['alfakit'] ?? null)->toBe('standalone', $name)
            ->and($payload['token'] ?? null)->toBeString()
            ->and($examples->source($name))->toContain('namespace App\\Examples;');
    }
});

it('references only examples that exist, and uses every example on a page', function () {
    $examples = app(Examples::class);
    $used = [];

    foreach (glob(base_path('content/**/*.md')) ?: [] as $file) {
        foreach ($examples->referencedIn((string) file_get_contents($file)) as $name) {
            expect($examples->has($name))->toBeTrue("{$file} uses the unknown example {$name}");
            $used[] = $name;
        }
    }

    expect(array_diff($examples->names(), $used))->toBe([]);
});

it('mounts examples into their docs page with the code and the frames of each renderer', function () {
    $this->get('/docs/tables/overview')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('page.examples', ['table-basic'])
            ->where('page.html', fn (string $html) => str_contains($html, '<div data-alfakit-example="table-basic"></div>') && ! str_contains($html, 'alfakit-example name='))
            ->where('examples.table-basic.title', 'app/Examples/TableBasic.php')
            ->where('examples.table-basic.code', fn (string $code) => str_contains($code, 'class TableBasic extends StandaloneTable'))
            ->where('examples.table-basic.frames', [
                'react' => '/docs/examples/table-basic/react',
                'vue' => '/docs/examples/table-basic/vue',
                'svelte' => '/docs/examples/table-basic/svelte',
            ]));
});

it('renders each example in an iframe page per renderer', function (string $renderer) {
    foreach (app(Examples::class)->names() as $name) {
        $this->get("/docs/examples/{$name}/{$renderer}?theme=dark")
            ->assertOk()
            ->assertSee('class="dark"', false)
            ->assertInertia(fn ($page) => $page
                ->component('examples/frame', false)
                ->where('renderer', $renderer)
                ->where('example.alfakit', 'standalone'));
    }

    $this->get("/docs/examples/not-an-example/{$renderer}")->assertNotFound();
})->with(['react', 'vue', 'svelte']);

it('runs an example\'s submit on the server', function () {
    $component = app(Examples::class)->make('contact-form');
    $payload = json_decode((string) json_encode($component), true);

    expect($payload['endpoints'] ?? null)->toBeArray();
});

it('replaces examples with their PHP in the Markdown for agents', function () {
    $markdown = app(Documentation::class)->markdown('tables/overview');

    expect($markdown)->toContain("```php\n<?php\n\nnamespace App\\Examples;")
        ->toContain('class TableBasic')
        ->not->toContain('alfakit-example');
});
