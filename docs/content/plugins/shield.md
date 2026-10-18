---
title: Shield
description: Roles and permissions for panels, built on spatie/laravel-permission.
---

# Shield

`alfasix/alfakit-shield` manages roles and permissions with [spatie/laravel-permission](https://spatie.be/docs/laravel-permission). It is AlfaKit's counterpart of Filament Shield, so the API will look familiar:

- a **Roles** resource listing every permission of the panel in tabs (resources, pages, widgets, custom permissions);
- **permission discovery** from the panel's resources, pages and widgets;
- `alfakit-shield:generate`, which creates the permissions and the **policies** that check them;
- a **super admin** role and an optional **panel user** role;
- traits that guard **pages** and **widgets**;
- **tenant-scoped roles** on panels with tenancy.

Everything is built from AlfaKit resources, forms and tables, so it works with the React, Vue and Svelte renderers without extra frontend code.

## Installation

```bash
composer require alfasix/alfakit-shield
php artisan alfakit-shield:install --migrate
```

The install command copies spatie's `config/permission.php` and permission tables migration (unless they exist) and `config/alfakit-shield.php`, then lists the next steps.

| Option          |                                                                             |
| --------------- | --------------------------------------------------------------------------- |
| `--teams`       | Sets `'teams' => true` in `config/permission.php`, for tenant-scoped roles. |
| `--migrate`     | Runs `php artisan migrate`.                                                 |
| `--generate`    | Runs `alfakit-shield:generate` afterwards (needs the tables).               |
| `--panel=admin` | The panel to generate for.                                                  |

Add spatie's `HasRoles` trait to the user model:

```php
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasRoles;
}
```

## Registering the plugin

```php
use AlfaSix\AlfakitShield\ShieldPlugin;

public function panel(Panel $panel): Panel
{
    return $panel
        // ...
        ->plugin(ShieldPlugin::make());
}
```

The plugin registers `RoleResource` at `/{panel}/shield/roles`. Create the permissions and policies and make yourself super admin:

```bash
php artisan alfakit-shield:generate --panel=admin
php artisan alfakit-shield:super-admin --user=1 --panel=admin
```

Until policies exist, AlfaKit allows every action on a resource (unless the panel uses `strictAuthorization()`), so run `generate` before giving people access.

## Configuration

### Role resource

| Method                                    | Default               |                                                                |
| ----------------------------------------- | --------------------- | -------------------------------------------------------------- |
| `roleResource(MyRoleResource::class)`     | `RoleResource::class` | Use a subclass of `RoleResource`, or `false` to register none. |
| `navigationGroup('Settings')`             | none                  | Navigation group (string or closure).                          |
| `navigationSort(10)`                      | none                  | Navigation sort.                                               |
| `navigationIcon('shield-check')`          | `shield-check`        | Navigation icon.                                               |
| `navigationLabel('Roles')`                | translated "Roles"    | Navigation label.                                              |
| `navigationBadge(fn () => Role::count())` | none                  | Navigation badge.                                              |
| `registerNavigation(false)`               | `true`                | Hide the resource from the navigation.                         |

### Role form layout

| Method                                                                       | Default    |                                                          |
| ---------------------------------------------------------------------------- | ---------- | -------------------------------------------------------- |
| `gridColumns(['default' => 1, 'sm' => 2, 'lg' => 3])`                        | same       | Columns of the grid of resource sections.                |
| `sectionColumnSpan(1)`                                                       | `1`        | Column span of each resource section.                    |
| `resourceCheckboxListColumns(['default' => 1, 'sm' => 2])`                   | same       | Columns of the checkbox list in each resource section.   |
| `checkboxListColumns(['default' => 1, 'sm' => 2, 'lg' => 3])`                | same       | Columns of the page, widget and custom permission lists. |
| `tabs(resources: true, pages: true, widgets: true, customPermissions: true)` | all `true` | Show or hide tabs. Empty tabs are always hidden.         |

Each resource section has select-all and deselect-all buttons, and the **Select all** toggle at the top checks every permission of every tab.

The **Custom permissions** tab lists the plugin's `customPermissions()` and any permission of the guard stored in the database that belongs to no resource, page or widget.

### Permissions

| Method                                                                                                | Default                                   |                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `resourcePermissionPrefixes([...])`                                                                   | `ShieldPlugin::DEFAULT_RESOURCE_PREFIXES` | The prefixes of every resource.                                                                                                        |
| `pagePermissionPrefix('view')`                                                                        | `view`                                    | Page permissions are `{prefix}_{page}`.                                                                                                |
| `widgetPermissionPrefix('view')`                                                                      | `view`                                    | Widget permissions are `{prefix}_{widget}`.                                                                                            |
| `buildPermissionKeyUsing(fn (string $prefix, string $subject, string $entity, string $class) => ...)` | `{prefix}_{subject}`                      | Build the names yourself. `$entity` is `resource`, `page` or `widget`.                                                                 |
| `customPermissions(['export_orders' => 'Export orders'])`                                             | none                                      | Extra permissions (a list of names or names mapped to labels).                                                                         |
| `excludeResources([...])`, `excludePages([...])`, `excludeWidgets([...])`                             | the `Dashboard` page                      | Leave entities out.                                                                                                                    |
| `localizePermissionLabels()`                                                                          | off                                       | Label permissions with `alfakit-shield::shield.prefixes.*` and `alfakit-shield::shield.custom.*` instead of the headline-cased prefix. |
| `guard('web')`                                                                                        | the panel's auth guard                    | The guard of roles and permissions.                                                                                                    |

The default resource prefixes are `view_any`, `view`, `create`, `update`, `delete`, `delete_any`, `restore`, `restore_any`, `force_delete`, `force_delete_any`, `replicate` and `reorder`. The subject of a resource is its model's class name in snake case (`BlogPost` → `view_any_blog_post`); resources sharing a model share its permissions. Pages and widgets use their class name (`ReportsPage` → `view_reports_page`).

A resource chooses its own prefixes by implementing `HasShieldPermissions`. Its list replaces the plugin's, so spread the defaults to add to them:

```php
use AlfaSix\AlfakitShield\Contracts\HasShieldPermissions;
use AlfaSix\AlfakitShield\ShieldPlugin;

class PostResource extends Resource implements HasShieldPermissions
{
    public static function getPermissionPrefixes(): array
    {
        return [...ShieldPlugin::DEFAULT_RESOURCE_PREFIXES, 'publish'];
    }
}
```

### Super admin

```php
ShieldPlugin::make()->superAdmin(enabled: true, role: 'super_admin', gate: true);
```

- `gate: true` (default) registers a `Gate::before()` callback: users with the role pass every ability.
- `gate: false` gives the role every permission instead. `alfakit-shield:generate` and `alfakit-shield:super-admin` keep it up to date.
- `superAdmin(false)` turns the role off.

### Panel user

```php
ShieldPlugin::make()->panelUser(role: 'panel_user');
```

With the `HasPanelShield` trait on the user model, new users get the panel user role and `canAccessPanel()` lets in only users with the panel user or super admin role. Without `panelUser()`, `HasPanelShield::canAccessPanel()` lets every signed-in user in.

```php
use AlfaSix\Alfakit\Contracts\CanAccessPanel;
use AlfaSix\AlfakitShield\Traits\HasPanelShield;

class User extends Authenticatable implements CanAccessPanel
{
    use HasPanelShield;
    use HasRoles;
}
```

## Pages and widgets

```php
use AlfaSix\AlfakitShield\Traits\HasPageShield;
use AlfaSix\AlfakitShield\Traits\HasWidgetShield;

class Reports extends Page
{
    use HasPageShield; // view_reports: canAccess() and the navigation item
}

class SalesChart extends ChartWidget
{
    use HasWidgetShield; // view_sales_chart: canView()
}
```

`Reports::getShieldPermission()` returns the permission name.

## Policies

`alfakit-shield:generate` writes a policy per resource model with one method per prefix: `view_any` becomes `viewAny(AuthUser $authUser)`, `update` becomes `update(AuthUser $authUser, Post $post)`, and a custom prefix like `publish` becomes `publish(AuthUser $authUser, ?Post $post = null)`. Each method returns `$authUser->can('{permission}')`.

Laravel discovers `App\Policies\PostPolicy` for `App\Models\Post`. Register policies of other models with `Gate::policy()`. The role model's policy (`App\Policies\RolePolicy`) is registered by the plugin when it exists (`register_role_policy` in the config).

`config/alfakit-shield.php`:

| Key                    | Default                           |                                                       |
| ---------------------- | --------------------------------- | ----------------------------------------------------- |
| `policies.path`        | `app_path('Policies')`            | Where policies are written.                           |
| `policies.namespace`   | `App\Policies`                    | Their namespace.                                      |
| `policies.user_model`  | `Illuminate\Foundation\Auth\User` | The class the methods type-hint as `AuthUser`.        |
| `register_role_policy` | `true`                            | Register `{namespace}\RolePolicy` for the role model. |

Publish the stubs with `php artisan vendor:publish --tag=alfakit-shield-stubs` to change the generated code (`stubs/alfakit-shield/*.stub`).

## Commands

| Command                      |                                                                                                                                                                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `alfakit-shield:generate`    | Creates the permissions and policies. `--panel=` (default: every panel using the plugin), `--option=policies\|permissions\|policies_and_permissions`, `--resource=PostResource` (repeatable; class basename or subject), `--force` overwrites existing policies. |
| `alfakit-shield:super-admin` | Gives a user the super admin role. `--user=` (asked when there are several users), `--panel=`, `--tenant=` on tenant-scoped panels.                                                                                                                              |
| `alfakit-shield:install`     | See [Installation](#installation).                                                                                                                                                                                                                               |

## Tenancy

On a panel with `->tenant(...)`, roles belong to the current tenant when spatie teams are on (`'teams' => true` in `config/permission.php`, or `install --teams`):

- the role resource lists, creates and validates the roles of the current tenant (the team column is set to the tenant's key);
- every time the tenant is set, it becomes spatie's team, so `$user->can()` and `hasRole()` use the user's roles in that tenant;
- `permission.models.team` defaults to the panel's tenant model;
- `alfakit-shield:super-admin --tenant=1` assigns the (global) super admin role within a tenant.

`scopeToTenant(false)` keeps roles global on a tenant panel. If your user model has a `teams()` tenant relationship, keep it as a method on the model: spatie's `HasRoles` defines `teams()` too when teams are on.

## Translations

The plugin's strings live in the `alfakit-shield` namespace (`resources/lang/en/shield.php`). Publish them with `php artisan vendor:publish --tag=alfakit-shield-translations` or override single keys in `lang/vendor/alfakit-shield/{locale}/shield.php`.
