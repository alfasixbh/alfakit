<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Testing\PageTester;
use AlfaSix\AlfakitTeams\Models\TeamInvitation;
use AlfaSix\AlfakitTeams\TeamsPlugin;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoSeeder;

/*
 * The Teams plugin runs on the store tenancy: stores are the teams, store staff the members
 * (with the store roles) and two invitations are seeded per store.
 */

dataset('teams renderers', ['react', 'vue', 'svelte']);

it('shows the store team, its members and invitations', function (string $renderer): void {
    DemoSeeder::$scale = 0.05;
    $this->seed(DatabaseSeeder::class);
    DemoSeeder::$scale = null;

    $user = User::query()->where('email', User::DEMO_EMAIL)->firstOrFail();
    $store = $user->stores()->orderBy('stores.id')->firstOrFail();
    $this->actingAs($user);

    expect(alfakit()->getPanel($renderer)->getPlugin('teams'))->toBeInstanceOf(TeamsPlugin::class)
        ->and($store->members()->count())->toBe($store->users()->count())
        ->and(TeamInvitation::query()->where('team_id', $store->getKey())->count())->toBe(2);

    $members = $this->get("/{$renderer}/admin/{$store->slug}/team/members", PageTester::inertiaHeaders())->assertOk()->json('props.page');
    $invitations = $this->get("/{$renderer}/admin/{$store->slug}/team/invitations", PageTester::inertiaHeaders())->assertOk()->json('props.page');

    expect(json_encode($members))->toContain($user->email)
        ->and(json_encode($invitations))->toContain("jordan.{$store->slug}@example.com");

    // The demo keeps its own store sign-up and store profile pages.
    expect(alfakit()->getPanel($renderer)->getTenantRegistrationLabel())->toBe(App\Alfakit\Tenancy\RegisterStore::getLabel())
        ->and(alfakit()->getPanel($renderer)->getTenantProfileLabel())->toBe(App\Alfakit\Tenancy\EditStore::getLabel());
})->with('teams renderers');
