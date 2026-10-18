<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitBackup\Tests;

use AlfaSix\Alfakit\Tests\Fixtures\Models\User;
use AlfaSix\AlfakitBackup\BackupPlugin;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use RuntimeException;

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

function backupUser(string $name = 'Ada Admin'): User
{
    return User::query()->create(['name' => $name, 'email' => uniqid('user', true).'@example.com', 'password' => 'password']);
}

function backupPlugin(): BackupPlugin
{
    $plugin = alfakit()->getPanel('backups')->getPlugin(BackupPlugin::ID);

    return $plugin instanceof BackupPlugin ? $plugin : throw new RuntimeException('The backup plugin is not registered.');
}

/**
 * Put a fake backup archive on the fake `backups` disk, named like spatie/laravel-backup does.
 */
function fakeBackup(string $date, string $contents = 'zip'): string
{
    $path = 'alfakit-test/'.str_replace([' ', ':'], '-', $date).'.zip';
    Storage::disk('backups')->put($path, $contents);

    return $path;
}
