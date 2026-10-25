---
title: Feature flags
description: A control centre for Laravel Pennant, with a kill switch, stable percentage rollouts, schedules, per-user and per-tenant targeting, rich values and an audit trail.
---

# Feature flags

`alfasix/alfakit-feature-flags` turns [Laravel Pennant](https://laravel.com/docs/pennant) into a feature flag control centre inside your panel. Your features stay plain Pennant features (`Feature::define()`, class-based features, `Feature::discover()`); the panel shows who has them and lets authorised users change that safely.

| Class / command                          | Does                                                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `FeatureFlagsPlugin`                     | Registers the pages and every option                                                                                   |
| `Pages\Features`                         | Every feature: description, type, status, active / inactive stored counts, targeted scopes, last change, quick actions |
| `Pages\ManageFeature`                    | One feature: overview, actions, targeting table, stored values and the audit trail                                     |
| `Support\FeatureFlags`                   | The same operations from code: `rollout()`, `kill()`, `setFor()`, `schedule()`, `evaluate()`…                          |
| `Infolists\Components\FeatureFlagsEntry` | The features of one record (user, team, tenant) on its page, with on / off / value / reset buttons                     |
| `Concerns\FeatureFlagged`                | Hides a page, resource or action while a feature is inactive for the current user or tenant                            |
| `alfakit-feature-flags:apply-schedules`  | Applies due schedules (registered with the scheduler every minute)                                                     |

Everything is built from AlfaKit's tables, infolists, forms and actions, so it renders in React, Vue and Svelte; there is no frontend package.

Works on an [admin panel](../getting-started/installation) and on a [starter kit](../getting-started/starter-kits) panel (`->starterKit()`), where its pages are listed in your app's sidebar. It needs a panel, so it doesn't apply to [standalone](../standalone/overview) components.

## Installation

```bash
composer require alfasix/alfakit-feature-flags
php artisan vendor:publish --tag=pennant-migrations   # Pennant's `features` table, if you don't have it yet
php artisan vendor:publish --tag=alfakit-feature-flags-migrations
php artisan migrate
```

The plugin requires `laravel/pennant` and works with every Pennant store. Counts and the stored values table need the `database` (or `array`) driver; other drivers still get every action.

Optionally publish the config (`--tag=alfakit-feature-flags-config`) or the translations (`--tag=alfakit-feature-flags-translations`).

## Register the plugin

```php
use AlfaSix\AlfakitFeatureFlags\FeatureFlagsPlugin;
use AlfaSix\AlfakitFeatureFlags\Support\ScopeResolver;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

public function panel(Panel $panel): Panel
{
    return $panel
        // ...
        ->plugin(
            FeatureFlagsPlugin::make()
                ->authorize(fn (User $user): bool => $user->is_admin)
                ->discoverFeatures()                         // app/Features, like Feature::discover()
                ->descriptions(['new-billing' => 'The new billing page.'])
                ->values(['purchase-button' => ['blue' => 'Blue', 'green' => 'Green']])
                ->scopes([
                    User::class => fn (Builder $query, ?string $search) => $query
                        ->when($search, fn (Builder $query) => $query->where('email', 'like', "%{$search}%")),
                    ScopeResolver::make(Team::class)->titleAttribute('name')->label('Teams'),
                ])
                ->navigationGroup('Settings'),
        );
}
```

`$user->is_admin` stands for your own check: a new Laravel app's `users` table has no such column, so use a role, a gate or a column you add. The closure's `bool` return type is strict: SQLite returns `0`/`1` and a model created without the attribute holds `null`, so cast the column to `boolean` and give it a default, or return `(bool) $user->is_admin`.

`App\Models\Team` stands for your own team model (import yours, or leave its `ScopeResolver` line out if you have none); a new app has only `User`.

The pages live at `/{panel}/feature-flags` and `/{panel}/feature-flags/{feature}`.

## Describing features

The Features page lists every feature Pennant knows (defined, class-based, discovered), names that only have stored values, and features the panel has rules for. Descriptions come from, in order: `descriptions()`, the `descriptions` config key, the `#[Description]` attribute, a public `description()` method or a public `$description` property.

```php
use AlfaSix\AlfakitFeatureFlags\Attributes\Description;
use AlfaSix\AlfakitFeatureFlags\Attributes\Values;
use Laravel\Pennant\Attributes\Name;

#[Name('purchase-button')]
#[Description('The colour of the purchase button.')]
#[Values(['blue' => 'Blue button', 'green' => 'Green button'])]
class PurchaseButton
{
    public function resolve(User $user): string
    {
        return 'blue';
    }
}
```

The `#[Values]` attribute can't call `__()`, so translate value labels with a public `valueLabels()` method (static or not) that returns `value => label`; its labels win over the attribute's, and on its own it lists the values too. `values()` on the plugin also takes a closure per feature:

```php
use AlfaSix\AlfakitFeatureFlags\Attributes\Values;
use AlfaSix\AlfakitFeatureFlags\FeatureFlagsPlugin;

#[Values(['blue', 'green'])]
class PurchaseButton
{
    public static function valueLabels(): array
    {
        return ['blue' => __('features.purchase_button.blue'), 'green' => __('features.purchase_button.green')];
    }
}

FeatureFlagsPlugin::make()->values(['checkout' => fn (): array => ['single' => __('features.checkout.single')]]);
```

A feature is a **rich value** feature when it lists values (`#[Values]` or `values()`), when its resolver declares a non-boolean return type, or when its stored values aren't booleans. Rich values are edited in a select of the known values or in a JSON editor that is validated on the server (valid JSON, at most 64 KB).

## How values resolve

For features the panel manages, `Feature::active()` and `Feature::value()` resolve in this order:

1. **Kill switch**: inactive for everyone.
2. The class feature's **`before()` hook**.
3. The scope's **own value** (targeting).
4. The **value for everyone**, or the **percentage rollout**.
5. Pennant: the stored value, or the feature's definition.

Rule decisions are never written to Pennant's store, so changing or removing a rule takes effect at once. Features without rules take Pennant's own path untouched. The plugin does this by building Pennant's stores with a decorator; your stores, drivers and definitions are unchanged. Set `enforce_rules` to `false` in `config/alfakit-feature-flags.php` to manage stored values only (the kill switch and rollouts are then hidden).

Explicit writes in your code (`Feature::for($user)->activate()`, `deactivate()`, `forget()`, `purge()`) become targeting entries, so an explicit activation keeps winning over a rollout set later (`track_pennant_writes`).

## Actions

On a feature (all confirmed, authorised and recorded):

| Action                             | Ability    | Does                                                                                     |
| ---------------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| Activate / deactivate for everyone | `toggle`   | Every scope, including scopes that resolve later; Pennant's stored values follow         |
| Set value                          | `toggle`   | A rich value for everyone                                                                |
| Back to the definition             | `toggle`   | Stops forcing a value or rolling out                                                     |
| Roll out                           | `rollout`  | A slider from 0 to 100%                                                                  |
| Schedule                           | `schedule` | Activate (with a value for rich features) and / or deactivate for everyone at a time     |
| Kill switch / Restore              | `kill`     | Off for everyone right away, whatever else says; restore brings the previous values back |
| Purge stored values                | `purge`    | Pennant's `purge()` plus the targeting entries; rules stay                               |
| Reset                              | `purge`    | Purge and remove every rule                                                              |

### Percentage rollouts

Each scope gets a bucket between 0 and 100 from a hash of the feature and Pennant's serialised scope, with a 0.01% resolution. The same scope always lands in the same bucket, so raising the percentage only adds scopes and lowering it only removes the last ones. Scopes with their own value keep it.

### Schedules

```php
// routes/console.php: the plugin registers this for you (`register_schedule`).
Schedule::command('alfakit-feature-flags:apply-schedules')->everyMinute();
```

Due activations and deactivations are applied in order and recorded in the audit trail with `schedule` as their source.

## Targeting

The targeting table on a feature's page lists the scopes with their own value: turn them on or off, set a rich value, remove them (one by one or in bulk). **Add scopes** searches every scope resolver at once.

A scope resolver is a model class with an optional search closure. The closure may ask for `$query` (a fresh query), `$search` (null when the panel checks a chosen record), `$tenant` and `$panel`, and returns a query (best, chosen records are then checked with `whereKey()`) or records:

```php
FeatureFlagsPlugin::make()->scopes([
    // Searched by its title attribute (name, title, email or label).
    Team::class,
    User::class => fn (Builder $query, ?string $search, ?Model $tenant) => $query
        ->when($tenant, fn (Builder $query) => $query->whereHas('teams', fn (Builder $teams) => $teams->whereKey($tenant->getKey())))
        ->when($search, fn (Builder $query) => $query->where('name', 'like', "%{$search}%")),
    ScopeResolver::make(Organization::class)
        ->search(fn (Builder $query, ?string $search) => $query->where('domain', 'like', "%{$search}%"))
        ->titleAttribute(fn (Organization $organization): string => $organization->domain)
        ->label('Organizations')
        ->limit(25),
]);
```

Whatever the browser posts, a scope is only targeted when a resolver offers it to the current user (in the current tenant).

## From code

```php
use AlfaSix\AlfakitFeatureFlags\Support\FeatureFlags;

FeatureFlags::activateForEveryone('new-billing');
FeatureFlags::activateForEveryone('purchase-button', 'green');
FeatureFlags::rollout('new-billing', 25);
FeatureFlags::schedule('new-billing', now()->addDay(), now()->addWeek());
FeatureFlags::kill('new-billing');
FeatureFlags::restore('new-billing');
FeatureFlags::setFor('new-billing', $user, true);
FeatureFlags::forgetFor('new-billing', $user);

$decision = FeatureFlags::evaluate('new-billing', $user); // ->value, ->source (killed, before, override, everyone, rollout, default)
FeatureFlags::active('new-billing');                    // for the current user or tenant
```

Every call is recorded in the audit trail with the signed-in user.

## Per-record view

`FeatureFlagsEntry` shows the features of a record on its page, with where each value comes from and buttons to turn it on or off, set a rich value or go back to the rules:

```php
use AlfaSix\AlfakitFeatureFlags\Infolists\Components\FeatureFlagsEntry;

public static function infolist(Schema $schema): Schema
{
    return $schema->components([
        Section::make('Features')->schema([
            FeatureFlagsEntry::make()->features(['new-billing', 'beta-reports']),
        ]),
    ]);
}
```

| Option                     | Does                                                                |
| -------------------------- | ------------------------------------------------------------------- |
| `features(array\|Closure)` | The features listed (every feature by default)                      |
| `scope(Model\|Closure)`    | Another scope than the record: `fn (User $record) => $record->team` |
| `readOnly()`               | Values only, no buttons                                             |

Only users the plugin authorises see it; the buttons need the `target` ability.

## Hiding pages, resources and actions

```php
use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\AlfakitFeatureFlags\Concerns\FeatureFlagged;

class Billing extends Page
{
    use FeatureFlagged;

    protected static ?string $feature = 'new-billing';
}

class InvoiceResource extends Resource
{
    use FeatureFlagged;

    protected static ?string $feature = NewBilling::class;
}

class ExportInvoicesAction extends Action
{
    use FeatureFlagged;

    protected static ?string $feature = 'new-billing';
}
```

Pages and resources lose their navigation item and answer 403; actions are hidden and refused by the action endpoint. The feature is checked for the plugin's current scope (the tenant on panels with tenancy, the user otherwise, see `scopeUsing()`). Override `getFeatureFlag()` or `getFeatureFlagScope()` to decide at runtime.

For anything else, use Pennant directly in AlfaKit's closures:

```php
use Laravel\Pennant\Feature;

TextInput::make('vat_number')->visible(fn (): bool => Feature::active('vat'));
Action::make('refund')->visible(fn (Order $record): bool => Feature::for($record->team)->active('refunds'));
```

## Tenancy

On panels with tenancy the current tenant is the Pennant scope (`tenantScope()`, on by default), and the pages manage that tenant only:

- the features table shows the tenant's value and where it comes from instead of global counts;
- **Turn on / off**, **Set value** and **Use the default** change the tenant's own value;
- targeting and the audit trail list only what was done in the tenant; resolvers receive `$tenant` (without a search closure, only records that belong to the tenant through the panel's ownership relationship are offered);
- actions that affect every tenant (everyone, rollouts, schedules, the kill switch, purging) are not offered. Allow them with `globalActionsOnTenantPanels()`, e.g. on an internal staff panel.

## Audit trail

Every change is recorded in `alfakit_feature_flag_audits`: the feature, the action, the scope, who (and from which panel and tenant), whether it came from the panel or a schedule, and JSON snapshots before and after. The feature's page shows it with filters and a details slide-over. With [`alfasix/alfakit-activity-log`](/docs/plugins/activity-log) installed, changes are also written to the `feature-flags` log (`activityLog(false)` turns that off).

## Options

| Method                                | Default              | Does                                                                        |
| ------------------------------------- | -------------------- | --------------------------------------------------------------------------- |
| `authorize(bool\|Closure)`            | –                    | Who may open the pages: `fn (User $user): bool`                             |
| `gate(string)`                        | `manageFeatureFlags` | The gate checked without `authorize()`                                      |
| `authorizeActions(Closure)`           | –                    | `fn (string $ability, ?string $feature, User $user): bool`, narrows actions |
| `readOnly(bool\|Closure)`             | `false`              | Show everything, change nothing                                             |
| `requiresPasswordConfirmation()`      | `false`              | Ask for the password before the kill switch, purging and resetting          |
| `store(?string)`                      | Pennant's default    | The Pennant store managed                                                   |
| `discoverFeatures($namespace, $path)` | –                    | `Feature::discover()` when the panel boots                                  |
| `descriptions(array)`                 | `[]`                 | Descriptions by feature name                                                |
| `values(array)`                       | `[]`                 | Known values of rich features (list or `value => label`)                    |
| `hideFeatures(array)`                 | `[]`                 | Features the panel doesn't list                                             |
| `scopes(array)`                       | `[]`                 | Scope resolvers for targeting                                               |
| `scopeUsing(?Closure)`                | tenant or user       | The current scope: `fn (?User $user, ?Model $tenant) => …`                  |
| `tenantScope(bool)`                   | `true`               | Use the tenant as the scope on panels with tenancy                          |
| `globalActionsOnTenantPanels(bool)`   | `false`              | Offer actions that affect every tenant on tenant panels                     |
| `activityLog(bool)`                   | when installed       | Also write to the activity log                                              |
| `navigationLabel/Group/Icon/Sort()`   | –                    | Navigation                                                                  |
| `registerNavigation(bool\|Closure)`   | `true`               | Show the Features page in the navigation                                    |

Abilities: `FeatureFlagsPlugin::ABILITY_TOGGLE`, `ABILITY_TARGET`, `ABILITY_ROLLOUT`, `ABILITY_SCHEDULE`, `ABILITY_KILL`, `ABILITY_PURGE`.

Config (`config/alfakit-feature-flags.php`): `enforce_rules`, `track_pennant_writes`, `register_schedule`, `connection`, `descriptions`.

## Security notes

- **Deny by default.** Without `authorize()` only users the `manageFeatureFlags` gate allows can open the pages, the entry or run actions; guests never can. Every action is authorised again on the server through the plugin (not the button's visibility).
- **Targeting is checked on the server.** Chosen scopes are resolved through your resolvers with the current tenant; anything else is rejected with a validation error.
- **Rich values** are decoded as JSON with a depth and size limit; nothing is evaluated.
- **Tenant isolation.** Tenant panels change and list only their own tenant's values, targeting and audit entries, and never show cross-tenant counts or stored values.
- **Destructive actions** (kill switch, purge, reset) are confirmed and can require the password.
- Feature names in URLs are base64url encoded and must match a known feature, or the page answers 404.
