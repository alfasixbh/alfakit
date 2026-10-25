---
title: Multi-tenancy
description: Scope a panel to teams, organisations or any tenant model.
---

# Multi-tenancy

Tenancy puts a tenant segment in every panel URL (`/app/{team}/posts`), scopes resources to the current tenant and adds a tenant switcher to the sidebar (next to the brand in the top bar of the `topbar` layout).

```php
$panel->tenant(Team::class, slugAttribute: 'slug', ownershipRelationship: 'team')
    ->tenantRegistration(RegisterTeam::class)
    ->tenantProfile(EditTeamProfile::class)
    ->tenantMenuItems([
        'register' => fn (Action $action) => $action->label('Add a team'),
        Action::make('invite')->label('Invite people')->icon('user-plus')->schema([TextInput::make('email')->email()])->action(...),
    ]);
```

The tenant menu takes the same entries as the [user menu](navigation#user-menu): actions (links or with modals, run in the current tenant), groups as nested arrays and keyed overrides of the built-in entries `profile` (tenant profile), `register` (tenant registration) and `billing` (the billing page of `tenantBillingProvider()`).

## The tenant model

Any Eloquent model can be the tenant. The examples on this page use a `Team` with a `slug` and a `team_user` pivot (the [Teams plugin](../plugins/teams) ships a complete one, with members, roles and invitations):

```php
Schema::create('teams', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('slug')->unique();
    $table->timestamps();
});

Schema::create('team_user', function (Blueprint $table) {
    $table->foreignId('team_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
});
```

```php
class Team extends Model
{
    protected $guarded = [];

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }
}
```

The user's side is a `teams()` relationship (`return $this->belongsToMany(Team::class);`), used below.

In a [starter kit panel](../getting-started/starter-kits) tenancy works the same; `<AlfakitTenantSwitcher />` in your app header is the tenant menu.

## The user model

```php
use AlfaSix\Alfakit\Contracts\HasTenants;
use AlfaSix\Alfakit\Panel;

class User extends Authenticatable implements HasTenants
{
    public function getTenants(Panel $panel): Collection
    {
        return $this->teams;
    }

    public function canAccessTenant(Model $tenant): bool
    {
        return $this->teams()->whereKey($tenant)->exists();
    }
}
```

Implement `HasDefaultTenant` on the user to choose which tenant `/app` and the login redirect go to; when it returns a tenant the user can't access, or nothing, the first tenant is used. `$panel->getDefaultTenant($user)` returns the same choice.

## Scoping resources

Resources are scoped automatically through the ownership relationship on the model (`team()` BelongsTo, or a BelongsToMany). Customise it per resource:

```php
protected static ?string $tenantOwnershipRelationshipName = 'organisation';
protected static bool $isScopedToTenant = false; // opt out
protected static ?string $tenantRelationshipName = 'blogPosts'; // Team::blogPosts(), see below
```

New records are associated with the current tenant on creation (`CreateRecord::associateRecordWithTenant()`) through the ownership relationship. With `$tenantRelationshipName` they are saved through that relationship on the tenant model instead (`$team->blogPosts()->save($post)`), for a `HasMany`, `MorphMany` or `BelongsToMany`; a `HasManyThrough` saves the record as it is. `getTenantRelationship($tenant)` returns it.

To turn tenant scoping off for every resource at once, call `Resource::scopeToTenant(false)` in a service provider's `boot()`. Resources that declare their own `$isScopedToTenant` keep it; `PostResource::scopeToTenant(false)` changes one resource that does:

```php
use AlfaSix\Alfakit\Resources\Resource;

public function boot(): void
{
    Resource::scopeToTenant(false);
}
```

Relationship `Select`, `CheckboxList`, `SelectFilter`, `AttachAction` and `AssociateAction` options are limited to the current tenant for models that have the ownership relationship, and so are the values they accept. `unique()` and `exists()` rules on tenant-owned tables add the tenant column. Relation managers list only the current tenant's records of a tenant-owned related model, also on a shared owner record (a global category with every store's products). Models without the relationship (countries, currencies…) are shared. Use `AlfaSix\Alfakit\Support\TenantScope::apply($query)` to scope your own queries the same way.

## Checking a panel

```bash
php artisan alfakit:tenancy:check            # every tenancy panel
php artisan alfakit:tenancy:check --panel=app --strict
```

