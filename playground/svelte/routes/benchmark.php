<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

/*
 * Benchmark helpers (local environment only, see /benchmarks/README.md): the measurement
 * script signs in without driving the login form so both apps start from the same state.
 */
Route::middleware('web')->get('/benchmark/login', function () {
    $user = User::query()->where('email', 'admin@example.com')->firstOrFail();
    Auth::login($user);
    request()->session()->regenerate();

    return redirect('/admin');
})->name('benchmark.login');

/*
 * What the server runs (scripts/bench records it next to the hardware): PHP, Laravel, OPcache,
 * debug mode and caches, as the PHP-FPM worker sees them.
 */
Route::get('/benchmark/info', function () {
    $opcache = function_exists('opcache_get_status') ? @opcache_get_status(false) : false;

    return response()->json([
        'php' => PHP_VERSION,
        'sapi' => PHP_SAPI,
        'laravel' => app()->version(),
        'opcache' => is_array($opcache) && ($opcache['opcache_enabled'] ?? false),
        'jit' => is_array($opcache) && (bool) ($opcache['jit']['on'] ?? false),
        'debug' => (bool) config('app.debug'),
        'environment' => app()->environment(),
        'configCached' => app()->configurationIsCached(),
        'routesCached' => app()->routesAreCached(),
        'database' => config('database.default'),
        'packages' => collect(['alfasix/alfakit', 'filament/filament', 'livewire/livewire', 'inertiajs/inertia-laravel'])
            ->mapWithKeys(fn (string $package): array => [$package => \Composer\InstalledVersions::isInstalled($package) ? \Composer\InstalledVersions::getPrettyVersion($package) : null])
            ->filter()
            ->all(),
    ]);
})->name('benchmark.info');
