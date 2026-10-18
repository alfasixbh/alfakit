---
title: App auth kit
description: AlfaKit's sign-in, registration, password reset, email verification, two-step verification and account pages for your app's own users, outside any panel.
---

# App auth kit

Panels come with sign-in, registration and a profile page. The rest of your application usually needs the same pages for its own users: the people who sign in to the app, not to an admin panel. The **auth kit** gives you those pages, built from AlfaKit components and rendered in your app's own Inertia layouts:

- sign in (with "remember me" and a rate limit), registration (optionally by invitation only), forgot password and reset password;
- email verification, with the `verified` middleware working as in any Laravel app;
- two-step verification after the password: authenticator app codes, emailed codes and recovery codes, entered with the six-digit `OneTimeCodeInput`;
- an account page with profile information, password change, two-step verification set-up, browser sessions ("sign out other sessions") and account deletion.

Everything runs on the server like the rest of AlfaKit: validation, rate limits, authorisation and second factors are PHP; your pages only render `<AlfakitComponent>`. Themes, dark mode, RTL and the 13 bundled languages work as for any [standalone component](overview).

Passkeys (WebAuthn) are not part of AlfaKit's authentication yet. If you need them, keep your starter kit's passkey pages (Fortify) next to the auth kit.

## Install

```bash
php artisan alfakit:auth
npm run build
```

The command:

| File                                                                          | What it does                                                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `app/Providers/AuthKitServiceProvider.php`                                    | Configures the auth kit (`AuthKit::configure()`), registered in `bootstrap/providers.php`   |
| `routes/web.php`                                                              | Adds `AuthKit::routes()`                                                                    |
| `resources/js/pages/auth/alfakit.tsx` (`auth/Alfakit.vue`, `.svelte`)         | The guest pages: sign-in, registration, password reset, verification, two-step verification |
| `resources/js/pages/settings/alfakit.tsx` (`settings/Alfakit.vue`, `.svelte`) | The account page                                                                            |

In a Laravel starter kit app, `auth/*` pages are laid out in the kit's `AuthLayout` and `settings/*` pages in its settings layout, so the generated pages contain nothing but `<AlfakitComponent>`. Without a starter kit they bring a simple centred layout of their own; edit them freely.

