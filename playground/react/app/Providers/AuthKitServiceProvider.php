<?php

declare(strict_types=1);

namespace App\Providers;

use AlfaSix\Alfakit\Auth\MultiFactor\App\AppAuthentication;
use AlfaSix\Alfakit\Auth\MultiFactor\Email\EmailAuthentication;
use AlfaSix\Alfakit\AuthKit\AuthKit;
use AlfaSix\Alfakit\AuthKit\AuthKitPanel;
use Illuminate\Support\ServiceProvider;

/**
 * AlfaKit's sign-in, registration, password reset, email verification, two-step
 * verification and account page for your app's users. The routes are registered in
 * routes/web.php (`AuthKit::routes()`); the pages render `auth/alfakit` and `settings/alfakit`.
 *
 * Playground: the starter kit keeps its own Fortify pages at /login, so the auth kit lives
 * under /kit (`kit.login`, `kit.account`…) and runs on Fortify's backend (its actions and
 * two-factor authentication), with AlfaKit's own second factors on top.
 */
class AuthKitServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        AuthKit::configure(fn (AuthKitPanel $auth) => $auth
            ->inertiaPages(guest: 'auth/alfakit', account: 'settings/alfakit')
            ->homeUrl(fn (): string => url('/dashboard'))
            ->routeOptions(prefix: 'kit', as: 'kit.')
            ->fortify()
            ->multiFactorAuthentication([AppAuthentication::make()->recoverable(), EmailAuthentication::make()])
            // The user's language (their preference, the panels' language cookie or the browser's).
            ->locales(['en', 'ar', 'de', 'es', 'fa', 'fr', 'it', 'ja', 'nl', 'pt_BR', 'ru', 'tr', 'zh_CN']),
        );
    }
}
