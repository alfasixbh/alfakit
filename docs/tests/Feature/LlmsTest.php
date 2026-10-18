<?php

it('serves an llms.txt index of every documentation page', function () {
    $response = $this->get('/llms.txt')->assertOk()->assertHeader('Content-Type', 'text/plain; charset=UTF-8');

    expect($response->getContent())
        ->toStartWith('# AlfaKit')
        ->toContain('> AlfaKit by Alfa Six (`alfasix/alfakit`)')
        ->toContain('## Getting started')
        ->toContain('/docs/getting-started/installation.md');
});

it('serves the whole documentation as one file', function () {
    expect($this->get('/llms-full.txt')->assertOk()->getContent())
        ->toContain('# Installation')
        ->toContain('# Themes')
        ->not->toContain("\ntitle: ");
});

it('serves single pages as markdown', function () {
    $this->get('/docs/design/themes.md')
        ->assertOk()
        ->assertHeader('Content-Type', 'text/markdown; charset=UTF-8')
        ->assertSee('# Themes', false);

    $this->get('/docs/does-not-exist.md')->assertNotFound();
});

it('renders the AI agents landing page with the packaged skills', function () {
    $this->get('/ai')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('ai')
            ->has('skills', count(glob(base_path('vendor/alfasix/alfakit/resources/boost/skills/*'), GLOB_ONLYDIR)))
            ->where('skills.0.name', 'alfakit-design')
            ->where('urls.llms', url('/llms.txt')));
});
