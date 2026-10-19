# AlfaKit Activity Log

<p><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/alfasixbh/alfakit/main/art/alfasix/alfa-six-micro-white.svg"><img src="https://raw.githubusercontent.com/alfasixbh/alfakit/main/art/alfasix/alfa-six-micro-navy.svg" alt="" width="24" height="18" align="top"></picture> <sub>by <a href="https://alfasixbh.com">Alfa Six</a></sub></p>

> This is a read-only split of the [AlfaKit monorepo](https://github.com/alfasixbh/alfakit/tree/main/packages/plugins/activity-log). Please open issues and pull requests there.

[Spatie Laravel Activitylog](https://spatie.be/docs/laravel-activitylog) (v5) for [AlfaKit](https://alfakit.dev) panels: an activity resource, a relation manager, a timeline infolist entry and optional logging of AlfaKit actions. It renders in React, Vue and Svelte with AlfaKit's built-in components.

## Installation

```bash
composer require alfasix/alfakit-activity-log
```

Install and migrate spatie/laravel-activitylog, and add `LogsActivity` to the models you want to log. Then register the plugin:

```php
use AlfaSix\AlfakitActivityLog\ActivityLogPlugin;

$panel->plugin(
    ActivityLogPlugin::make()
        ->navigationGroup('Settings')
        ->authorize(fn (User $user): bool => $user->is_admin),
);
```

The log is at `/{panel}/activity-log`: filters by log name, event, causer, subject type and date, and a view page with the old → new changes and the custom properties.

## Usage

```php
use AlfaSix\AlfakitActivityLog\Concerns\LogsAlfakitActions;
use AlfaSix\AlfakitActivityLog\Infolists\Components\ActivityLogTimelineEntry;
use AlfaSix\AlfakitActivityLog\RelationManagers\ActivitiesRelationManager;

// A resource whose model uses LogsActivity: the record's activities as a tab.
public static function getRelations(): array
{
    return [ActivitiesRelationManager::class];
}

// An infolist timeline of the record's activities.
ActivityLogTimelineEntry::make()->limit(20)->columnSpanFull();

// Models without LogsActivity: log AlfaKit's create, edit and delete actions…
ActivityLogPlugin::make()->logActions();

// …and resource create / edit pages.
class EditInvoice extends EditRecord
{
    use LogsAlfakitActions;
}
```

On panels with tenancy the log only lists the current tenant's activities (`scopeToTenant()`, `scopeToTenantUsing()`, `recordTenant()`).

See the [documentation](https://alfakit.dev/docs/plugins/activity-log) for every option.

## License

MIT. See [LICENSE.md](LICENSE.md).
