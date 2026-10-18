<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Tests;

use AlfaSix\Alfakit\Tests\Fixtures\Models\User;
use AlfaSix\AlfakitActivityLog\ActivityLogPlugin;
use Illuminate\Testing\TestResponse;
use RuntimeException;
use Spatie\Activitylog\Models\Activity;

/**
 * Perform an Inertia GET as the renderer does.
 *
 * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
 */
function inertiaGet(string $url): TestResponse
{
    return \Pest\Laravel\get($url, ['X-Inertia' => 'true', 'X-Inertia-Version' => '']);
}

/**
 * Fetch an Inertia page and return its props.
 *
 * @return array<string, mixed>
 */
function inertiaProps(string $url): array
{
    $response = inertiaGet($url);
    $response->assertOk();

    return $response->json('props');
}

function makeUser(string $name = 'Ada Admin'): User
{
    return User::query()->create(['name' => $name, 'email' => uniqid('user', true).'@example.com', 'password' => 'password']);
}

function plugin(string $panel = 'activity'): ActivityLogPlugin
{
    $plugin = alfakit()->getPanel($panel)->getPlugin(ActivityLogPlugin::ID);

    return $plugin instanceof ActivityLogPlugin ? $plugin : throw new RuntimeException('The activity log plugin is not registered.');
}

/**
 * The activity `activity()->log()` returned, as the model.
 */
function logged(mixed $activity): Activity
{
    return $activity instanceof Activity ? $activity : throw new RuntimeException('No activity was logged.');
}
