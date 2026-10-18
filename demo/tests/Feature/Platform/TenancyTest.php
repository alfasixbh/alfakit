<?php

declare(strict_types=1);

use App\Enums\StaffRole;
use App\Models\Setting;
use App\Models\Store;
use App\Models\User;

/**
 * @return array{0: User, 1: Store}
 */
function platformOwner(): array
{
    $owner = User::factory()->create();
    $store = Store::factory()->create();
    $owner->stores()->attach($store, ['role' => StaffRole::Owner->value]);

    return [$owner, $store];
}

it('registers a new store and makes the user its owner', function (): void {
    [$owner, $store] = platformOwner();
    $panel = alfakit()->getPanel('react');

    $url = $panel->route('tenant.registration');

    $page = $this->actingAs($owner)->get($url)->assertOk();
    $token = $page->viewData('page')['props']['page']['token'];

    expect(json_encode($page->viewData('page')['props'], JSON_THROW_ON_ERROR))->toContain('Open a new store');

    $response = $this->postJson('/react/admin/_alfakit/actions', [
        'token' => $token,
        'action' => 'register',
        'data' => [
            'name' => 'Maison Alfa Jeddah',
            'slug' => 'jeddah',
            'tagline' => 'Atelier and tasting bar.',
            'city' => 'Jeddah',
            'country' => 'sa',
            'currency' => 'SAR',
            'timezone' => 'Asia/Riyadh',
            'brand_color' => '#F47A22',
        ],
    ]);
    $response->assertRedirect('/react/admin/jeddah');

    $jeddah = Store::query()->where('slug', 'jeddah')->firstOrFail();

    expect($jeddah->country)->toBe('SA')
        ->and($owner->roleIn($jeddah))->toBe(StaffRole::Owner)
        ->and(Setting::query()->where('store_id', $jeddah->id)->exists())->toBeTrue();
});

it('lets owners edit the store profile and keeps staff out', function (): void {
    [$owner, $store] = platformOwner();
    $staff = User::factory()->create();
    $staff->stores()->attach($store, ['role' => StaffRole::Staff->value]);
    $panel = alfakit()->getPanel('react');

    $url = $panel->route('tenant.profile', ['tenant' => $store]);

    $page = $this->actingAs($owner)->get($url)->assertOk();
    $token = $page->viewData('page')['props']['page']['token'];

    $this->postJson("/react/admin/{$store->slug}/_alfakit/actions", [
        'token' => $token,
        'action' => 'save',
        'data' => [
            'name' => 'Maison Alfa Flagship',
            'tagline' => $store->tagline,
            'city' => $store->city,
            'country' => $store->country,
            'email' => 'flagship@maison-alfa.test',
            'phone' => '+97317000000',
            'currency' => 'BHD',
            'timezone' => 'Asia/Bahrain',
            'brand_color' => '#073B78',
            'is_active' => true,
        ],
    ])->assertRedirect();

    $store->refresh();

    expect($store->name)->toBe('Maison Alfa Flagship')->and($store->currency)->toBe('BHD');

    $this->actingAs($staff)->get($url)->assertForbidden();
});

it('adds a billing entry to the tenant menu and renders the billing page', function (): void {
    [$owner, $store] = platformOwner();
    $panel = alfakit()->getPanel('react');

    $dashboard = $this->actingAs($owner)->get("/react/admin/{$store->slug}")->assertOk();
    $tenancy = $dashboard->viewData('page')['props']['alfakit']['tenancy'];
    $menu = collect($tenancy['menu'] ?? [])->pluck('url')->implode(' ');

    $billing = $panel->getTenantBillingUrl($store);

    expect($billing)->toEndWith("/react/admin/{$store->slug}/billing")
        ->and($menu)->toContain("/react/admin/{$store->slug}/billing")
        ->and($tenancy['registrationUrl'])->toBe($panel->route('tenant.registration'))
        ->and($tenancy['profileUrl'])->toBe($panel->route('tenant.profile', ['tenant' => $store]));

    $page = $this->actingAs($owner)->get((string) $billing)->assertOk();

    expect(json_encode($page->viewData('page')['props'], JSON_THROW_ON_ERROR))->toContain('Demo plan');
});
