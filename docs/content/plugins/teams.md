---
title: Teams
description: 'Jetstream-style teams on top of multi-tenancy: members, roles, invitations, seats.'
---

# Teams

`alfasix/alfakit-teams` turns a panel into a SaaS team workspace in a few minutes. It is built on AlfaKit's [multi-tenancy](../panels/tenancy): the team is the tenant (`/app/{team}/…`), the tenant switcher switches teams, and the plugin brings the pages and rules around it.

| Feature          | What you get                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Create team      | The tenant registration page: name and URL slug; the creator becomes the owner                                           |
| Team settings    | The tenant profile page: name, slug, logo, auto-join domain; leave, transfer ownership, delete (with typed confirmation) |
| Members          | Every member with their role; change role, remove, leave                                                                 |
| Invitations      | Invite by e-mail with a role, queued e-mail with a signed link, expiry, resend, revoke, accept or decline                |
| Roles            | Configurable roles with permissions (`owner`, `admin`, `member`, `viewer` by default), wildcards                         |
| Personal teams   | Optional team for every new user                                                                                         |
| Domain auto-join | Anyone with a verified `@company.com` address joins as a member                                                          |
| Seats            | A seat limit per team, optionally from the billing plugin's subscription quantity                                        |

Everything renders with AlfaKit's own components (forms, tables, sections, modals), so it works in React, Vue and Svelte, in every theme and right to left. There is no frontend package.

## Quick start (5 minutes)

**1. Install and migrate.**

```bash
composer require alfasix/alfakit-teams
php artisan vendor:publish --tag=alfakit-teams-migrations
php artisan migrate
```

The migration creates `teams` (`name`, `slug`, `logo_path`, `personal_team`, `auto_join_domain`), `team_user` (the membership with its `role`) and `team_invitations`, and adds `current_team_id` to `users`.

