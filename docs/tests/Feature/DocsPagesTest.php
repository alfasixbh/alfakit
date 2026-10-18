<?php

use App\Support\Documentation;

/*
 * Every page in the sidebar must render: a front-matter typo (an unquoted colon in a
 * description, for example) otherwise only shows up as a 500 in the browser.
 */
it('renders every documentation page', function () {
    $docs = app(Documentation::class);
    $slugs = collect($docs->sidebar())->flatMap(fn (array $section) => collect($section['items'])->pluck('slug'));

    expect($slugs)->not->toBeEmpty();

    foreach ($slugs as $slug) {
        $response = $this->get('/docs/'.$slug);

        expect($response->status())->toBe(200, "Page [{$slug}] did not render: ".substr((string) $response->getContent(), 0, 200));
    }
});

it('renders every page as markdown for agents', function () {
    $slugs = collect(app(Documentation::class)->sidebar())->flatMap(fn (array $section) => collect($section['items'])->pluck('slug'));

    foreach ($slugs as $slug) {
        $this->get('/docs/'.$slug.'.md')->assertOk();
    }
});
