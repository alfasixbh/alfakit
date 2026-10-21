---
title: Users resource
description: Generate a complete user management resource with invitations, impersonation, suspend/ban, 2FA reset and sessions.
---

# Users resource

```bash
php artisan alfakit:users
```

Generates a users resource in your app, ready to use and yours to change: a form, a table and an infolist, plus everything account management needs.

| Feature                    | What you get                                                                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Form, table, infolist      | Name, email (unique), password (hashed, optional on edit), roles, status badge, last sign-in, a status filter                                                                                                                              |
| **Invite user**            | A header action that creates the user with an unusable password and e-mails a signed link (valid 7 days, works once). The link opens an AlfaKit page where they choose a password and are signed in. **Resend invitation** on pending rows |
| **Impersonate**            | `ImpersonateAction` on rows and the view page, hidden for yourself, for suspended or banned users and for users that can't be impersonated ([Impersonation](../panels/impersonation))                                                      |
| **Suspend / ban**          | Suspend and unsuspend; ban with a reason and lift it. Both sign the user out everywhere, and a middleware signs out any session they still have and shows a message on the login page                                                      |
| **Require a new password** | An action (and a form toggle) that sends the user to a change-password page before they can use the panel again                                                                                                                            |
| **Reset two-factor**       | Turns off AlfaKit's app and e-mail codes and recovery codes, and Fortify's `two_factor_*` columns when the table has them                                                                                                                  |
| **Last sign-in**           | `last_login_at` and `last_login_ip`, recorded by a `Login` event listener without touching `updated_at`                                                                                                                                    |
| **Sessions**               | The user's browsers and devices with their IP and last activity, **Sign out a session** and **Sign out everywhere** (database session driver only; hidden otherwise)                                                                       |
| **Roles**                  | With `spatie/laravel-permission` (e.g. through the [Shield plugin](../plugins/shield)): a roles select, a roles column and filter, and roles on the invite form                                                                            |

Every label is translated in AlfaKit's 13 languages (`alfakit::users.*`).

## Options

| Option            | Description                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| `--panel=`        | The panel (default: the default panel, else `admin`)                                                     |
| `--model=`        | The user model (default: the model of the panel guard's user provider)                                   |
| `--roles`         | Add the roles field, column and filter; without it they are added when the model has spatie's `HasRoles` |
| `--no-roles`      | Never add roles                                                                                          |
| `--no-migrations` | Don't write the migration (you add the columns yourself)                                                 |
| `--no-provider`   | Don't edit the panel provider                                                                            |
| `--force`         | Overwrite generated files                                                                                |

Running it again only writes the files that are missing.

## Generated files

```text
app/Alfakit/Resources/UserResource.php                  form, table, infolist and the account actions
app/Alfakit/Resources/UserResource/Pages/…              ListUsers (Invite), CreateUser, EditUser, ViewUser (sessions)
app/Alfakit/Users/UserAccounts.php                      status, invitations, suspend/ban, 2FA reset, sessions
app/Alfakit/Users/UserInvitation.php                    the invitation e-mail
app/Alfakit/Users/Pages/AcceptInvitation.php            choose a password from the signed link
app/Alfakit/Users/Pages/ChangePassword.php              the forced password change
app/Alfakit/Users/Middleware/EnsureAccountIsActive.php  signs out suspended and banned users
app/Alfakit/Users/Middleware/RequirePasswordChange.php  sends flagged users to ChangePassword
app/Listeners/RecordUserSignIn.php                      last_login_at / last_login_ip
database/migrations/…_add_alfakit_account_columns_to_users_table.php
```

The migration adds `invited_at`, `last_login_at`, `last_login_ip`, `suspended_at`, `banned_at`, `ban_reason` and `password_change_required`, skipping columns that already exist. In an app with several panels the classes live under the panel's namespace (`App\Alfakit\Admin\…`).

The panel provider gets:

```php
use App\Alfakit\Users\Middleware\EnsureAccountIsActive;
use App\Alfakit\Users\Middleware\RequirePasswordChange;
use App\Alfakit\Users\Pages\AcceptInvitation;
use App\Alfakit\Users\Pages\ChangePassword;
use Illuminate\Routing\Router;

return $panel
    // …
    ->authMiddleware([
        EnsureAccountIsActive::class,
        RequirePasswordChange::class,
    ])
    ->pages([ChangePassword::class])
    ->routes(fn (Router $router, Panel $panel) => AcceptInvitation::registerRoute($router, $panel));
```

`->routes()` adds routes inside the panel's route group (its path, `alfakit.{id}.` route names and panel middleware) that guests can open; `->authenticatedRoutes()` does the same behind the panel's auth middleware (and the tenant prefix on tenancy panels). Both closures receive `$router` and `$panel`.

## After generating

```bash
php artisan migrate
```

- **Impersonation** needs the signed-in user to implement `AlfaSix\Alfakit\Contracts\CanImpersonate`:

    ```php
    use AlfaSix\Alfakit\Contracts\CanImpersonate;

    class User extends Authenticatable implements CanImpersonate
    {
        public function canImpersonate(): bool
        {
            return $this->is_admin;
        }
    }
    ```

- **Invitations** are sent by e-mail: configure `MAIL_MAILER` (and a queue worker if you queue notifications).
- **Sessions** need `SESSION_DRIVER=database`.
- **Tenancy panels**: accounts aren't owned by a tenant, so the generated resource sets `protected static bool $isScopedToTenant = false;` and lists every user. To list only the current tenant's members, remove it and set `protected static ?string $tenantOwnershipRelationshipName = 'teams';` (the user's tenants relationship).
- **Starter kits**: users sign in on your app's own login page, so in an app with a `->starterKit()` panel the command also appends `EnsureAccountIsActive::class` to `$middleware->web(append: [...])` in `bootstrap/app.php`. Suspended and banned users are then signed out of your own pages too, and the kit's login page shows why (the message is flashed as the session `status`). Background requests get a 401.
- **Who manages users** follows your `UserPolicy`: the account actions check `update` on the user, the invite action `create` ([Authorization](authorization)). Without a policy every panel user may manage users, so add one:

    ```php
    class UserPolicy
    {
        public function viewAny(User $user): bool
        {
            return $user->is_admin;
        }

        public function update(User $user, User $model): bool
        {
            return $user->is_admin;
        }
    }
    ```

## Using the helpers elsewhere

`UserAccounts` is plain PHP you can call from your own code:

```php
use App\Alfakit\Users\UserAccounts;

UserAccounts::suspend($user);                  // and signs them out everywhere
UserAccounts::requirePasswordChange($user);
UserAccounts::status($user);                   // 'active', 'invited', 'suspended' or 'banned'
UserAccounts::invite(User::class, ['name' => 'Ada', 'email' => 'ada@example.com'], alfakit()->getPanel('admin'));
```
