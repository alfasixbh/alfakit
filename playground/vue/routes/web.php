<?php

use App\Alfakit\Standalone\ContactForm;
use App\Alfakit\Standalone\MyPostsTable;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::inertia('/', 'Welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'Dashboard')->name('dashboard');

    // Alfakit outside the panel: the signed-in author's posts as a standalone table.
    Route::get('posts', fn () => Inertia::render('Posts', [
        'posts' => MyPostsTable::make(['author' => request()->user()]),
    ]))->name('posts');
});

// Alfakit outside the panel: a public contact form in the app's own layout.
Route::get('/contact', fn () => Inertia::render('Contact', [
    'form' => ContactForm::make()->fill(['email' => request()->user()?->email]),
]))->name('contact');

// Playground only: switch the admin panel between the built-in themes.
Route::middleware('web')->get('/demo/theme/{theme}', function (string $theme) {
    abort_unless(\AlfaSix\Alfakit\Theming\Themes::has($theme), 404);
    session(['demo_theme' => $theme]);

    return back();
})->name('demo.theme');

require __DIR__.'/settings.php';

// Benchmark scenario helpers (see /scripts/bench and /benchmarks/README.md), local environment only.
if (app()->environment('local')) {
    require __DIR__.'/benchmark.php';
}
