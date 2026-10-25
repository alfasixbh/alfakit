---
title: Settings
description: Settings pages backed by Spatie Laravel Settings.
---

# Settings

`alfasix/alfakit-settings` builds panel pages that edit a [Spatie Laravel Settings](https://github.com/spatie/laravel-settings) class: the form is filled from the settings and the save button writes them back. It mirrors Filament's `filament/spatie-laravel-settings-plugin`.

**Works in** an [admin panel](../getting-started/installation) and a [starter kit](../getting-started/starter-kits) panel, where settings pages are listed in the app sidebar like other panel pages. Settings pages are panel pages, so there is no [standalone](../standalone/overview) version; read the values anywhere with `app(GeneralSettings::class)`.

## Installation

```bash
composer require alfasix/alfakit-settings
```

Install Spatie's package as its documentation describes (publish and run the `settings` migration for the database repository) and create a settings class, `app/Settings/GeneralSettings.php`, with its settings migration:

```php
namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class GeneralSettings extends Settings
{
    public string $site_name;

    public bool $maintenance_mode;

    public static function group(): string
    {
        return 'general';
    }
}
```

```bash
php artisan vendor:publish --provider="Spatie\LaravelSettings\LaravelSettingsServiceProvider" --tag="migrations"
php artisan make:settings-migration CreateGeneralSettings
```

```php
// database/settings/…_create_general_settings.php
public function up(): void
{
    $this->migrator->add('general.site_name', 'My site');
    $this->migrator->add('general.maintenance_mode', false);
}
```

Then `php artisan migrate`.

## Creating a settings page

```bash
php artisan make:alfakit-settings-page ManageGeneral GeneralSettings
```

writes `app/Alfakit/Pages/ManageGeneral.php` (in a panel folder when the app has several panels; `--panel=admin` picks it). The second argument is the settings class: a base name means `App\Settings\{Name}`, or pass the full class name. If the class exists, the form gets a field per typed public property (`Toggle` for `bool`, numeric `TextInput` for `int` and `float`, `TagsInput` for `array`, `TextInput` otherwise, required unless nullable). If it doesn't, the command creates it in `app/Settings` with the group from `--group` (default: the snake-cased name, `general`) and a commented-out example field, so the page shows an empty form without a save button until you add properties, a settings migration (`php artisan make:settings-migration`) and their fields.

Without the second argument the settings class is derived from the page name: `ManageFooter` uses `FooterSettings`. `--force` overwrites existing files. Publish the stubs with `php artisan vendor:publish --tag=alfakit-settings-stubs` to change what is generated.

The page:

```php
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\AlfakitSettings\Pages\SettingsPage;

class ManageGeneral extends SettingsPage
{
    protected static string $settings = GeneralSettings::class;

    protected static ?string $navigationIcon = 'settings';

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('site_name')->required(),
            Toggle::make('maintenance_mode'),
        ]);
    }
}
```

Settings pages are ordinary pages: `discoverPages()` finds them, and every page option works (`$slug`, `$title`, `$navigationGroup`, `$navigationSort`, clusters, layouts). The form can use any field, layout component and live behaviour.

## Registering pages with the plugin

Pages you don't discover can be registered through the plugin, which can also put every settings page into one navigation group:

```php
use AlfaSix\AlfakitSettings\SettingsPlugin;
use App\Alfakit\Pages\ManageFooter;
use App\Alfakit\Pages\ManageGeneral;

$panel->plugin(
    SettingsPlugin::make()
        ->pages([ManageGeneral::class, ManageFooter::class])
        ->navigationGroup('Settings'),
);
```

A page's own `$navigationGroup` wins over the plugin's.

## Filling and saving

The form is filled from `$settings->toArray()`. Only the values of the form's fields are sent to the browser, so a setting the form doesn't show (an API secret) never leaves the server.

Saving validates the form, then runs:

1. `beforeSave()` (and trait hooks such as `beforeSaveHasAudit()`),
2. `mutateFormDataBeforeSave(array $data): array`,
3. `$settings->fill(...)->save()` with the settings' own properties (other form values, such as a confirmation field, are dropped; settings missing from the form keep their value),
4. `afterSave()`,
5. the saved notification.

```php
protected function mutateFormDataBeforeFill(array $data): array
{
    $data['site_name'] = Str::title($data['site_name']);

    return $data;
}

protected function mutateFormDataBeforeSave(array $data): array
{
    $data['site_name'] = trim($data['site_name']);

    return $data;
}
```

`beforeValidate()` and `afterValidate()` run around validation, and `$this->halt()` in a hook stops without saving. The page's actions run in a database transaction when the panel has `databaseTransactions()`.

| Override                                | Default                                |
| --------------------------------------- | -------------------------------------- |
| `getSavedNotificationTitle(): ?string`  | "Saved"; `null` sends no notification  |
| `getSavedNotification(): ?Notification` | A success notification with that title |
| `getRedirectUrl(): ?string`             | `null`: stay on the page               |
| `getSaveFormAction(): Action`           | The save button (`mod+s`)              |
| `getFormActions(): array`               | `[$this->getSaveFormAction()]`         |
| `getSettings(): Settings`               | `app(static::$settings)`               |

## Authorisation

Override `canAccess()` to limit who can open the page; it is checked when the page loads, for every internal request (the save action) and again in `save()`. The page is also hidden from the navigation:

```php
public static function canAccess(): bool
{
    return auth()->user()?->can('manage-settings') ?? false;
}
```

## Translations

| Key                                | English      |
| ---------------------------------- | ------------ |
| `alfakit-settings::settings.save`  | Save changes |
| `alfakit-settings::settings.saved` | Saved        |

Override them in `lang/vendor/alfakit-settings/{locale}/settings.php`.
