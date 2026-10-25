---
title: Multi-factor authentication
description: Authenticator app codes, email codes, recovery codes, trusted devices and required set-up.
---

# Multi-factor authentication

With multi-factor authentication (MFA), a correct password is not enough: the user also enters a code from an authenticator app or from an email. Users set their methods up on the [profile page](authentication), and the login page sends them to a challenge page before signing them in.

```php
use AlfaSix\Alfakit\Auth\MultiFactor\App\AppAuthentication;
use AlfaSix\Alfakit\Auth\MultiFactor\Email\EmailAuthentication;

$panel
    ->login()
    ->profile()
    ->multiFactorAuthentication([
        AppAuthentication::make()->recoverable(),
        EmailAuthentication::make(),
    ])
    ->multiFactorAuthenticationRememberDevice(30);
```

The profile page shows a section per method with **Set up** and **Remove** buttons. A user who has set up several methods can switch between them on the challenge page.

In a [starter kit panel](../getting-started/starter-kits#two-factor-authentication) sign-in is your app's, so `multiFactorAuthentication()` is ignored there: use the starter kit's own two-factor settings (Fortify), which protect AlfaKit's pages too.

## The user model

Each method needs a contract on your user model. The `InteractsWith…` traits implement them with columns on the users table:

```php
use AlfaSix\Alfakit\Auth\MultiFactor\App\Contracts\HasAppAuthentication;
use AlfaSix\Alfakit\Auth\MultiFactor\App\Contracts\HasAppAuthenticationRecovery;
use AlfaSix\Alfakit\Auth\MultiFactor\Concerns\InteractsWithAppAuthentication;
use AlfaSix\Alfakit\Auth\MultiFactor\Concerns\InteractsWithAppAuthenticationRecovery;
use AlfaSix\Alfakit\Auth\MultiFactor\Concerns\InteractsWithEmailAuthentication;
use AlfaSix\Alfakit\Auth\MultiFactor\Email\Contracts\HasEmailAuthentication;

class User extends Authenticatable implements HasAppAuthentication, HasAppAuthenticationRecovery, HasEmailAuthentication
{
    use InteractsWithAppAuthentication;
    use InteractsWithAppAuthenticationRecovery;
    use InteractsWithEmailAuthentication;
}
```

```php
Schema::table('users', function (Blueprint $table) {
    $table->text('app_authentication_secret')->nullable();
    $table->text('app_authentication_recovery_codes')->nullable();
    $table->boolean('has_email_authentication')->default(false);
});
```

| Trait                                    | Column                              | Stored as                                                                      |
| ---------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| `InteractsWithAppAuthentication`         | `app_authentication_secret`         | The TOTP secret, encrypted with the application key; hidden from serialisation |
| `InteractsWithAppAuthenticationRecovery` | `app_authentication_recovery_codes` | Keyed hashes of the unused recovery codes, encrypted                           |
| `InteractsWithEmailAuthentication`       | `has_email_authentication`          | Boolean                                                                        |

To store them elsewhere, implement the contracts yourself: `getAppAuthenticationSecret()` / `saveAppAuthenticationSecret(?string)` / `getAppAuthenticationHolderName()`, `getAppAuthenticationRecoveryCodes()` / `saveAppAuthenticationRecoveryCodes(?array)`, and `hasEmailAuthentication()` / `toggleEmailAuthentication(bool)`.

## Authenticator app

`AppAuthentication` uses time-based one-time passwords (RFC 6238: 6 digits, 30 seconds, SHA-1), which every authenticator app supports. Setting it up opens a modal with a QR code (and the key for manual entry); the secret is kept in the session until the user confirms the first code, and only then saved.

```php
AppAuthentication::make()
    ->brandName('Acme')        // issuer shown in the app, defaults to the panel's brand name
    ->codeWindow(1)            // steps of 30 s accepted before/after now (clock drift)
    ->recoverable()            // single-use recovery codes
    ->recoveryCodeCount(8);
```

A code is accepted once: after it signs a user in, the same code (and older ones) is refused until the next one.

The QR code is rendered on the server as an SVG with [`bacon/bacon-qr-code`](https://github.com/Bacon/BaconQrCode), a dependency of AlfaKit.

### Recovery codes

With `recoverable()`, confirming the app generates recovery codes. They are shown once on the profile page (with a **Download** button that saves them as a text file) and stored only as hashes. Each code signs in once from the challenge page (**Use a recovery code**). **New recovery codes** asks for the current password and replaces the old ones; `->regenerableRecoveryCodes(false)` removes that button, so users keep the codes they got at set-up.

```php
AppAuthentication::make()->recoverable()->regenerableRecoveryCodes(false);
```

## Email codes

`EmailAuthentication` emails a 6-digit code (the `VerifyEmailAuthentication` notification). Setting it up sends a code to confirm the address works. On the challenge page a code is sent when the page opens; **Send a new code** sends another, at most one per minute.

```php
EmailAuthentication::make()->codeExpiryMinutes(10);
```

The user model must have a mail route: Laravel's `Notifiable` trait, or an `email` attribute.

## The challenge page

When the password is correct and the user has a method set up, the login page does not sign them in. The user is kept "pending" in the session for ten minutes and sent to `/{panel}/multi-factor-challenge`. Only a correct code signs them in, regenerates the session and redirects to the intended URL. Wrong codes are rate limited (5 attempts, then a five-minute wait).

Users without a method set up sign in with their password as before, unless MFA is [required](#requiring-mfa).

## Challenging outside the login page

Ask a signed-in user for a code before a sensitive action with `MultiFactorChallenge::make()` in the action's modal form; see [Action modals](../actions/modals#multi-factor-challenge).

## Trusted devices

`->multiFactorAuthenticationRememberDevice($days)` adds **Trust this device for 30 days** to the challenge page. The browser gets an encrypted, HTTP-only cookie tied to the user, the panel, the user's password and second factors: changing the password or setting up a new secret ends the trust. Pass `false` to turn it off (the default).

## Requiring MFA

```php
$panel->multiFactorAuthentication([AppAuthentication::make()], isRequired: true);
```

Users who haven't set up a method are redirected to the profile page (with a notice) from every other page, and the internal endpoints of other pages refuse their requests until they do. `isRequired` accepts a closure, e.g. to require MFA for administrators only. Required MFA needs `->profile()`. While [impersonating](impersonation) a user the requirement is not enforced.

## Custom methods

A method is a class that implements `AlfaSix\Alfakit\Auth\MultiFactor\Contracts\MultiFactorAuthenticationProvider`: an id, a label, whether the user supports it and has set it up, the challenge description, `beforeChallenge()` (e.g. send a code), `verifyChallengeCode()`, and `getManagementSchemaComponents()` for the profile page (usually a `Section` with actions).
