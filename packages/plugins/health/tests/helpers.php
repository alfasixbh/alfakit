<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitHealth\Tests;

use AlfaSix\Alfakit\Tests\Fixtures\Models\User;
use AlfaSix\AlfakitHealth\HealthPlugin;
use Illuminate\Testing\TestResponse;
use ReflectionProperty;
use RuntimeException;
use Spatie\Health\ResultStores\InMemoryHealthResultStore;

/**
 * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
 */
function inertiaGet(string $url): TestResponse
{
    return \Pest\Laravel\get($url, ['X-Inertia' => 'true', 'X-Inertia-Version' => '']);
}

/**
 * @return array<string, mixed>
 */
function inertiaProps(string $url): array
{
    $response = inertiaGet($url);
    $response->assertOk();

    return $response->json('props');
}

function healthUser(string $name = 'Ada Admin'): User
{
    return User::query()->create(['name' => $name, 'email' => uniqid('user', true).'@example.com', 'password' => 'password']);
}

function healthPlugin(): HealthPlugin
{
    $plugin = alfakit()->getPanel('health')->getPlugin(HealthPlugin::ID);

    return $plugin instanceof HealthPlugin ? $plugin : throw new RuntimeException('The health plugin is not registered.');
}

/**
 * The in-memory result store is static: forget the previous test's results.
 */
function forgetHealthResults(): void
{
    (new ReflectionProperty(InMemoryHealthResultStore::class, 'storedCheckResults'))->setValue(null, null);
}
