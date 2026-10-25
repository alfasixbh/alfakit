---
title: Backup
description: List, create, download and delete Spatie Laravel Backup backups from a panel.
---

# Backup

`alfasix/alfakit-backup` manages [Spatie Laravel Backup](https://spatie.be/docs/laravel-backup) backups from a panel page. The API follows Filament's `shuvroroy/filament-spatie-laravel-backup`.

The **Backups** page shows:

- a card per backup destination (each monitored backup, and each of the application's destination disks): healthy, unhealthy or unreachable, with the number of backups, the storage they use, the age of the newest one and the failed health checks;
- a table of the backups on every destination disk, newest first: file, path, disk, date and size, with a disk filter;
- a **Create backup** action that queues a backup (database and files, database only or files only), and **Download** and **Delete** actions per backup.

The cards and the table refresh while the page is open. Everything is built from AlfaKit's pages, tables, widgets and actions, so it renders in React, Vue and Svelte; there is no frontend package.

**Works in** an [admin panel](../getting-started/installation) and a [starter kit](../getting-started/starter-kits) panel, where **Backups** is listed in the app sidebar. It is a panel page, so there is nothing to use [outside panels](../standalone/overview).

## Installation

```bash
composer require alfasix/alfakit-backup
```

Install and configure Spatie's package as its documentation describes (`php artisan vendor:publish --provider="Spatie\Backup\BackupServiceProvider"` writes `config/backup.php`: the destination disks, the monitored backups and their health checks; the defaults back up to the `local` disk). Then register the plugin:

```php
use AlfaSix\AlfakitBackup\BackupPlugin;

$panel->plugin(BackupPlugin::make());
```

The page is at `/{panel}/backups`. Run a queue worker (`php artisan queue:work`, or `composer dev` in a starter kit): backups are created by a queued job, never during the request.

## Options

```php
BackupPlugin::make()
    ->usingPage(MyBackups::class)            // a subclass of AlfaSix\AlfakitBackup\Pages\Backups
    ->usingQueue('backups', 'redis')         // queue and connection of the backup job
    ->timeout(600)                           // seconds; also passed to backup:run --timeout
    ->noTimeout()                            // set_time_limit(0) in the job
    ->usingPollingInterval('10s')            // default '4s'; null turns polling off
    ->downloadLinkLifetime(10)               // minutes a download link stays valid (default 5)
    ->authorize(fn (User $user): bool => $user->is_admin)
    ->navigationGroup('Settings')
    ->navigationLabel('Backups')
    ->navigationIcon('archive')              // default
    ->navigationSort(10)
    ->registerNavigation(false);
```

Closures get `$plugin`, `$panel` and `$user` injected. Read the plugin of the current panel with `BackupPlugin::get()`.

## Creating backups

**Create backup** asks what to back up and dispatches `AlfaSix\AlfakitBackup\Jobs\CreateBackupJob`, which runs `backup:run` (with `--only-db` or `--only-files`, and `--timeout` when set) on the configured queue. The backup appears in the list once the job finished; the page polls for it.

## Downloads

**Download** opens a temporary signed URL (`/{panel}/backups/download?disk=…&path=…&signature=…`). The route is inside the panel (signed-in users only), checks the signature and its expiry, checks the plugin's `authorize()` again, and only serves files that are listed backups of a destination disk, so no other file of the disk can be read. The archive is streamed from the disk.

## Authorisation

`authorize()` decides who may open the page, create, download and delete backups, and see the destination cards. Without it every user of the panel may.

## Your own page

```php
use AlfaSix\AlfakitBackup\Pages\Backups;

class MyBackups extends Backups
{
    protected function getHeaderWidgets(): array
    {
        return []; // no destination cards
    }
}
```

`BackupRepository::backups()`, `::statuses()`, `::destinations()` and `::find($disk, $path)` read the same data for your own pages and widgets; `BackupDestinationsWidget` is the destination cards widget.
