<?php

// Page rendering is tested without the built assets.
beforeEach(fn () => $this->withoutVite());

use AlfaSix\AlfakitAnalytics\AlfakitAnalyticsServiceProvider;
use AlfaSix\AlfakitAnalytics\Models\Site;
use AlfaSix\AlfakitForms\AlfakitFormsServiceProvider;
use AlfaSix\AlfakitForms\Models\Form;
use AlfaSix\AlfakitHelpdesk\AlfakitHelpdeskServiceProvider;
use App\Support\Site\Dogfood;
use Illuminate\Support\Facades\Route;

/*
 * The website on AlfaKit's own plugins (config docs.dogfood): off by default, so the site
 * works without them; each part turns on with its config key.
 */

it('runs without the plugins by default', function () {
    expect(Dogfood::providers())->toBe([])
        ->and(app()->getProviders(AlfakitFormsServiceProvider::class))->toBe([])
        ->and(Route::has('alfakit-forms.show'))->toBeFalse();

    $this->get('/contact')->assertOk()->assertInertia(fn ($page) => $page
        ->component('site/contact')
        ->where('form', null)
        ->where('dogfood.analytics', null)
        ->where('dogfood.chat', null)
        ->where('dogfood.contact', false)
        ->has('links.discussions'));

    $this->artisan('docs:dogfood')->expectsOutputToContain('No plugin is turned on')->assertSuccessful();
});

it('lists the plugin providers that are turned on', function () {
    config(['docs.dogfood.forms.enabled' => true, 'docs.dogfood.helpdesk.enabled' => true]);

    expect(Dogfood::providers())->toBe([AlfakitFormsServiceProvider::class, AlfakitHelpdeskServiceProvider::class]);
});

it('embeds the Forms contact form on /contact once it is set up', function () {
    config(['docs.dogfood.forms.enabled' => true]);
    app()->register(AlfakitFormsServiceProvider::class);

    $this->get('/contact')->assertOk()->assertInertia(fn ($page) => $page->where('form', null));

    $this->artisan('docs:dogfood')->expectsOutputToContain('/contact form')->assertSuccessful();
    $this->artisan('docs:dogfood')->assertSuccessful();

    expect(Form::query()->where('slug', 'contact')->count())->toBe(1);

    $this->get('/contact')->assertOk()->assertInertia(fn ($page) => $page
        ->component('site/contact')
        ->where('dogfood.contact', true)
        ->where('form.alfakit', 'standalone')
        ->has('form.content')
        ->has('form.token'));
});

it('passes the tracker site key and the public dashboard link when analytics is on', function () {
    config(['docs.dogfood.analytics.enabled' => true, 'docs.dogfood.analytics.share' => true]);
    app()->register(AlfakitAnalyticsServiceProvider::class);
    app('router')->getRoutes()->refreshNameLookups();

    $this->artisan('docs:dogfood')->expectsOutputToContain('public dashboard')->assertSuccessful();

    $site = Site::query()->where('key', 'alfakit-docs')->firstOrFail();

    expect($site->is_shared)->toBeTrue()->and($site->share_token)->not->toBeEmpty();

    $this->get('/features')->assertOk()->assertInertia(fn ($page) => $page
        ->where('dogfood.analytics.siteKey', 'alfakit-docs')
        ->where('dogfood.analytics.shareUrl', fn (?string $url) => is_string($url) && str_contains($url, '/share/')));

    config(['docs.dogfood.analytics.share' => false]);

    $this->get('/features')->assertInertia(fn ($page) => $page->where('dogfood.analytics.shareUrl', null));
});

it('passes the chat endpoint when the helpdesk chat is on', function () {
    config(['docs.dogfood.helpdesk.enabled' => true]);
    app()->register(AlfakitHelpdeskServiceProvider::class);

    $this->get('/')->assertOk()->assertInertia(fn ($page) => $page->where('dogfood.chat.endpoint', '/support/chat'));
});
