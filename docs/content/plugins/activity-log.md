---
title: Activity log
description: Browse Spatie Laravel Activitylog activities with a resource, a relation manager and a timeline entry.
---

# Activity log

`alfasix/alfakit-activity-log` puts [Spatie Laravel Activitylog](https://spatie.be/docs/laravel-activitylog) (v5) in your panel. The API follows Filament's activity log plugins (`rmsramos/activitylog`, `pxlrbt/filament-activity-log`).

| Class                       | Does                                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ActivityLogPlugin`         | Registers the resource and holds the options                                                                                     |
| `ActivityResource`          | Lists the activity log (filters by log, event, causer, subject type and date) and shows each activity with its old → new changes |
| `ActivitiesRelationManager` | The activities of a record, on any resource whose model uses `LogsActivity`                                                      |
| `ActivityLogTimelineEntry`  | The record's activities as a timeline in an infolist                                                                             |
| `LogsAlfakitActions`        | A page trait that logs create and edit pages for models without `LogsActivity`                                                   |

Everything is built from AlfaKit's resources, tables, infolists and actions, so it renders in React, Vue and Svelte; there is no frontend package.

## Installation

```bash
composer require alfasix/alfakit-activity-log
```

Install Spatie's package as its documentation describes (publish and run the `activity_log` migration), and log your models:

```php
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Post extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnly(['title', 'status'])->logOnlyDirty();
    }
}
```

Register the plugin on a panel:

```php
use AlfaSix\AlfakitActivityLog\ActivityLogPlugin;

$panel->plugin(ActivityLogPlugin::make());
```

The activity log is at `/{panel}/activity-log`.

## The activity resource

The list shows the log name, event, description, subject (linked to its view or edit page when a resource of the panel manages the model), causer and date, newest first. Filters:

- **Log**, **Event** and **Subject type**: the values found in the log.
- **Causer**: the users (or other causers) found in the log.
- **Date**: from / until.

The view page shows the overview, a **Changes** table (attribute, old value, new value) built from the activity's `attribute_changes` (or `properties.attributes` / `properties.old` for activities logged by v4 or by hand), and the remaining custom **Properties** as a key-value list. Activities are read only: the resource never creates, edits or deletes them.

## Options

```php
ActivityLogPlugin::make()
    ->navigationGroup('Settings')        // string or closure; no group by default
    ->navigationLabel('Audit trail')     // default "Activity log"
    ->navigationIcon('history')          // default
    ->navigationSort(3)
    ->navigationCountBadge()             // number of activities (in the tenant) as a badge
    ->registerNavigation(false)          // keep the page, hide the item
    ->label('activity')                  // model labels
    ->pluralLabel('activities')
    ->resourceClass(MyActivityResource::class)
    ->authorize(fn (User $user): bool => $user->is_admin)
    ->scopeToTenant()                    // default
    ->scopeToTenantUsing(fn (Builder $query, Team $tenant) => $query->where('properties->team_id', $tenant->id))
    ->recordTenant()                     // default
    ->logActions();
```

Every option that takes a closure gets `$plugin`, `$panel`, `$user` and `$tenant` injected. Read the plugin of the current panel with `ActivityLogPlugin::get()`.

### Your own resource

Extend `ActivityResource` to change the table, the infolist or the pages, and pass it to `resourceClass()`:

```php
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitActivityLog\Resources\ActivityResource;
use AlfaSix\AlfakitActivityLog\Support\ActivitySchema;

class MyActivityResource extends ActivityResource
{
    public static function table(Table $table): Table
    {
        return parent::table($table)->paginationPageOptions([50, 100]);
    }
}
```

`ActivitySchema::columns()`, `ActivitySchema::filters()`, `ActivitySchema::infolist()` and `ActivitySchema::changesEntry()` return the pieces the plugin uses, for your own resources and pages. The activity model is spatie's `activitylog.activity_model`.

### Authorisation

With `authorize()` the closure (or boolean) decides who may list and view activities, and who sees the relation manager. Without it the resource asks the activity model's policy (`viewAny`, `view`); without a policy everyone may, unless the panel uses `strictAuthorization()`.

```php
Gate::policy(Activity::class, ActivityPolicy::class);
```

### Tenancy

On a panel with tenancy the log lists only the current tenant's activities. An activity belongs to the tenant when:

- it was logged during a request to the tenant: with `recordTenant()` (on by default) the plugin stores the tenant in the activity's properties (`alfakit_tenant_type`, `alfakit_tenant_id`), so activities of deleted records and of models without a tenant relationship stay in the tenant's log;
- its subject is the tenant itself;
- its subject belongs to the tenant through the panel's tenant ownership relationship (`team()`).

`scopeToTenantUsing()` replaces this scope; `scopeToTenant(false)` lists every activity on every tenant.

## Relation manager

Add `ActivitiesRelationManager` to a resource whose model uses `LogsActivity` (or `HasActivity`):

```php
use AlfaSix\AlfakitActivityLog\RelationManagers\ActivitiesRelationManager;

public static function getRelations(): array
{
    return [ActivitiesRelationManager::class];
}
```

It lists the record's activities (as subject), newest first, with event and date filters, and opens each one in a modal with its changes. It reads `activitiesAsSubject()`, `activities()`, or the subject morph relation for models logged without the trait. The plugin's `authorize()` hides it.

## Timeline entry

```php
use AlfaSix\AlfakitActivityLog\Infolists\Components\ActivityLogTimelineEntry;

public static function infolist(Schema $schema): Schema
{
    return $schema->components([
        // ...
        ActivityLogTimelineEntry::make()
            ->limit(20)                                  // default 10; null for all
            ->modifyQueryUsing(fn (Builder $query) => $query->inLog('orders'))
            ->showChanges()                              // default; false hides the changes tables
            ->columnSpanFull(),
    ]);
}
```

Each item shows "Updated by Ada", how long ago, the description and the old → new changes. It is a `RepeatableEntry` (it renders as one), so the usual entry options (`label()`, `contained()`, `grid()`…) apply.

## Logging AlfaKit actions

For models that don't use `LogsActivity`, the plugin can log what users do in the panel:

```php
ActivityLogPlugin::make()->logActions();
```

`CreateAction`, `EditAction`, `DeleteAction` and `DeleteBulkAction` then log a `created`, `updated` or `deleted` activity (with the changed attributes; timestamps, passwords and hidden attributes are left out) on panels with the option. Models that use `LogsActivity` are skipped, since they log themselves.

Resource create and edit pages save without an action; add the trait to them:

```php
use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use AlfaSix\AlfakitActivityLog\Concerns\LogsAlfakitActions;

class EditInvoice extends EditRecord
{
    use LogsAlfakitActions;
}
```

Log anything else with `ActionActivityLogger::log('approved', $invoice, force: true)` or spatie's `activity()` helper.
