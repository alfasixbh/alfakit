<?php

declare(strict_types=1);

use App\Enums\StaffRole;
use App\Models\Store;
use App\Models\User;

/** The three panels share one configuration; each is exercised with the demo account. */
dataset('renderers', ['react', 'vue', 'svelte']);

function demoUser(): User
{
    $user = User::factory()->create(['email' => User::DEMO_EMAIL, 'password' => User::DEMO_PASSWORD]);

    foreach (Store::factory()->count(2)->create() as $index => $store) {
        $user->stores()->attach($store, ['role' => $index === 0 ? StaffRole::Owner->value : StaffRole::Staff->value]);
    }

    return $user;
}

it('shows the demo credentials on the login page', function (string $renderer): void {
    $response = $this->get("/{$renderer}/admin/login")->assertOk();
    $props = $response->viewData('page')['props'];

    expect($props['alfakit']['id'])->toBe($renderer)
        ->and($props['alfakit']['brandName'])->toContain('Maison Alfa')
        ->and(collect($props['alfakit']['slots']['auth.before'] ?? [])->pluck('html')->implode(''))->toContain(User::DEMO_EMAIL);
})->with('renderers');

it('logs in with the demo account and loads the dashboard', function (string $renderer): void {
    demoUser();

    $login = $this->get("/{$renderer}/admin/login");
    $token = $login->viewData('page')['props']['page']['token'];

    $this->postJson("/{$renderer}/admin/_alfakit/actions", [
        'token' => $token,
        'action' => 'authenticate',
        'data' => ['email' => User::DEMO_EMAIL, 'password' => User::DEMO_PASSWORD],
    ])->assertRedirect();

    $this->assertAuthenticated();

    $store = Store::query()->orderBy('id')->firstOrFail();

    $this->get("/{$renderer}/admin")->assertRedirect("/{$renderer}/admin/{$store->slug}");

    $dashboard = $this->get("/{$renderer}/admin/{$store->slug}")->assertOk();
    $props = $dashboard->viewData('page')['props'];

    expect($props['alfakit']['id'])->toBe($renderer)
        ->and($props['alfakit']['tenancy']['current']['name'])->toBe($store->name)
        ->and($props['alfakit']['tenancy']['tenants'])->toHaveCount(2)
        ->and(collect($props['alfakit']['slots']['topbar.end'])->pluck('html')->implode(''))->toContain("/vue/admin/{$store->slug}")
        ->and($props['alfakit']['localization']['direction'])->toBe('ltr');
})->with('renderers');

it('renders the renderer switcher for the current page under every prefix', function (): void {
    $user = demoUser();
    $store = $user->stores->first();

    $response = $this->actingAs($user)->get("/vue/admin/{$store->slug}?foo=bar")->assertOk();
    $html = collect($response->viewData('page')['props']['alfakit']['slots']['topbar.end'])->pluck('html')->implode('');

    expect($html)->toContain("href=\"/react/admin/{$store->slug}?foo=bar\"")
        ->toContain("href=\"/svelte/admin/{$store->slug}?foo=bar\"")
        ->toContain('aria-current="page"');
});

it('switches to Arabic and renders right to left', function (): void {
    $user = demoUser();
    $user->update(['locale' => 'ar']);
    $store = $user->stores->first();

    $props = $this->actingAs($user)->get("/react/admin/{$store->slug}")->assertOk()->viewData('page')['props'];

    expect($props['alfakit']['localization']['direction'])->toBe('rtl');
});
