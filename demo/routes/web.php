<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Localization\LocaleResolver;
use AlfaSix\Alfakit\Theming\Themes;
use App\Demo\DemoPanel;
use App\Demo\Renderer;
use App\Demo\Tour;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\StorefrontController;
use App\Http\Controllers\StorefrontPagesController;
use App\Http\Controllers\StorefrontPluginsController;
use App\Http\Middleware\SetStorefrontLocale;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// The root redirects to the React storefront; the admin panels live at /{renderer}/admin.
Route::redirect('/', '/'.Renderer::DEFAULT)->name('home');

/*
 * Storefront, one copy per renderer. Other agents: add storefront pages inside this group
 * (product, contact, order tracking) and register the Inertia page component in all three
 * resources/js/{renderer}/app.* entries under the same `Storefront/*` name.
 */
foreach (Renderer::ALL as $renderer) {
    Route::prefix($renderer)->name("storefront.{$renderer}.")->middleware(SetStorefrontLocale::class)->group(function (): void {
        Route::get('/', [StorefrontController::class, 'home'])->name('home');
        Route::get('products/{slug}', [StorefrontPagesController::class, 'product'])->name('product');
        Route::get('contact', [StorefrontPagesController::class, 'contact'])->name('contact');
        Route::get('track', [StorefrontPagesController::class, 'track'])->name('track');
        // First-party plugins: wholesale form (alfakit-forms) and CMS pages (alfakit-cms).
        Route::get('wholesale', [StorefrontPluginsController::class, 'wholesale'])->name('wholesale');
        Route::get('pages/{path?}', [StorefrontPluginsController::class, 'page'])->where('path', '(?!_cms/).*')->name('page');
    });
}

// Demo chrome: theme and mobile preset switchers (session flags read by DemoPanel).
Route::prefix('demo')->name('demo.')->group(function (): void {
    Route::get('theme/{theme}', function (Request $request, string $theme): RedirectResponse {
        abort_unless(Themes::has($theme), 404);
        session([DemoPanel::SESSION_THEME => $theme]);

        return redirect()->to(demo_back_url($request));
    })->name('theme');

    Route::get('mobile/{state}', function (Request $request, string $state): RedirectResponse {
        abort_unless(in_array($state, ['on', 'off'], true), 404);
        session([DemoPanel::SESSION_MOBILE => $state === 'on']);

        return redirect()->to(demo_back_url($request));
    })->name('mobile');

    // Storefront language toggle: writes the same session key as the panel's locale switcher.
    Route::get('locale/{locale}', function (Request $request, string $locale): RedirectResponse {
        abort_unless(in_array($locale, SetStorefrontLocale::LOCALES, true), 404);
        session([LocaleResolver::SESSION_KEY => $locale]);

        return redirect()->to(demo_back_url($request));
    })->name('locale');

    // Renderer switch on the shared plugin pages (/support, /forms): remembered in the session.
    Route::get('renderer/{renderer}', function (Request $request, string $renderer): RedirectResponse {
        abort_unless(in_array($renderer, Renderer::ALL, true), 404);
        session([Renderer::SESSION_KEY => $renderer]);

        return redirect()->to(demo_back_url($request));
    })->name('renderer');

    // Dashboard feature-tour banner: dismissed for the session.
    Route::get('tour/dismiss', function (Request $request): RedirectResponse {
        session([Tour::SESSION_DISMISSED => true]);

        return redirect()->to(demo_back_url($request));
    })->name('tour.dismiss');

    // Printable invoice (sales area): opened from an order's "Download invoice" action through
    // a temporary signed link, so no session is required.
    Route::get('invoice/{order}', InvoiceController::class)->middleware('signed')->name('invoice');
});

if (! function_exists('demo_back_url')) {
    /** Only same-site paths are accepted as a return URL. */
    function demo_back_url(Request $request): string
    {
        $back = (string) $request->query('back', '');

        return str_starts_with($back, '/') && ! str_starts_with($back, '//') ? $back : '/'.Renderer::DEFAULT;
    }
}
