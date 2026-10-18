<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Notifications\DatabaseNotificationScope;
use App\Enums\StaffRole;
use App\Models\Store;
use App\Models\User;
use Illuminate\Testing\TestResponse;

/**
 * @return array{0: User, 1: Store, 2: Store}
 */
function platformTeam(): array
{
    $owner = User::factory()->create();
    [$home, $other] = Store::factory()->count(2)->create()->all();

    $owner->stores()->attach($home, ['role' => StaffRole::Owner->value]);
    $owner->stores()->attach($other, ['role' => StaffRole::Staff->value]);

    return [$owner, $home, $other];
}

function platformProps(TestResponse $response): array
{
    return $response->viewData('page')['props'];
}

it('renders the overview with its filters form, widgets and header action', function (string $renderer): void {
    [$owner, $home] = platformTeam();

    $response = $this->actingAs($owner)->get("/{$renderer}/admin/{$home->slug}")->assertOk();
    $json = json_encode(platformProps($response), JSON_THROW_ON_ERROR);

    expect($json)
        ->toContain('startDate')
        ->toContain('endDate')
        ->toContain('Live updates')
        ->toContain('Send me a test notification')
        ->toContain('app-alfakit-widgets-store-stats')
        ->toContain('app-alfakit-widgets-revenue-chart')
        ->toContain('app-alfakit-widgets-orders-by-status-chart')
        ->toContain('app-alfakit-widgets-top-products-table')
        ->toContain('demo-latest-reviews')
        ->toContain('"lazy":true');
})->with(['react', 'vue', 'svelte']);

it('stores a tenant-aware database notification from the dashboard action', function (): void {
    [$owner, $home, $other] = platformTeam();

    $page = $this->actingAs($owner)->get("/react/admin/{$home->slug}")->assertOk();
    $token = platformProps($page)['page']['token'];

    $this->postJson("/react/admin/{$home->slug}/_alfakit/actions", [
        'token' => $token,
        'action' => 'testNotification',
        'data' => [],
    ])->assertSuccessful();

    expect($owner->notifications()->count())->toBe(1);

    $data = $owner->notifications()->first()?->data;

    expect($data['title'] ?? null)->toBe('A note from Maison Alfa')
        ->and($data[DatabaseNotificationScope::KEY] ?? null)->toBe(DatabaseNotificationScope::marker($home));

    // The same notification is listed in the home store but not while working in the other one.
    $home = json_encode(platformProps($this->actingAs($owner)->get("/react/admin/{$home->slug}/notifications")->assertOk()), JSON_THROW_ON_ERROR);
    $elsewhere = json_encode(platformProps($this->actingAs($owner)->get("/react/admin/{$other->slug}/notifications")->assertOk()), JSON_THROW_ON_ERROR);

    expect($home)->toContain('A note from Maison Alfa')
        ->and($elsewhere)->not->toContain('A note from Maison Alfa');
});

it('gives owners the sidebar and staff the top bar', function (): void {
    [$owner, $home, $other] = platformTeam();

    $asOwner = json_encode(platformProps($this->actingAs($owner)->get("/react/admin/{$home->slug}")->assertOk()), JSON_THROW_ON_ERROR);
    $asStaff = json_encode(platformProps($this->actingAs($owner)->get("/react/admin/{$other->slug}")->assertOk()), JSON_THROW_ON_ERROR);

    expect($asOwner)->toContain('"layout":"sidebar"')
        ->and($asStaff)->toContain('"layout":"topbar"');
});

it('enables multi-factor authentication, email-change verification, transactions and error notifications', function (): void {
    $panel = alfakit()->getPanel('react');

    expect($panel->hasMultiFactorAuthentication())->toBeTrue()
        ->and($panel->hasEmailChangeVerification())->toBeTrue()
        ->and($panel->hasErrorNotifications())->toBeTrue()
        ->and($panel->hasTenantRegistration())->toBeTrue()
        ->and($panel->hasTenantProfile())->toBeTrue()
        ->and($panel->hasTenantBilling())->toBeTrue()
        ->and($panel->isTenantSubscriptionRequired())->toBeFalse();
});
