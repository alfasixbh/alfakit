# AlfaKit Backup

<p><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/alfasixbh/alfakit/main/art/alfasix/alfa-six-micro-white.svg"><img src="https://raw.githubusercontent.com/alfasixbh/alfakit/main/art/alfasix/alfa-six-micro-navy.svg" alt="" width="24" height="18" align="top"></picture> <sub>by <a href="https://alfasixbh.com">Alfa Six</a></sub></p>

> This is a read-only split of the [AlfaKit monorepo](https://github.com/alfasixbh/alfakit/tree/main/packages/plugins/backup). Please open issues and pull requests there.

[Spatie Laravel Backup](https://spatie.be/docs/laravel-backup) for [AlfaKit](https://alfakit.dev) panels: a Backups page that lists the backups of every destination disk with the destinations' health, creates backups in the background, and downloads and deletes them. It renders in React, Vue and Svelte with AlfaKit's built-in components.

## Installation

```bash
composer require alfasix/alfakit-backup
```

Install and configure spatie/laravel-backup (`config/backup.php`), run a queue worker, and register the plugin:

```php
use AlfaSix\AlfakitBackup\BackupPlugin;

$panel->plugin(
    BackupPlugin::make()
        ->usingQueue('backups')
        ->usingPollingInterval('10s')
        ->authorize(fn (User $user): bool => $user->is_admin),
);
```

The page is at `/{panel}/backups`.

## Usage

- **Create backup** queues `CreateBackupJob` (database and files, database only or files only), which runs `backup:run`.
- **Download** opens a temporary signed link that streams the archive (`downloadLinkLifetime()`, 5 minutes by default).
- **Delete** removes the archive from its disk.
- A card per destination shows whether it is healthy (spatie's monitor health checks), the number of backups, the storage used and the newest backup.

Other options: `usingPage()`, `timeout()`, `noTimeout()`, `navigationGroup()`, `navigationLabel()`, `navigationIcon()`, `navigationSort()`, `registerNavigation()`. See the [documentation](https://alfakit.dev/docs/plugins/backup).

## License

MIT. See [LICENSE.md](LICENSE.md).
