---
title: Authentication
description: Login, registration, password reset, email verification and access control.
---

# Authentication

Enable the pages you need on the panel:

```php
$panel->login()->registration()->passwordReset()->emailVerification()->profile();
```

Every auth page is a regular schema-driven [page](../pages/custom-pages) with the `auth` layout, so it is rendered by the same components as the rest of the panel and can be extended:

```php
class Login extends \AlfaSix\Alfakit\Auth\Pages\Login
{
    public function form(Schema $schema): Schema
    {
        return parent::form($schema)->components([
            ...parent::form($schema)->getComponents(),
            Checkbox::make('terms')->accepted(),
        ]);
    }

    protected function getCredentials(array $data): array
    {
        return ['username' => $data['email'], 'password' => $data['password']];
    }
}

$panel->login(Login::class);
```

Login attempts are rate limited (5 per minute per email + IP). Registration and the password reset form allow 5 attempts a minute per email address, saving the profile 5 a minute per user (counted before validation, so the current password can't be guessed by retrying), and the second-factor forms (app set-up codes, email set-up codes, and the current password to remove a method or generate new recovery codes) 5 a minute per user. The `AlfaSix\Alfakit\Auth\Throttle` helper builds the same limits for your own forms. Password reset uses the panel's password broker (`->authPasswordBroker('users')`).

## Invitation-only registration

`->invitationOnlyRegistration(expiresAfterDays: 7)` turns registration on, but the page only opens from a signed invitation link for one email address (`$panel->inviteToRegister($email)` emails it, `$panel->getRegistrationInvitationUrl($email)` returns it). The address is read-only and checked again on submit; the sign-in page no longer links to registration. See [Build a customer portal](customer-portal#3-invitation-only-registration).

For your app's own users outside any panel, the [app auth kit](../standalone/auth-kit) offers the same pages (and an account page) in your app's layouts.

## Controlling who can access a panel

Implement `CanAccessPanel` on your user model. **Outside the `local` environment, AlfaKit refuses access to users whose model does not implement it**, so you cannot accidentally expose a panel to every registered user in production.

```php
use AlfaSix\Alfakit\Contracts\CanAccessPanel;

class User extends Authenticatable implements CanAccessPanel
{
    public function canAccessPanel(Panel $panel): bool
    {
        return match ($panel->getId()) {
            'admin' => $this->is_admin,
            default => true,
        };
    }
}
```

## Guest access

A panel can open some pages to visitors who are not signed in (a public catalogue, a status page, a customer portal's landing page). Turn it on for the panel, then opt in each page or resource:

```php
$panel
    ->login()
    ->guestAccess();
```

```php
class StatusPage extends Page
{
    protected static bool $isGuestAccessible = true;
}

class ProductResource extends Resource
{
    // Every page of the resource opens to guests.
    protected static bool $isGuestAccessible = true;
}

class ListOrders extends ListRecords
{
    // Only this page of the resource.
    protected static bool $isGuestAccessible = true;
}
```

- Pages that don't opt in still redirect guests to the login page. Without `guestAccess()` on the panel, `$isGuestAccessible` does nothing.
- Guests are authorised with a `null` user: `canAccess()` and policies run as usual. Laravel only calls a policy method for guests when its user parameter is nullable, so type it `?User $user` for what guests may do. Methods with `User $user` deny guests without being called.

```php
class ProductPolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, Product $product): bool
    {
        return $product->is_published || $user?->is_admin;
    }

    public function create(User $user): bool // guests: denied
    {
        return $user->is_admin;
    }
}
```

> A resource **without** a policy lets guests view (`viewAny`, `view`) and nothing else: creating, editing and deleting need a signed-in user. Give guest-accessible resources a policy to decide exactly what guests may do (or enable `strictAuthorization()` to close everything without one).

- Guests see only the pages they may open in the navigation. The user menu, notifications bell, database notifications, global search and the tenant switcher are hidden; when the panel has a login page, a **Sign in** link takes the user menu's place (`data-slot="sign-in-link"`).
- Signed-in users keep the normal checks (`CanAccessPanel`, email verification…) on guest-accessible pages too.
- Internal endpoints (actions, reactive forms, tables) accept a guest's context token only for guest-accessible pages, and a signed-in user's token can't be replayed by a guest. Uploads, notifications and global search still need a user.

### Tenancy

On tenancy panels guests may open the guest-accessible pages of any tenant, without membership. Pass a closure to choose which tenants are public (it receives `$tenant`, `null` on tenant-less pages):

```php
$panel
    ->tenant(Team::class, slugAttribute: 'slug')
    ->guestAccess(fn (?Team $tenant): bool => $tenant === null || $tenant->is_public);
```

Guests of a refused or unknown tenant are sent to the login page. The tenant's records are still scoped to that tenant.

Two limits for guests: file uploads (`FileUpload`, rich editor attachments) need a signed-in user, so keep them off guest pages; and `alfakit:migrate-from-filament` doesn't detect Filament panels that left out `Authenticate` on purpose, so add `->guestAccess()` and `$isGuestAccessible` to those yourself.

## Guards and multiple panels

Each panel has its own guard (`->authGuard('admins')`). Create users for the right provider with `php artisan make:alfakit-user --panel=admin`.

## Route slugs

The authentication pages live at `/login`, `/register`, `/password-reset/request`, `/password-reset/reset`, `/email-verification/prompt`, `/email-verification/verify/{id}/{hash}` and `/email-change-verification/verify/{id}/{token}` under the panel path. Change them with Filament's method names; route names (and `getLoginUrl()` and friends) stay the same:

```php
$panel->loginRouteSlug('sign-in')
    ->registrationRouteSlug('sign-up')
    ->passwordResetRoutePrefix('forgot-password')
    ->passwordResetRequestRouteSlug('request')
    ->passwordResetRouteSlug('reset')
    ->emailVerificationRoutePrefix('verify-email')
    ->emailVerificationPromptRouteSlug('prompt')
    ->emailVerificationRouteSlug('verify')
    ->emailChangeVerificationRoutePrefix('email-change')
    ->emailChangeVerificationRouteSlug('verify');
```

## Password inputs

Password inputs on the login, registration, password reset and profile pages (and in the multi-factor modals) have a show/hide toggle. Turn it off with `->revealablePasswords(false)`.

## Profile page

`->profile()` adds `/admin/profile` with name, email and password fields. Pass `isSimple: false` to render it inside the app layout instead of the centered card, or your own page class to change the form. Changing the email address or password asks for the current password, and a new email address must be verified again (when the user model implements `MustVerifyEmail`).

Build your own form from the default fields, or change one of them:

```php
use AlfaSix\Alfakit\Auth\Pages\EditProfile as BaseEditProfile;

class EditProfile extends BaseEditProfile
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('username')->required()->maxLength(255),
            $this->getNameFormComponent(),
            $this->getEmailFormComponent(),
            $this->getPasswordFormComponent(),
            $this->getPasswordConfirmationFormComponent(),
            $this->getCurrentPasswordFormComponent(),
        ]);
    }

    protected function getPasswordFormComponent(): Component
    {
        return parent::getPasswordFormComponent()->revealable(false);
    }
}
```

Keep `getCurrentPasswordFormComponent()` in the form: it is what asks for the current password before the email address or password changes.

## Email change verification

```php
$panel->profile()->emailChangeVerification();
```

A new email address entered on the profile page is not saved right away. It stays pending (for 60 minutes) until the user opens the signed link emailed to the new address (`VerifyEmailChange`), which changes the address and marks it verified. The old address receives a notice (`NoticeOfEmailChangeRequest`) with a link that cancels the change, so a hijacked session can't quietly take over the account. The profile page shows the pending address with a **Cancel change** button. The links work once, whether or not the user is signed in, and the change is refused if another account has taken the address in the meantime.

## Multi-factor authentication and impersonation

See [Multi-factor authentication](multi-factor-authentication) (authenticator apps, email codes, recovery codes, trusted devices, required set-up) and [Impersonation](impersonation).

## Email verification

With `->emailVerification()` users implementing `MustVerifyEmail` are redirected to a prompt page until they click the signed link, which lands on `/admin/email-verification/verify/{id}/{hash}`.

## Logging out

A `POST /admin/logout` route is always registered; the user menu uses it.