Options: `--adapter=react|vue|svelte` (detected from `package.json`), `--prefix=account` (every route under `/account`), `--home=/dashboard` (where users go after signing in), `--mfa` (turn on two-step verification and write the migration for its columns), `--fortify` / `--no-fortify` (see [Laravel Fortify](#laravel-fortify)), `--force`. Running it again only adds what is missing.

## Routes

`AuthKit::routes()` registers the pages under Laravel's conventional route names, so `auth` and `verified` middleware, `route('login')` and Laravel's own password reset and verification emails just work:

| URL                                   | Route name            | Page                                     |
| ------------------------------------- | --------------------- | ---------------------------------------- |
| `GET /login`                          | `login`               | Sign in                                  |
| `POST /logout`                        | `logout`              | Sign out                                 |
| `GET /register`                       | `register`            | Registration                             |
| `GET /forgot-password`                | `password.request`    | Ask for a reset link                     |
| `GET /reset-password/{token}`         | `password.reset`      | Choose a new password                    |
| `GET /verify-email`                   | `verification.notice` | "Check your inbox"                       |
| `GET /verify-email/{id}/{hash}`       | `verification.verify` | The signed link from the email           |
| `GET /two-factor-challenge/{method?}` | `two-factor.login`    | Two-step verification after the password |
| `GET /account`                        | `account`             | The account page                         |

Its internal endpoints live under `/_alfakit/auth/*`. `AuthKit::routes(prefix: 'account', as: 'account.')` moves every page under a path and prefixes the route names, for example next to another authentication system. With `php artisan route:cache`, set them in the provider instead (`->routeOptions(prefix: 'account', as: 'account.')`) so URLs are generated right on cached requests too.

## Configure

```php
use AlfaSix\Alfakit\Auth\MultiFactor\App\AppAuthentication;
use AlfaSix\Alfakit\Auth\MultiFactor\Email\EmailAuthentication;
use AlfaSix\Alfakit\AuthKit\AuthKit;
use AlfaSix\Alfakit\AuthKit\AuthKitPanel;

// app/Providers/AuthKitServiceProvider.php
public function boot(): void
{
    AuthKit::configure(fn (AuthKitPanel $auth) => $auth
        ->inertiaPages(guest: 'auth/alfakit', account: 'settings/alfakit')
        ->homeUrl(fn (): string => route('dashboard'))
        ->multiFactorAuthentication([AppAuthentication::make()->recoverable(), EmailAuthentication::make()])
        ->multiFactorAuthenticationRememberDevice(30)
        ->emailChangeVerification()
        ->sessions()
        ->accountDeletion(using: fn (User $user) => $user->anonymize()));
}
```

The auth kit is a hidden panel (`AuthKitPanel`, id `auth-kit`): every panel option that is about authentication works the same way here.

| Option                                                                                                      | Default                            | What it does                                                                                                |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `inertiaPages(guest:, account:)`                                                                            | `auth/alfakit`, `settings/alfakit` | The app's two Inertia pages                                                                                 |
| `homeUrl()`                                                                                                 | `dashboard` route, or `/`          | Where users go after signing in, registering or verifying                                                   |
| `login(false)`, `registration(false)`, `passwordReset(false)`, `emailVerification(false)`, `profile(false)` | on                                 | Turn a page (and its routes) off; `profile(false)` removes the account page                                 |
| `invitationOnlyRegistration(expiresAfterDays: 7)`                                                           | off                                | Only invited addresses can register ([invitations](../panels/customer-portal#invitation-only-registration)) |
| `multiFactorAuthentication([...], isRequired: false)`                                                       | off                                | Two-step verification ([providers](../panels/multi-factor-authentication))                                  |
| `multiFactorAuthenticationRememberDevice(30)`                                                               | off                                | "Trust this device" on the challenge page                                                                   |
| `emailChangeVerification()`                                                                                 | off                                | A new email address only replaces the old one once confirmed                                                |
| `sessions(false)`                                                                                           | on                                 | The browser sessions section (listing needs the `database` session driver)                                  |
| `accountDeletion(false)` / `accountDeletion(using: fn (User $user) => ...)`                                 | on                                 | The "Delete account" section, and how the user is deleted                                                   |
| `authGuard()`, `authPasswordBroker()`, `revealablePasswords(false)`                                         | `web`, default broker, revealable  | As for panels                                                                                               |
| `locales([...])`, `detectBrowserLocale()`                                                                   | the app's locale                   | Let the auth kit pick the user's language itself                                                            |
| `fortify()`                                                                                                 | off                                | Use Laravel Fortify's backend ([below](#laravel-fortify))                                                   |
| `components(['login' => MyLogin::class])`                                                                   |                                    | Replace a page or account section ([customizing](#customizing))                                             |

Users need the usual columns and contracts: `MustVerifyEmail` for email verification, and for two-step verification `HasAppAuthentication`, `HasAppAuthenticationRecovery` and `HasEmailAuthentication` with their `InteractsWith…` traits and columns (`alfakit:auth --mfa` writes the migration). To force every user to set up a second factor, pass `isRequired: true` and add `EnsureMultiFactorAuthenticationIsSetUp::class.':auth-kit'` to the routes that need it: users without one are sent to the account page.

## The pages

The guest page receives `component` (the page, a standalone component) and `authKit` (`page`, `title`, `homeUrl`, `loginUrl`, `accountUrl`, `logoutUrl`). The account page receives `sections`, one standalone component per section (`profile`, `password`, `twoFactor`, `sessions`, `deleteAccount`; the ones turned off are missing), and `authKit`.

```tsx
// React: resources/js/pages/auth/alfakit.tsx
import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/react'
import { Head } from '@inertiajs/react'

export default function AlfakitAuth({
    component,
    authKit,
}: {
    component: StandaloneComponentSchema
    authKit: { title: string }
}) {
    return (
        <>
            <Head title={authKit.title} />
            <AlfakitComponent component={component} />
        </>
    )
}
```

```tsx
// React: resources/js/pages/settings/alfakit.tsx
export default function AlfakitAccount({
    sections,
    authKit,
}: {
    sections: Record<string, StandaloneComponentSchema>
    authKit: { title: string }
}) {
    return (
        <>
            <Head title={authKit.title} />
            {Object.entries(sections).map(([key, section]) => (
                <AlfakitComponent key={key} component={section} />
            ))}
        </>
    )
}
```

```vue
<!-- Vue: resources/js/pages/auth/Alfakit.vue -->
<script setup lang="ts">
import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/vue'
import { Head } from '@inertiajs/vue3'

defineProps<{ component: StandaloneComponentSchema; authKit: { title: string } }>()
</script>

<template>
    <Head :title="authKit.title" />
    <AlfakitComponent :component="component" />
</template>
```

```vue
<!-- Vue: resources/js/pages/settings/Alfakit.vue -->
<template>
    <Head :title="authKit.title" />
    <AlfakitComponent v-for="(section, key) in sections" :key="key" :component="section" />
</template>
```

```svelte
<!-- Svelte: resources/js/pages/auth/Alfakit.svelte -->
<script lang="ts">
    import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/svelte'

    let {
        component,
        authKit,
    }: { component: StandaloneComponentSchema; authKit: { title: string } } = $props()
</script>

<svelte:head><title>{authKit.title}</title></svelte:head>
<AlfakitComponent {component} />
```

```svelte
<!-- Svelte: resources/js/pages/settings/Alfakit.svelte -->
{#each Object.entries(sections) as [key, section] (key)}
    <AlfakitComponent component={section} />
{/each}
```

Add the account page to your navigation with `route('account')`, and sign out with a POST to `route('logout')`.

## Security and rate limits

- Sign-in: five wrong passwords a minute per email address and IP address, then a wait. A correct password with a second factor is not a sign-in yet: the user is kept pending for ten minutes until they pass the challenge (five wrong codes lock it for five minutes).
- Registration: five attempts a minute per email address and 20 an hour per IP address. Forgot password: three requests a minute per IP address and five per email address; the answer never says whether an account exists. Reset: five attempts a minute per email address. Verification emails: two a minute per user.
- Account: profile saves are limited per user; changing the email address, changing the password, signing out other sessions and deleting the account all need the current password, and every wrong password counts against a per-user limit.
- The password reset token travels in the component's encrypted context, never in the form. Signing in regenerates the session; signing out invalidates it.
- The account sections are every user's own: the auth kit doesn't call `CanAccessPanel::canAccessPanel()`, so your panel access rules don't lock users out of their account.

## Laravel Fortify

In an app that uses [Laravel Fortify](https://laravel.com/docs/fortify) (every Laravel starter kit does), `php artisan alfakit:auth` asks whether to keep Fortify's backend and only use AlfaKit for the pages. With `->fortify()`:

- sign-in uses Fortify's `authenticateUsing()` callback when you set one, and `fortify.username`;
- registration, password resets, the password change and the profile form run your Fortify actions (`App\Actions\Fortify\CreateNewUser`, `ResetUserPassword`, `UpdateUserPassword`, `UpdateUserProfileInformation`), which keep validating the input;
- users who turned on Fortify's two-factor authentication answer it on the auth kit's challenge page, with a code from their authenticator app or one of their recovery codes. AlfaKit's own second factors can be used too.

The command sets `'views' => false` in `config/fortify.php`: Fortify keeps its POST routes and actions, the pages (and the `login`, `register`, `password.request`… route names) become AlfaKit's. Remove the starter kit's own auth pages and `Fortify::loginView()` callbacks you no longer use. Fortify's passkeys and two-factor settings page stay as they are.

To keep the starter kit's sign-in and add only the account page, register the auth kit under a prefix and name prefix: `->routeOptions(prefix: 'account', as: 'account.')->login(false)->registration(false)->passwordReset(false)`.

## Customizing

Every page and section is a standalone component class in `AlfaSix\Alfakit\AuthKit\Pages` (`Login`, `Register`, `ForgotPassword`, `ResetPassword`, `VerifyEmail`, `TwoFactorChallenge`) and `AlfaSix\Alfakit\AuthKit\Account` (`Profile`, `UpdatePassword`, `TwoFactor`, `Sessions`, `DeleteAccount`). Extend one and register it:

```php
use AlfaSix\Alfakit\AuthKit\Account\Profile;
use AlfaSix\Alfakit\AuthKit\AuthKit;
use AlfaSix\Alfakit\AuthKit\AuthKitPanel;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Schemas\Schema;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;

class AccountProfile extends Profile
{
    public function form(Schema $schema): Schema
    {
        $schema = parent::form($schema);

        return $schema->components([
            ...$schema->getComponents(withHidden: true),
            TextInput::make('company')->maxLength(100),
        ]);
    }

    protected function save(Model&Authenticatable $user, array $data): void
    {
        $user->forceFill(['company' => $data['company'] ?? null]);

        parent::save($user, $data);
    }
}

AuthKit::configure(fn (AuthKitPanel $auth) => $auth->components(['profile' => AccountProfile::class]));
```

Keys: `login`, `register`, `forgot-password`, `reset-password`, `verify-email`, `two-factor-challenge`, `profile`, `password`, `two-factor`, `sessions`, `delete-account`. Headings and labels come from the `alfakit::auth` and `alfakit::multi-factor` translation groups; publish and edit them like any [translation](../localization/overview).

## Testing

```php
use AlfaSix\Alfakit\AuthKit\Pages\Login;

it('signs in', function () {
    $user = User::factory()->create();
    $token = $this->get('/login', ['X-Inertia' => 'true'])->json('props.component.token');

    $this->postJson('/_alfakit/auth/actions', [
        'token' => $token,
        'action' => 'authenticate',
        'data' => ['email' => $user->email, 'password' => 'password'],
    ])->assertRedirect();

    $this->assertAuthenticatedAs($user);
});
```
