<?php

declare(strict_types=1);

use App\Alfakit\Auth\EditProfile;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

/*
 * Safeguards of the public demo: the shared account stays usable for the next visitor,
 * uploads are throttled, errors and head tags are branded.
 */

/** @return array{User, Store} */
function publicDemo(): array
{
    DemoSeeder::$scale = 0.05;
    test()->seed(DatabaseSeeder::class);
    DemoSeeder::$scale = null;

    $user = User::query()->where('email', User::DEMO_EMAIL)->firstOrFail();

    return [$user, $user->stores()->where('slug', 'manama')->firstOrFail()];
}

it('locks the e-mail, password and second factors of the shared account', function (string $renderer): void {
    [$user, $store] = publicDemo();
    test()->actingAs($user);

    $page = alfakit()->testPage(EditProfile::class, ['tenant' => $store], $renderer)->assertOk();
    $json = json_encode($page->getProps('page'), JSON_THROW_ON_ERROR);

    expect($json)->toContain(__('demo.profile.locked_heading'))
        ->toContain(__('demo.profile.mfa_heading'))
        ->not->toContain('"current_password"')
        ->not->toContain('"password_confirmation"');

    // Even a crafted request can only change the display name.
    $page->fillForm(['name' => 'Visitor', 'email' => 'taken@example.com', 'password' => 'hijacked-123'])
        ->call('save')
        ->assertHasNoFormErrors();

    $user->refresh();

    expect($user->name)->toBe('Visitor')
        ->and($user->email)->toBe(User::DEMO_EMAIL)
        ->and(Hash::check(User::DEMO_PASSWORD, $user->password))->toBeTrue();
})->with(['react', 'vue', 'svelte']);

it('keeps the full profile page for other accounts', function (): void {
    [, $store] = publicDemo();
    $colleague = $store->users()->where('email', '!=', User::DEMO_EMAIL)->firstOrFail();
    test()->actingAs($colleague);

    $json = json_encode(alfakit()->testPage(EditProfile::class, ['tenant' => $store], 'react')->assertOk()->getProps('page'), JSON_THROW_ON_ERROR);

    expect($json)->toContain('"current_password"')->not->toContain(__('demo.profile.locked_heading'));
});

it('throttles uploads per visitor', function (): void {
    [$user, $store] = publicDemo();
    RateLimiter::clear('minute:'.$user->getKey());

    $statuses = [];

    for ($i = 0; $i < 21; $i++) {
        $statuses[] = $this->actingAs($user)
            ->post("/react/admin/{$store->slug}/_alfakit/uploads", ['file' => UploadedFile::fake()->image("bottle-{$i}.png", 20, 20)])
            ->getStatusCode();
    }

    expect(array_slice($statuses, 0, 20))->not->toContain(429)
        ->and($statuses[20])->toBe(429);
});

it('shows the reset countdown and the demo credentials', function (): void {
    [$user, $store] = publicDemo();

    $this->get('/vue/admin/login')->assertOk()->assertSee(__('demo.login.about'))->assertSee(User::DEMO_EMAIL);

    $json = json_encode($this->actingAs($user)->get("/vue/admin/{$store->slug}")->assertOk()->viewData('page')['props'], JSON_THROW_ON_ERROR);

    expect($json)->toContain('reset-countdown');
});

it('renders branded error pages and social meta tags', function (): void {
    $this->get('/svelte/no-such-page')->assertNotFound()->assertSee(__('demo.errors.404.title'))->assertSee('/svelte/admin');

    $this->get('/react')->assertOk()
        ->assertSee('og:image', false)
        ->assertSee('/brand/alfakit-social-card.png', false)
        ->assertSee(__('demo.meta.description'));
});

it('sends a signed-in visitor from a login page to that renderer\'s panel', function (): void {
    [$user] = publicDemo();

    $this->actingAs($user)->get('/vue/admin/login')->assertRedirect('/vue/admin');
    $this->actingAs($user)->get('/svelte/admin/login')->assertRedirect('/svelte/admin');
});

it('lets the demo account switch store from the top bar layout', function (): void {
    [$user] = publicDemo();

    // The demo account manages Dubai, so Dubai uses the top bar layout.
    $props = $this->actingAs($user)->get('/react/admin/dubai')->assertOk()->viewData('page')['props']['alfakit'];

    expect(json_encode($props, JSON_THROW_ON_ERROR))->toContain('"layout":"topbar"')
        ->and(collect($props['tenancy']['tenants'])->pluck('name')->all())->toContain('Maison Alfa Manama', 'Maison Alfa London');
});

it('gives every store a distinct avatar', function (): void {
    publicDemo();

    $avatars = Store::query()->get()->map->getAlfakitAvatarUrl();

    expect($avatars->unique())->toHaveCount(Store::query()->count());
});
