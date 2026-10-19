# AlfaKit Health

<p><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/alfasixbh/alfakit/main/art/alfasix/alfa-six-micro-white.svg"><img src="https://raw.githubusercontent.com/alfasixbh/alfakit/main/art/alfasix/alfa-six-micro-navy.svg" alt="" width="24" height="18" align="top"></picture> <sub>by <a href="https://alfasixbh.com">Alfa Six</a></sub></p>

> This is a read-only split of the [AlfaKit monorepo](https://github.com/alfasixbh/alfakit/tree/main/packages/plugins/health). Please open issues and pull requests there.

[Spatie Laravel Health](https://spatie.be/docs/laravel-health) for [AlfaKit](https://alfakit.dev) panels: a Health page with the latest result of every check, a refresh action that runs the checks, and an optional dashboard widget summarising failures. It renders in React, Vue and Svelte with AlfaKit's built-in components.

## Installation

```bash
composer require alfasix/alfakit-health
```

Install spatie/laravel-health, register your checks and a result store, and register the plugin:

```php
use AlfaSix\AlfakitHealth\HealthPlugin;

$panel->plugin(
    HealthPlugin::make()
        ->dashboardWidget()
        ->authorize(fn (User $user): bool => $user->is_admin),
);
```

The page is at `/{panel}/health`.

## Usage

- A card per check: label, short summary, message, status colour and icon.
- A details table with each check's status, summary, message and meta values.
- **Refresh** runs `health:check --no-notification` (`notifyOnRefresh()` sends spatie's notifications).
- `dashboardWidget()` adds `HealthStatusWidget`: "All checks passed", or the failing checks, linking to the page.

Other options: `usingPage()`, `usingPollingInterval()`, `navigationGroup()`, `navigationLabel()`, `navigationIcon()`, `navigationSort()`, `registerNavigation()`. See the [documentation](https://alfakit.dev/docs/plugins/health).

## License

MIT. See [LICENSE.md](LICENSE.md).
