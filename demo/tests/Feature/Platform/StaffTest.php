<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Auth\Impersonation\Impersonation;
use App\Enums\StaffRole;
use App\Models\Store;
use App\Models\User;
use App\Notifications\StaffInvitation;
use Illuminate\Support\Facades\Notification;

/**
 * @return array{owner: User, manager: User, staff: User, admin: User, store: Store}
 */
function platformStaff(): array
{
    $store = Store::factory()->create();
    $users = [];

    foreach (['owner' => StaffRole::Owner, 'manager' => StaffRole::Manager, 'staff' => StaffRole::Staff] as $key => $role) {
        $users[$key] = User::factory()->create(['name' => ucfirst($key).' Person']);
        $users[$key]->stores()->attach($store, ['role' => $role->value]);
    }

    $users['admin'] = User::factory()->admin()->create(['name' => 'Admin Person']);
    $users['admin']->stores()->attach($store, ['role' => StaffRole::Staff->value]);

    return [...$users, 'store' => $store];
}

it('lists the team for managers and hides it from staff', function (): void {
    ['owner' => $owner, 'staff' => $staff, 'store' => $store] = platformStaff();

    $response = $this->actingAs($owner)->get("/react/admin/{$store->slug}/staff")->assertOk();
    $json = json_encode($response->viewData('page')['props'], JSON_THROW_ON_ERROR);

    expect($json)->toContain('Manager Person')->toContain('Invite a colleague')->toContain('Two-factor');

    $this->actingAs($staff)->get("/react/admin/{$store->slug}/staff")->assertForbidden();
});

it('invites a colleague and logs the invitation mail', function (): void {
    Notification::fake();

    ['owner' => $owner, 'store' => $store] = platformStaff();

    $page = $this->actingAs($owner)->get("/react/admin/{$store->slug}/staff")->assertOk();
    $token = $page->viewData('page')['props']['page']['token'];

    $this->postJson("/react/admin/{$store->slug}/_alfakit/actions", [
        'token' => $token,
        'action' => 'invite',
        'data' => ['name' => 'Rania Haddad', 'email' => 'rania@maison-alfa.test', 'title' => 'Sales associate', 'role' => 'manager'],
    ])->assertSuccessful();

    $invited = User::query()->where('email', 'rania@maison-alfa.test')->firstOrFail();

    expect($invited->invited_at)->not->toBeNull()
        ->and($invited->email_verified_at)->toBeNull()
        ->and($invited->roleIn($store))->toBe(StaffRole::Manager);

    Notification::assertSentTo($invited, StaffInvitation::class, fn (StaffInvitation $mail): bool => $mail->store->is($store) && $mail->role === StaffRole::Manager);
});

it('lets only the demo account impersonate, and only lower roles', function (): void {
    ['owner' => $owner, 'manager' => $manager, 'staff' => $staff, 'admin' => $admin, 'store' => $store] = platformStaff();
    $panel = alfakit()->getPanel('react');

    // Policies compare roles in the current tenant, so put the request in that store.
    alfakit()->setCurrentPanel($panel);
    alfakit()->setTenant($store);

    // A regular owner can't: on the public demo only the shared account signs in as others.
    expect(Impersonation::canImpersonate($panel, $owner, $staff))->toBeFalse();

    $owner->update(['email' => User::DEMO_EMAIL]);

    expect(Impersonation::canImpersonate($panel, $owner, $staff))->toBeTrue()
        ->and(Impersonation::canImpersonate($panel, $owner, $manager))->toBeTrue()
        ->and(Impersonation::canImpersonate($panel, $owner, $admin))->toBeFalse()
        ->and(Impersonation::canImpersonate($panel, $owner, $owner))->toBeFalse()
        ->and(Impersonation::canImpersonate($panel, $manager, $staff))->toBeFalse()
        ->and(Impersonation::canImpersonate($panel, $staff, $manager))->toBeFalse();
});

it('edits a colleague and syncs the role on the pivot', function (): void {
    ['owner' => $owner, 'staff' => $staff, 'store' => $store] = platformStaff();

    $page = $this->actingAs($owner)->get("/react/admin/{$store->slug}/staff/{$staff->id}/edit")->assertOk();
    $token = $page->viewData('page')['props']['page']['token'];

    $this->postJson("/react/admin/{$store->slug}/_alfakit/actions", [
        'token' => $token,
        'action' => 'save',
        'data' => ['name' => 'Staff Person', 'email' => $staff->email, 'title' => 'Perfumer', 'locale' => 'ar', 'timezone' => 'Asia/Dubai', 'role' => 'manager'],
    ])->assertRedirect();

    $staff->refresh();

    expect($staff->title)->toBe('Perfumer')
        ->and($staff->locale)->toBe('ar')
        ->and($staff->roleIn($store))->toBe(StaffRole::Manager);
});
