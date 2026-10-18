<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Localization\LocaleResolver;
use App\Demo\Shop;
use App\Features\WholesaleEnquiries;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Pennant\Feature;

dataset('plugin renderers', ['react', 'vue', 'svelte']);

beforeEach(function (): void {
    DemoSeeder::$scale = 0.05;
    $this->seed(DatabaseSeeder::class);
    DemoSeeder::$scale = null;
});

it('renders CMS pages inside every storefront with the menu and plugin props', function (string $renderer): void {
    $this->get("/{$renderer}/pages/our-house")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Storefront/CmsPage', false)
            ->where('renderer', $renderer)
            ->where('cms.page.title', 'Our house')
            ->where('cms.admin', null)
            ->has('cms.page.blocks', 3)
            ->where('plugins.chat', true)
            ->where('plugins.wholesale', true)
            ->has('plugins.menu', 3)
            ->where('plugins.analyticsKey', 'maison-alfa-manama'));

    $this->get("/{$renderer}/pages/no-such-page")->assertNotFound();
    $this->get("/{$renderer}/pages/corporate-gifting")->assertNotFound(); // a draft
})->with('plugin renderers');

it('shows the CMS editing bar to signed-in staff', function (): void {
    $user = User::query()->where('email', User::DEMO_EMAIL)->firstOrFail();

    $this->actingAs($user)->get('/vue/pages/our-house')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('cms.admin.editUrl', fn (string $url): bool => str_contains($url, '/vue/admin/manama/cms/pages/')));
});

it('serves the Arabic translation to the Arabic storefront', function (): void {
    $this->withSession(['alfakit.locale' => 'ar'])->get('/svelte/pages/our-house')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('cms.page.title', 'دارنا'));
})->skip(fn (): bool => ! class_exists(LocaleResolver::class));

it('embeds the wholesale form and follows its feature flag', function (string $renderer): void {
    $this->get("/{$renderer}/wholesale")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Storefront/Wholesale', false)->whereNot('form', null));

    Feature::for(Shop::store())->deactivate(WholesaleEnquiries::class);

    $this->get("/{$renderer}/wholesale")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('form', null));
})->with('plugin renderers');

it('renders the helpdesk portal, the public form page and the chat endpoint in the last storefront', function (): void {
    $this->get('/vue')->assertOk();

    $this->get('/support/contact')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Storefront/Support', false)->where('renderer', 'vue'));

    $this->get('/forms/wholesale')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Storefront/Form', false));

    $this->getJson('/support/chat')->assertOk();
});

it('switches the renderer of the shared plugin pages through the session', function (): void {
    $this->get('/demo/renderer/svelte?back=/support/contact')->assertRedirect('/support/contact');

    $this->get('/support/contact')->assertInertia(fn (Assert $page) => $page->where('renderer', 'svelte'));
});
