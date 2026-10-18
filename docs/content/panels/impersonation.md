---
title: Impersonation
description: Sign in as another user to see the panel as they do, and leave again.
---

# Impersonation

`ImpersonateAction` signs you in as the user of a table row. While you impersonate, a banner at the bottom of every page says who you are signed in as and has a **Leave** button that returns to your own account.

```php
use AlfaSix\Alfakit\Actions\ImpersonateAction;

public static function table(Table $table): Table
{
    return $table
        ->columns([TextColumn::make('name'), TextColumn::make('email')])
        ->recordActions([ImpersonateAction::make()]);
}
```

```php
ImpersonateAction::make()
    ->redirectTo(fn (User $record): string => route('alfakit.admin.pages.dashboard'))  // after switching (default: panel home)
    ->backTo(UserResource::getUrl('index'));                                             // after leaving (default: the page you came from)
```

## Who can impersonate whom

Impersonation is refused (the action is hidden and its endpoint answers 403) unless **all** of these hold:

- the impersonator implements `AlfaSix\Alfakit\Contracts\CanImpersonate` and `canImpersonate()` returns `true` (users without it can never impersonate);
- the target doesn't implement `AlfaSix\Alfakit\Contracts\CanBeImpersonated`, or `canBeImpersonated()` returns `true`;
- the target can access the panel (`CanAccessPanel`);
- the target is not the impersonator, and no impersonation is already running;
- when the target's policy has an `impersonate()` method (or an `impersonate` gate is defined), it allows it.

Use the policy to stop people impersonating higher roles:

```php
class User extends Authenticatable implements CanImpersonate, CanBeImpersonated
{
    public function canImpersonate(): bool
    {
        return $this->hasRole(['admin', 'support']);
    }

    public function canBeImpersonated(): bool
    {
        return ! $this->hasRole('super-admin');
    }
}

class UserPolicy
{
    public function impersonate(User $user, User $target): bool
    {
        return $user->roleLevel() > $target->roleLevel();
    }
}
```

## How it works

The real user's id is kept in the server-side session (`Impersonation::sessionKey($panel)`), never in the browser, and the session id is regenerated on every switch. `POST /{panel}/impersonation/leave` signs the real user back in. Signing out while impersonating ends both sessions.

```php
use AlfaSix\Alfakit\Auth\Impersonation\Impersonation;

Impersonation::isImpersonating($panel);   // or $panel->isImpersonating()
Impersonation::getImpersonator($panel);   // the real user
Impersonation::canImpersonate($panel, $user, $target);
```

Required [multi-factor authentication](multi-factor-authentication) is not enforced while impersonating.

## The banner

The banner (`data-slot="impersonation-banner"`) is rendered by every renderer from the `impersonation` key of the shared panel props (`label`, `leaveLabel`, `leaveUrl`). Replace it with your own component under the registry key `panel:impersonation-banner`:

```tsx
createAlfakit({ components: { 'panel:impersonation-banner': MyBanner } })
```

It receives `{ impersonation }`; leaving is a `POST` to `impersonation.leaveUrl`.
