<?php

use App\Support\Documentation;

it('shares the configured demo URL with every page', function () {
    config(['docs.demo_url' => 'https://demo.example.test']);

    $this->get('/')->assertOk()->assertInertia(fn ($page) => $page->where('demoUrl', 'https://demo.example.test'));
});

it('rewrites the canonical demo URL in the demo page', function () {
    config(['docs.demo_url' => 'https://demo.example.test']);

    $page = app(Documentation::class)->page('getting-started/demo');

    expect($page['html'])->toContain('https://demo.example.test/react/admin')
        ->not->toContain(Documentation::CANONICAL_DEMO_URL)
        ->and(app(Documentation::class)->markdown('getting-started/demo'))->toContain('https://demo.example.test/vue');
});
