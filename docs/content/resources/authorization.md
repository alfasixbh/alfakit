---
title: Authorization
description: Policies, per-action authorization and hiding navigation.
---

# Authorization

AlfaKit uses Laravel policies. When a policy exists for the resource model, each prebuilt action and page checks the matching ability:

| Ability                          | Used by                                                 |
| -------------------------------- | ------------------------------------------------------- |
| `viewAny`                        | Navigation item, list page, global search               |
| `create`                         | Create page, `CreateAction`                             |
| `view`                           | View page, `ViewAction`, row links                      |
| `update`                         | Edit page, `EditAction`, row links, inline cell edits   |
| `reorder`                        | Drag-and-drop reordering (plus `update` on each record) |
| `delete` / `deleteAny`           | `DeleteAction` / `DeleteBulkAction`                     |
| `restore` / `restoreAny`         | `RestoreAction` / `RestoreBulkAction`                   |
| `forceDelete` / `forceDeleteAny` | `ForceDeleteAction` / `ForceDeleteBulkAction`           |
| `replicate`                      | `ReplicateAction`                                       |

Tables without a resource (relation managers, widgets, custom pages) check the model's policy directly. Missing policies and policy methods are treated as allowed, unless the panel uses `strictAuthorization()`:

```php
$panel->strictAuthorization(); // a model without a policy, or a policy without the method, denies
```

With strict authorization, forgetting `restore()` on a policy hides the restore action instead of allowing it for everyone. Skip policies on a resource with `protected static bool $shouldSkipAuthorization = true;` or override `can(string $action, ?Model $record)`.

### Gate abilities without a policy

By default a resource first looks for a policy method and allows the ability when there is none. Set `$shouldCheckPolicyExistence` to `false` to send every check straight to Laravel's Gate instead, so `Gate::before()` callbacks and `Gate::define()` abilities decide, and a missing policy or policy method denies:

```php
namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Resources\Resource;

class PostResource extends Resource
{
    protected static bool $shouldCheckPolicyExistence = false;
}
```

```php
// AppServiceProvider::boot()
Gate::before(fn (User $user) => $user->is_admin ? true : null);
Gate::define('viewAny', fn (User $user) => $user->hasRole('editor'));
```

## Custom actions

```php
Action::make('publish')->authorize('publish');              // Gate ability against the record
Action::make('publish')->authorize(fn (Post $record) => $record->isDraft());
```

Unauthorised actions are hidden, and the action endpoint refuses to run them even if the request is forged. The same applies to actions inside a hidden `ActionGroup` or a hidden section, and to the modal form and select search of a hidden action.

## Pages

```php
public static function canAccess(): bool
{
    return auth()->user()->can('viewReports');
}
```

Pages that fail `canAccess()` are hidden from navigation and return 403. Internal endpoints (actions, schema refresh) re-check it.

## Fields and columns

Hide any component with `->hidden()` / `->visible()` closures, or restrict by operation: `->visibleOn('create')`, `->disabledOn('edit')`. Hidden fields (including fields inside a hidden section, tab or step) are not validated, not saved and not sent to the browser. Disabled fields keep their server value unless you call `->dehydrated()`. See [Security](/docs/advanced/security).