The command audits each tenancy panel and prints one row per check with `OK`, `WARN` or `FAIL`:

- **Resources**: the model behind every resource, whether the resource is scoped and whether the model has the ownership relationship. A scoped resource whose model lacks the relationship is a `FAIL` (its queries cannot be scoped); an unscoped resource is a `WARN` unless its model is marked as shared.
- **Relationship fields**: every `Select` and `CheckboxList` with `relationship()` in the resource form, every `SelectFilter` with `relationship()` in its table, and every `AttachAction`/`AssociateAction` in its relation managers, with the related model and whether that model is the tenant, tenant-scoped, or shared on purpose. Anything else is a `WARN`: every tenant could pick any record.
- **Raw queries**: a static scan of the resource, page and relation-manager files for `DB::` and `withoutGlobalScopes()` (dropping only `SoftDeletingScope::class` is fine), reported as `WARN` with the file and line.

Reference data that every tenant shares (countries, currencies, plans) is never scoped; tell the command so it stops warning:

```php
use AlfaSix\Alfakit\Tenancy\SharedAcrossTenants;

#[SharedAcrossTenants]
class Currency extends Model {}
```

or pass `--shared=Currency --shared=App\Models\Plan`. The exit code is `1` on any `FAIL`, and with `--strict` on any `WARN` too, so the command can guard a CI pipeline.

## Registration and profile pages

Both are abstract pages you extend with a `form()` and, for registration, `handleRegistration()`. `tenantRegistration()` and `tenantProfile()` take your page class (pass `null` to turn the page off); a class that doesn't extend `RegisterTenant` / `EditTenantProfile`, or is abstract, throws an `InvalidArgumentException` when the panel is configured:

```php
namespace App\Alfakit\Pages\Tenancy;

use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tenancy\Pages\RegisterTenant;
use App\Models\Team;
use Illuminate\Database\Eloquent\Model;

class RegisterTeam extends RegisterTenant
{
    public static function getLabel(): string { return 'Create team'; }

    public function form(Schema $schema): Schema
    {
        return $schema->components([TextInput::make('name')->required(), TextInput::make('slug')->required()->unique()]);
    }

    protected function handleRegistration(array $data): Model
    {
        $team = Team::create($data);
        $team->members()->attach(auth()->user());

        return $team;
    }
}
```

## The tenant menu

The tenant menu lists the user's tenants to switch between, plus the profile, registration and `tenantMenuItems()` entries. The profile and registration links are labelled with their pages' `getLabel()` ("Team settings", "Create team"); keyed `profile` / `register` overrides in `tenantMenuItems()` can relabel them.

```php
$panel->searchableTenantMenu();       // a search field in the menu (automatic above 10 tenants)
$panel->searchableTenantMenu(false);  // never
$panel->tenantSwitcher(false);        // keep the menu and its items, but list no other tenants
$panel->tenantMenu(false);            // no tenant menu at all
```

With `tenantSwitcher(false)` the other tenants are not even sent to the browser; switch tenants another way (links, a custom page). The `TENANT_MENU_BEFORE` / `TENANT_MENU_AFTER` [slots](../design/slots) add content around the menu.

### HTML tenant names

Implement `AlfaSix\Alfakit\Contracts\HasName` on the tenant model and return an `Htmlable` to show markup in the tenant menu. It is sanitised on the server; escape dynamic parts with `e()`. Avatars, search and `aria-label`s use its text.

```php
use AlfaSix\Alfakit\Contracts\HasName;
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Support\HtmlString;

class Team extends Model implements HasName
{
    public function getAlfakitName(): string|Htmlable
    {
        return new HtmlString(e($this->name).' <strong>Pro</strong>');
    }
}
```

### Current tenant label

Implement `HasCurrentTenantLabel` on the tenant model to show a caption above the current tenant's name in the tenant menu (instead of the brand name), like "Active team". The tenant's name stays as it is everywhere else:

```php
use AlfaSix\Alfakit\Contracts\HasCurrentTenantLabel;

class Team extends Model implements HasCurrentTenantLabel
{
    public function getCurrentTenantLabel(): string
    {
        return 'Active team';
    }
}
```

> **Upgrading:** the label used to replace the tenant's name in the menu and everywhere else.

## URL prefix

`tenantRoutePrefix('team')` puts a segment before the tenant in tenant URLs: `/app/team/{tenant}/posts` instead of `/app/{tenant}/posts`. It has no effect with `tenantDomain()`.

