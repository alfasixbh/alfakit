<?php

// Page rendering is tested without the built assets.
beforeEach(fn () => $this->withoutVite());

use App\Http\Controllers\Site\SeoController;
use App\Support\Documentation;
use App\Support\Site\Blog;

it('lists every public page, docs page and blog post in the sitemap', function () {
    $response = $this->get('/sitemap.xml')->assertOk()->assertHeader('Content-Type', 'application/xml; charset=UTF-8');

    $xml = simplexml_load_string((string) $response->getContent());
    expect($xml)->not->toBeFalse();

    $locations = array_map('strval', $xml->xpath('//*[local-name()="loc"]') ?: []);

    foreach (SeoController::PAGES as $path) {
        expect($locations)->toContain(url($path));
    }

    foreach (app(Documentation::class)->sidebar() as $section) {
        foreach ($section['items'] as $item) {
            expect($locations)->toContain(url('/docs/'.$item['slug']));
        }
    }

    foreach (app(Blog::class)->posts() as $post) {
        expect($locations)->toContain(url('/blog/'.$post['slug']));
    }

    expect($locations)->toHaveCount(count(array_unique($locations)));
});

it('allows all crawlers and points to the sitemap', function () {
    expect($this->get('/robots.txt')->assertOk()->getContent())
        ->toContain("User-agent: *\nAllow: /")
        ->toContain('Sitemap: '.url('/sitemap.xml'));
});

it('serves a valid RSS feed of the blog', function () {
    $response = $this->get('/blog/rss.xml')->assertOk()->assertHeader('Content-Type', 'application/rss+xml; charset=UTF-8');

    $xml = simplexml_load_string((string) $response->getContent());

    expect($xml)->not->toBeFalse()
        ->and((string) $xml['version'])->toBe('2.0')
        ->and((string) $xml->channel->title)->toBe('AlfaKit blog')
        ->and($xml->channel->item)->toHaveCount(count(app(Blog::class)->posts()));

    foreach ($xml->channel->item as $item) {
        expect((string) $item->link)->toStartWith(url('/blog/'))
            ->and(strtotime((string) $item->pubDate))->toBeInt();
    }
});