**2. Give users teams.** `HasTeams` implements both tenancy contracts (`php artisan alfakit:add teams` and the setup wizard's `saas` bundle add both, and the `insteadof` block below, to your user model for you):

```php
use AlfaSix\Alfakit\Contracts\HasDefaultTenant;
use AlfaSix\Alfakit\Contracts\HasTenants;
use AlfaSix\AlfakitTeams\Concerns\HasTeams;

class User extends Authenticatable implements HasDefaultTenant, HasTenants
{
    use HasTeams;
}
```

If the model also uses spatie/laravel-permission's `HasRoles` (the Shield plugin), both traits define `teams()`. Keep the teams plugin's relationship:

```php
use HasRoles;
use HasTeams {
    HasTeams::teams insteadof HasRoles;
}
```

**3. Register the plugin.** It configures the panel's tenancy for you:

```php
use AlfaSix\AlfakitTeams\TeamsPlugin;

return $panel
    ->id('app')
    ->path('app')
    ->login()
    ->registration()
    ->plugin(TeamsPlugin::make()->personalTeams());
```

**4. Scope your resources.** Give tenant-owned models a `team_id` column and a `team()` relationship; AlfaKit scopes every resource to the current team and fills `team_id` on create:

```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Project extends Model
{
    public function team(): BelongsTo
    {
        return $this->belongsTo(\AlfaSix\AlfakitTeams\Models\Team::class);
    }
}
```

**5. Make sure mail and the queue run.** Invitations are queued mail notifications: configure `MAIL_*` and run `php artisan queue:work` (or `QUEUE_CONNECTION=sync` locally).

That's it: register, and you land in your personal team. Open the tenant menu for **Members**, **Team settings** and **Create team**.

### In a starter kit app

In an app made from a Laravel starter kit (`alfakit:setup --mode=starter-kit`), keep `/admin` for staff and put the team workspace on a second `starterKit()` panel:

```bash
php artisan make:alfakit-panel app
php artisan alfakit:add teams --panel=app
```

Then add `->starterKit()` (and `->databaseNotifications()`) to `AppPanelProvider`, without `->login()` or `->registration()`: the app's own sign-in is used. `alfakit:add teams` adds `<AlfakitTenantSwitcher />` to the app header block the installer wrote (`alfakit:header`; add it yourself next to `<AlfakitSearch />` if you removed the block). It is the way to **Members**, **Team settings** and **Create team**:

- on the team panel's pages (`/app/{team}/…`) the header components and `useAlfakitNavigation()` (the `AlfakitNav` sidebar) follow that panel, so the sidebar lists the team's navigation (and **Members** with `membersNavigation()`);
- on the app's own pages and the admin panel's, `<AlfakitTenantSwitcher />` lists the user's teams from the first panel with tenancy, while the sidebar keeps the first panel's navigation. Pass `panel="app"` (or `useAlfakitNavigation('app')`) to pin a component to one panel.

## What the plugin configures

`TeamsPlugin::make()` calls, on the panel:

- `tenant(Team::class, slugAttribute: 'slug', ownershipRelationship: 'team')`. Use `->configureTenancy(false)` to keep your own `tenant()` call (it must use the team model) and `->ownershipRelationship('organisation')` to rename the relationship.
- `tenantRegistration(CreateTeam::class)` and `tenantProfile(TeamSettings::class)`. Subclasses of those pages go in `createTeamPage()` / `settingsPage()`; to keep pages of your own (a panel that had tenancy before the plugin), call `->tenantRegistration(...)` / `->tenantProfile(...)` after `->plugin(TeamsPlugin::make())`, because the plugin sets them when it is registered.
- `pages([TeamMembers::class, TeamInvitations::class])` at `/{team}/team/members` and `/{team}/team/invitations`.
- A guest-reachable, signed route `/team-invitations/{invitation}` for the accept page.
- "Members" at the top of the tenant menu; "Create team" and "Team settings" labels. Your own `tenantMenuItems()` are kept (the plugin only fills the `register` and `profile` keys you didn't set).

The settings, members and invitations pages share tabs at the top. The members page is not in the sidebar unless you ask:

```php
TeamsPlugin::make()
    ->membersNavigation(group: 'Team') // also list "Members" in the sidebar
    ->tenantMenuItems(false);          // no "Members" entry in the tenant menu
```

## Your own team model

The bundled `AlfaSix\AlfakitTeams\Models\Team` is fine for most apps. To own the model, publish the stub (`app/Models/Team.php`) or add `IsTeam` to an existing model with the migration's columns:

```bash
php artisan vendor:publish --tag=alfakit-teams-model
```

```php
TeamsPlugin::make()->teamModel(App\Models\Team::class);
```

`IsTeam` adds `members()`, `memberships()`, `invitations()`, `owners()`, `owner()`, `hasMember()`, `roleOf()`, `isPersonal()` and `getAlfakitAvatarUrl()` (the logo as the tenant avatar; implement `HasAvatar` to use it). The membership and invitation models can be replaced too: `Teams::useMembershipModel()`, `Teams::useInvitationModel()` (subclasses of `Membership` and `TeamInvitation`).

## Roles and permissions

```php
use AlfaSix\AlfakitTeams\Permission;
use AlfaSix\AlfakitTeams\Role;

TeamsPlugin::make()
    ->roles([
        Role::make('owner'),
        Role::make('admin')
            ->label('Administrator')
            ->description('Manages members and settings.')
            ->color('success')
            ->permissions([Permission::UPDATE_TEAM, 'members:*', 'projects:*']),
        Role::make('editor')->permissions(['projects:create', 'projects:update']),
        Role::make('viewer')->permissions(['projects:view']),
    ])
    ->defaultRole('editor');
```

- The plugin's own permissions are `team:update` (`Permission::UPDATE_TEAM`), `members:invite`, `members:update` and `members:remove`.
- A role grants a permission it lists, `*`, or a `prefix:*` wildcard.
- `owner` always exists, always grants everything, and is the only role that may delete the team, transfer ownership, give or take the owner role, and change or remove other owners.
- A team always keeps at least one owner: the last owner can't be demoted, removed or leave. Nobody changes their own role.
- Without `roles()`: `owner`, `admin` (`team:update`, `members:*`, `read`, `create`, `update`, `delete`), `member` (`read`, `create`, `update`) and `viewer` (`read`). Labels and descriptions of these names are translated.

Check permissions anywhere:

```php
$user->hasTeamPermission($team, 'projects:create');
$user->teamRole($team)?->getName();   // 'editor'
$user->ownsTeam($team);
$user->belongsToTeam($team);

// In a resource
public static function canCreate(): bool
{
    return auth()->user()->hasTeamPermission(alfakit()->getTenant(), 'projects:create');
}
```

### Policy

`TeamPolicy` is registered for the team model (unless you registered your own) with the abilities `view`, `update`, `inviteMembers`, `updateMembers`, `removeMembers`, `transferOwnership` and `delete`. Every operation of the plugin authorises through it, so `Gate::policy(Team::class, MyTeamPolicy::class)` with a subclass changes a rule everywhere:

```php
use AlfaSix\AlfakitTeams\Policies\TeamPolicy;
use Illuminate\Auth\Access\Response;

class MyTeamPolicy extends TeamPolicy
{
    public function inviteMembers(Model $user, Model $team): Response
    {
        return $team->is_suspended ? Response::deny('Suspended teams can\'t invite.') : parent::inviteMembers($user, $team);
    }
}
```

### Shield

With the [Shield plugin](shield) on the same panel and `permission.teams` on, each member's team role is mirrored to the spatie role of the same name in the team's scope, so the permissions you tick in Shield's role resource apply to team members. Only roles that exist in spatie are assigned; roles a member was given in Shield are kept. Turn it off with `->syncShieldRoles(false)`.

## Teams

```php
TeamsPlugin::make()
    ->personalTeams()                                                 // a team for every new user (`Registered` event)
    ->personalTeams(true, fn (User $user): string => "{$user->name}'s workspace")
    ->teamCreation(fn (User $user): bool => $user->is_paying);        // who may create more teams
```

Personal teams can't be deleted. Slugs are generated from the name and made unique (`acme`, `acme-2`); the slug field follows the name until edited, and saving a new slug redirects to the new URL. Logos are uploaded through `FileUpload` (with the panel's `tenantUploadDirectory()` when set):

```php
TeamsPlugin::make()->logos(disk: 's3', directory: 'team-logos'); // or ->logos(false)
```

`HasTeams::getDefaultTenant()` sends users to the team they last worked in (`current_team_id`, updated when they switch), else their personal team, else their first team.

## Invitations

Members with `members:invite` invite by e-mail with a role from the members or invitations page. The invitee gets a queued e-mail with a signed link:

- Guests are sent to sign in (an existing account) or register (a new address, when the panel has registration), then come back to the accept page.
- Only the invited address can accept, until the invitation expires, while the team has a free seat. Anyone else signed in sees why and can switch account.
- Accepting or declining deletes the invitation; revoked links answer 404, tampered links 403.

```php
TeamsPlugin::make()
    ->invitationExpiry(14)                          // days (7 by default); null never expires
    ->invitationLimit(fn (Team $team): int => 50)   // pending invitations per team
    ->invitationNotification(MyInvitation::class)   // new MyInvitation(TeamInvitation $invitation, string $acceptUrl)
    ->invitations(false);                           // no invitations at all
```

Resending restarts the expiry (once a minute per invitation). An expired invitation to an address is replaced by a new invitation.

## Domain auto-join

```php
TeamsPlugin::make()->domainAutoJoin(role: 'member');
```

Team settings gain an **E-mail domain** field (needs `team:update`). Users who register, or verify their address, at that domain join the team automatically, within its seats. To keep it safe:

- The domain must be the domain of the admin's own verified address.
- Public providers (gmail.com, outlook.com…) are refused; add yours with `->blockedAutoJoinDomains(['example.org'])`.
- Users that implement `MustVerifyEmail` join only once verified.

Call `Teams::manager()->autoJoin($user)` from your own sign-up flow when you don't fire `Registered`.

## Seats

```php
TeamsPlugin::make()->seats(fn (Team $team): ?int => $team->plan === 'pro' ? 25 : 5); // null = unlimited
```

Members plus pending invitations count against the seats when inviting; members when accepting and auto-joining. The members page shows "3 of 5 seats used" and the invite modal the seats left.

### With the billing plugin

The [billing plugin](billing) bills the team (the tenant). Two hooks connect seats to the subscription, both no-ops when the billing plugin is not installed:

```php
TeamsPlugin::make()
    // Seats = the subscription quantity (Cashier `subscription($type)->quantity`); 1 without a subscription.
    ->seatsFromBilling()
    // Or decide yourself (the billing provider is null when the panel has none).
    ->seatsFromBilling(fn (Team $team, ?AbstractBillingProvider $provider, ?object $subscription): int => ($subscription?->quantity ?? 0) * 5)

    // Per-seat pricing: keep the quantity equal to the member count after joins and removals.
    ->syncSeatsWithBilling()
    ->syncSeatsWithBilling(using: fn (Team $team, int $quantity) => $team->subscription('default')?->updateQuantity($quantity));
```

Use the team model with Cashier's `Billable` trait for the defaults. A failing sync is reported and never undoes the membership change. Choose either a seat limit from the plan or a quantity synced with members; combining both means the quantity can only grow through billing.

## In your own code

`Teams::manager()` (`AlfaSix\AlfakitTeams\TeamManager`) runs every operation with the same rules as the pages:

```php
use AlfaSix\AlfakitTeams\Teams;

$manager = Teams::manager();

$team = $manager->createTeam($user, ['name' => 'Acme']);
$manager->addMember($team, $other, 'admin');            // no permission check: for your own flows
$manager->invite($team, $actor, 'ada@example.com', 'member');
$manager->updateRole($team, $actor, $member, 'viewer');
$manager->removeMember($team, $actor, $member);
$manager->transferOwnership($team, $owner, $newOwner);
$manager->deleteTeam($team, $owner);
$manager->seatsRemaining($team);
```

Missing permissions throw `AuthorizationException`; rule violations (last owner, seats, expired invitation…) throw `AlfaSix\AlfakitTeams\Exceptions\TeamException` with a translated message and a stable `$reason`.

## Events

| Event                  | Properties                                    |
| ---------------------- | --------------------------------------------- |
| `TeamCreated`          | `team`, `owner`                               |
| `TeamDeleted`          | `team`, `deletedBy`                           |
| `MemberAdded`          | `team`, `user`, `role`                        |
| `MemberRemoved`        | `team`, `user`, `removedBy` (null on leaving) |
| `MemberRoleUpdated`    | `team`, `user`, `role`, `previousRole`        |
| `OwnershipTransferred` | `team`, `from`, `to`                          |
| `InvitationSent`       | `invitation`, `team`, `invitedBy`, `resent`   |
| `InvitationAccepted`   | `invitation`, `team`, `user`                  |

All live in `AlfaSix\AlfakitTeams\Events`.

## Customising the pages

Extend a page and register your class:

```php
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitTeams\Pages\TeamMembers;
use AlfaSix\AlfakitTeams\TeamsPlugin;

class Members extends TeamMembers
{
    public function table(Table $table): Table
    {
        return parent::table($table)->defaultSort('created_at', 'desc');
    }
}

TeamsPlugin::make()
    ->membersPage(Members::class)
    ->settingsPage(MySettings::class)          // extends TeamSettings
    ->invitationsPage(MyInvitations::class)    // extends TeamInvitations
    ->createTeamPage(MyCreateTeam::class)      // extends CreateTeam
    ->acceptInvitationPage(MyAccept::class);   // extends AcceptInvitation
```

## Translations

Strings live in `alfakit-teams::teams` in the 13 AlfaKit locales. Publish them with `php artisan vendor:publish --tag=alfakit-teams-translations`.

## Security notes

- Every page and action is authorised server-side from the team role; hidden buttons are never the only check. Actions resolve records from the current team's own queries, so another team's members or invitations can't be reached, and internal requests re-check membership of the team in their context token.
- Invitation links are signed; the invitation must match the signed-in user's e-mail (case-insensitive), must not be expired and is single-use.
- Owners are protected: only owners manage owners, and a team never loses its last owner.
- Auto-join requires a verified address and refuses public e-mail providers and domains the admin doesn't own.