## Accessing the tenant

```php
alfakit()->getTenant();
$panel->getTenant();
```

The `TenantSet` event fires once the tenant is resolved. Tenant-aware URLs are generated automatically by `Resource::getUrl()` and `$panel->route()`; pass `tenant: $team` to target another tenant.

## Middleware

`IdentifyTenant` resolves the `{tenant}` route parameter (by slug attribute or key), checks `canAccessTenant()` and aborts with 404 otherwise. Add your own tenant middleware with `->tenantMiddleware([...])`.

## Subdomains and custom domains

Identify the tenant from the host instead of the path:

```php
$panel->tenant(Team::class)->tenantDomain('{tenant:slug}.example.com');   // alpha.example.com/app/posts
$panel->tenant(Team::class)->tenantDomain('{tenant:domain}');             // acme.test/app/posts, from teams.domain
```

`{tenant:slug}` names the attribute that holds the subdomain or domain (it becomes the tenant's slug attribute unless you passed one to `tenant()`). All tenant routes, including the internal `/_alfakit` endpoints, are registered for that host; tenant-less pages (login, profile, tenant registration) keep working on every host. URLs to other tenants are absolute (`http://beta.example.com/app`). On tenant domains the tenant profile page lives at `/tenant-profile`, since `/profile` is the user's profile.

Signing in once for all subdomains needs a shared session cookie: set `SESSION_DOMAIN=.example.com`. Custom domains each have their own cookies, so users sign in per domain. Point the domains at your app (wildcard DNS for subdomains) and add them to your proxy's trusted hosts.

## Billing

Connect a billing provider (Cashier, Spark, Paddle…) by implementing `AlfaSix\Alfakit\Billing\Providers\Contracts\BillingProvider`:

```php
use AlfaSix\Alfakit\Billing\Providers\Contracts\BillingProvider;

class StripeBillingProvider implements BillingProvider
{
    public function getRouteAction(): string|Closure|array
    {
        return fn () => alfakit()->getTenant()->redirectToBillingPortal(alfakit()->getCurrentOrDefaultPanel()->getUrl());
    }

    public function getSubscribedMiddleware(): string
    {
        return RedirectIfTeamIsNotSubscribed::class;
    }
}

$panel->tenant(Team::class)
    ->tenantBillingProvider(new StripeBillingProvider)
    ->requiresTenantSubscription()
    ->tenantBillingRouteSlug('billing');
```

The panel registers `/{tenant}/billing` (route `tenant.billing`, `$panel->getTenantBillingUrl()`) running the provider's route action, and adds **Billing** to the tenant menu. With `requiresTenantSubscription()` the provider's middleware runs on every tenant route and on the internal requests of tenant pages, except the billing route itself; it should redirect unsubscribed tenants to `getTenantBillingUrl()`. `requiresTenantSubscription()` accepts a closure.

Exempt a page or resource (or require a subscription on a panel that doesn't) by overriding `isTenantSubscriptionRequired()`; resource pages follow their resource:

```php
use AlfaSix\Alfakit\Panel;

public static function isTenantSubscriptionRequired(Panel $panel): bool
{
    return false; // reachable without a subscription
}
```

## Notifications and uploads per tenant

On tenancy panels, [database notifications](../notifications/overview#database-notifications) sent while a tenant is current belong to that tenant: the bell lists, counts, marks as read and clears only the current tenant's notifications plus those sent outside any tenant. Choose explicitly with `->tenant($team)` or `->forAllTenants()`:

```php
Notification::make()->title('Invoice paid')->tenant($team)->sendToDatabase($user);
Notification::make()->title('Maintenance tonight')->forAllTenants()->sendToDatabase($users);
```

`->tenantUploadDirectory()` stores every `FileUpload` and rich-editor attachment of a tenant under its own folder:

```php
$panel->tenantUploadDirectory();                                   // tenants/{key}/<directory>
$panel->tenantUploadDirectory('teams/{tenant}');                   // {tenant} is the tenant key
$panel->tenantUploadDirectory(fn (Team $tenant) => 'teams/'.$tenant->uuid);
```

Each field's own `directory()` is appended to the tenant folder. A FileUpload only accepts paths it was filled with, so a tenant can't point a record at another tenant's file.

For separate databases per tenant, see [Database per tenant](database-per-tenant).
