<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Theming\Slot;
use App\Alfakit\Pages\Dashboard;
use App\Alfakit\Pages\Showcase\ShowcaseAccessibility;
use App\Alfakit\Pages\Showcase\ShowcaseActions;
use App\Alfakit\Pages\Showcase\ShowcaseAiAgents;
use App\Alfakit\Pages\Showcase\ShowcaseFields;
use App\Alfakit\Pages\Showcase\ShowcaseLayouts;
use App\Alfakit\Pages\Showcase\ShowcasePerformance;
use App\Alfakit\Pages\Showcase\ShowcaseTables;
use App\Alfakit\Pages\Showcase\ShowcaseTheming;
use App\Demo\Nav;
use App\Demo\Tour;
use App\Enums\StaffRole;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;

/*
 * The Showcase navigation group: every page renders in every renderer with its translated
 * title and intro, and the dashboard's feature-tour banner is scoped and dismissible.
 */
dataset('renderers', ['react', 'vue', 'svelte']);

dataset('showcase pages', [
    'fields' => [ShowcaseFields::class],
    'layouts' => [ShowcaseLayouts::class],
    'actions' => [ShowcaseActions::class],
    'tables' => [ShowcaseTables::class],
    'theming' => [ShowcaseTheming::class],
    'performance' => [ShowcasePerformance::class],
    'accessibility' => [ShowcaseAccessibility::class],
    'ai' => [ShowcaseAiAgents::class],
]);

/** @return array{0: Store, 1: User} */
function showcaseStore(): array
{
    $store = Store::factory()->create();
    $user = User::factory()->create(['is_admin' => true]);
    $user->stores()->attach($store, ['role' => StaffRole::Owner->value]);
    Product::factory()->active()->count(3)->create(['store_id' => $store->id]);

    test()->actingAs($user);

    return [$store, $user];
}

it('renders every showcase page in every renderer', function (string $page, string $renderer): void {
    [$store] = showcaseStore();

    $response = $this->get("/{$renderer}/admin/{$store->slug}/".$page::getSlug())->assertOk();
    $props = $response->viewData('page')['props'];

    expect($props['alfakit']['id'])->toBe($renderer)
        ->and($props['page']['title'])->toBe($page::getNavigationLabel())
        ->and($props['page']['subheading'])->not->toBeEmpty()
        ->and($page::getNavigationGroup())->toBe(Nav::group(Nav::SHOWCASE));
})->with('showcase pages')->with('renderers');

it('lists the showcase pages in the navigation under their own group', function (): void {
    [$store] = showcaseStore();

    $props = $this->get("/react/admin/{$store->slug}")->assertOk()->viewData('page')['props'];
    $json = json_encode($props['alfakit']['navigation']);

    expect($json)->toContain(Nav::group(Nav::SHOWCASE))
        ->and($json)->toContain(ShowcaseFields::getNavigationLabel())
        ->and($json)->toContain(ShowcaseTheming::getNavigationLabel());
});

it('ships the custom readout and stock meter components in the schemas', function (): void {
    [$store] = showcaseStore();

    $performance = json_encode($this->get("/vue/admin/{$store->slug}/".ShowcasePerformance::getSlug())->assertOk()->viewData('page')['props']['page']);
    $tables = json_encode($this->get("/vue/admin/{$store->slug}/".ShowcaseTables::getSlug())->assertOk()->viewData('page')['props']['page']);

    expect($performance)->toContain('demo-perf-readout')
        ->and($tables)->toContain('demo-stock-meter');
});

it('shows the feature-tour banner on the dashboard only, until it is dismissed', function (): void {
    [$store] = showcaseStore();

    $slots = fn (string $path): string => collect($this->get($path)->assertOk()->viewData('page')['props']['alfakit']['slots'][Slot::PAGE_HEADER_BEFORE] ?? [])->pluck('html')->implode('');

    $dashboard = "/react/admin/{$store->slug}";

    expect($slots($dashboard))->toContain('data-slot="tour-banner"')
        ->toContain(__('showcase.tour.heading'))
        ->toContain(ShowcaseFields::getSlug())
        ->toContain(ShowcaseTheming::getSlug())
        ->and($slots("/react/admin/{$store->slug}/".ShowcaseFields::getSlug()))->not->toContain('tour-banner')
        ->and(Tour::scopes())->toContain(AlfaSix\Alfakit\Pages\Dashboard::class)
        ->and(is_subclass_of(Dashboard::class, AlfaSix\Alfakit\Pages\Dashboard::class))->toBeTrue();

    $this->get('/demo/tour/dismiss?back='.urlencode($dashboard))->assertRedirect($dashboard);

    expect($slots($dashboard))->not->toContain('tour-banner');
});
