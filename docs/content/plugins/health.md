---
title: Health
description: Show Spatie Laravel Health check results in a panel, refresh them and summarise failures on the dashboard.
---

# Health

`alfasix/alfakit-health` shows [Spatie Laravel Health](https://spatie.be/docs/laravel-health) check results in a panel. The API follows Filament's `shuvroroy/filament-spatie-laravel-health`.

The **Health** page shows the latest results of every check as a card (label, short summary, message, and a status colour and icon), a details table with each check's status, summary, message and meta values, when the checks last ran, and a **Refresh** action that runs the checks. An optional dashboard widget summarises failing checks and links to the page.

Everything is built from AlfaKit's pages, tables, widgets and actions, so it renders in React, Vue and Svelte; there is no frontend package.

## Installation

```bash
composer require alfasix/alfakit-health
```

Install Spatie's package as its documentation describes: register your checks, configure a result store (`health.result_stores`; the page reads the first one) and schedule `health:check`.

```php
use Spatie\Health\Checks\Checks\DatabaseCheck;
use Spatie\Health\Checks\Checks\UsedDiskSpaceCheck;
use Spatie\Health\Facades\Health;

Health::checks([
    UsedDiskSpaceCheck::new(),
    DatabaseCheck::new(),
]);
```

Register the plugin:

```php
use AlfaSix\AlfakitHealth\HealthPlugin;

$panel->plugin(HealthPlugin::make());
```

The page is at `/{panel}/health`.

## Options

```php
HealthPlugin::make()
    ->usingPage(MyHealth::class)             // a subclass of AlfaSix\AlfakitHealth\Pages\Health
    ->dashboardWidget()                      // add HealthStatusWidget to the panel's widgets
    ->dashboardWidget(widget: MyHealthWidget::class)
    ->usingPollingInterval('30s')            // default '10s'; null turns polling off
    ->notifyOnRefresh()                      // send spatie's notifications when Refresh runs the checks
    ->authorize(fn (User $user): bool => $user->is_admin)
    ->navigationGroup('Settings')
    ->navigationLabel('Health')              // default
    ->navigationIcon('heart-pulse')          // default
    ->navigationSort(20)
    ->registerNavigation(false);
```

Closures get `$plugin`, `$panel` and `$user` injected. Read the plugin of the current panel with `HealthPlugin::get()`.

## Statuses

| Status              | Colour  | Icon             |
| ------------------- | ------- | ---------------- |
| `ok`                | success | `circle-check`   |
| `warning`           | warning | `triangle-alert` |
| `failed`, `crashed` | danger  | `circle-x`       |
| `skipped`           | gray    | `circle-minus`   |

## Refreshing

**Refresh** runs `health:check --no-notification` (without `--no-notification` after `notifyOnRefresh()`), stores the results in the configured stores, and reloads the page. Polling only reads the stored results; it never runs the checks.

## Dashboard widget

`dashboardWidget()` adds `AlfaSix\AlfakitHealth\Widgets\HealthStatusWidget` to the panel: "All checks passed", "2 failing checks" (with their labels) or "1 warning", coloured accordingly and linking to the health page. Add it to another page with `getHeaderWidgets()`, or extend it and pass your class to `dashboardWidget(widget: ...)`.

## Authorisation

`authorize()` decides who may open the page, run the checks and see the widgets. Without it every user of the panel may.

## Reading results yourself

`AlfaSix\AlfakitHealth\Support\HealthResults` reads the latest results (`latest()`, `rows()`), runs the checks (`run()`), and maps statuses to labels, colours and icons (`statusLabel()`, `statusColor()`, `statusIcon()`). `HealthCheckResultsWidget` is the page's card widget.
