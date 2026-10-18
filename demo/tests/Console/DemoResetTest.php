<?php

declare(strict_types=1);

use App\Demo\ProductArtwork;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    Storage::fake(ProductArtwork::DISK);
    DemoSeeder::$scale = 0.1;
});

afterEach(function (): void {
    DemoSeeder::$scale = null;
});

it('re-seeds the shop and clears demo uploads', function (): void {
    Storage::disk(ProductArtwork::DISK)->put('uploads/stale.txt', 'old');

    $this->artisan('demo:reset')->assertSuccessful();

    expect(Storage::disk(ProductArtwork::DISK)->exists('uploads/stale.txt'))->toBeFalse()
        ->and(Store::query()->count())->toBe(3)
        ->and(Product::query()->count())->toBeGreaterThanOrEqual(24)
        ->and(Order::query()->count())->toBeGreaterThanOrEqual(60)
        ->and(Storage::disk(ProductArtwork::DISK)->files(ProductArtwork::DIRECTORY))->toHaveCount(Product::query()->count());

    $demo = User::query()->where('email', User::DEMO_EMAIL)->firstOrFail();

    expect($demo->stores)->toHaveCount(3)
        ->and($demo->isOwner(Store::query()->where('slug', 'manama')->firstOrFail()))->toBeTrue()
        ->and($demo->isOwner(Store::query()->where('slug', 'dubai')->firstOrFail()))->toBeTrue(); // is_admin
});

it('is scheduled hourly', function (): void {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn ($event): bool => str_contains((string) $event->command, 'demo:reset'));

    expect($events)->toHaveCount(1)
        ->and($events->first()->expression)->toBe('0 * * * *');
});
