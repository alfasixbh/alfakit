---
title: Plugin bundles
description: 'Install a curated set of first-party plugins with one command: SaaS starter, content site, back office, customer support, and ops and safety.'
---

# Plugin bundles

A bundle is a set of first-party plugins that belong together. `alfakit:setup --bundle=<name>` installs each of them exactly like [`alfakit:add`](setup-wizard#adding-and-removing-plugins) does (Composer after a confirmation, the registration on your panel provider, the plugin's migrations), and chains a sensible default onto each registration: a navigation group, so a bundle lands tidy in the sidebar.

```bash
php artisan alfakit:setup --bundle=saas
```

| Bundle       | Name             | Plugins                                                                                                                                                                               |
| ------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `saas`       | SaaS starter     | [Teams](../plugins/teams), [Billing](../plugins/billing), [Shield](../plugins/shield), [Feature flags](../plugins/feature-flags), [Analytics](../plugins/analytics)                   |
| `content`    | Content site     | [CMS](../plugins/cms), [Forms](../plugins/forms), [Media library](../plugins/media-library), [Analytics](../plugins/analytics), [Translation manager](../plugins/translation-manager) |
| `backoffice` | Back office      | [Invoices](../plugins/invoices), [Workflows](../plugins/workflows), [Kanban](../plugins/kanban), [File manager](../plugins/file-manager), [Activity log](../plugins/activity-log)     |
| `support`    | Customer support | [Helpdesk](../plugins/helpdesk), [Comments](../plugins/comments), [AI](../plugins/ai)                                                                                                 |
| `ops`        | Ops and safety   | [Ops](../plugins/ops), [Backup](../plugins/backup), [Health](../plugins/health), [Webhooks](../plugins/webhooks)                                                                      |

## What a bundle sets up

- **Packages**: `composer require alfasix/alfakit-<slug>` for each plugin that is not installed yet (asked first; `--no-install` prints the commands instead).
- **Registration**: an entry in the panel provider's `->plugins([...])` array, with the bundle's defaults:

```php
->plugins([
    OpsPlugin::make()->navigationGroup('System'),
    BackupPlugin::make()->navigationGroup('System'),
    HealthPlugin::make()->navigationGroup('System'),
    WebhooksPlugin::make()->navigationGroup('System'),
])
```

- **Migrations**: each plugin's migrations are published (and the migrations of the spatie package it builds on); `--migrate` runs them without asking.
- **Teams**: the `saas` bundle (and `all`) registers Teams on the panel you install into, which turns that panel into a team workspace: its pages move under a team URL (`/admin/{team}/…`) and its resources are scoped to the current team. The summary says so. The [Teams](../plugins/teams) docs put it on a panel of its own (`app`); to keep `/admin` without teams, run `php artisan make:alfakit-panel app`, `php artisan alfakit:add teams --panel=app`, then `php artisan alfakit:remove teams --panel=admin` (the package stays while the `app` panel uses it).
- **Roles**: the `saas` bundle includes Shield, so the wizard also runs `alfakit-shield:install` and adds `HasRoles` to your user model, as `--roles` does.
- **Notes**: what is left to do (keys for Cashier, a scheduler entry, a page to publish) is listed in the summary.

Groups used: **Settings** (Shield, feature flags, translation manager, AI, activity log), **Insights** (analytics), **Content** (CMS, forms), **Finance** (invoices), **Operations** (workflows, file manager), **Support** (helpdesk) and **System** (ops, backup, health, webhooks). Change them afterwards in the provider like any other option.

## Combining

Bundles combine with commas and with single plugins; a plugin in two bundles is installed once, and running the command again skips what is already set up:

```bash
php artisan alfakit:setup --bundle=content,support --plugins=tags
php artisan alfakit:setup --bundle=all                 # every bundle
php artisan alfakit:setup --plugins=all                # every first-party plugin
```

Other wizard flags work as usual (`--mode`, `--panel`, `--users`, `--brand-color`, `--demo`, `--migrate`). An unknown bundle name stops the command before it changes anything.

## Seeing a plugin first

Every plugin has a page on the website with a short clip in React, Vue and Svelte, its highlights and a link into the live demo. From the terminal:

```bash
php artisan alfakit:add --list kanban
```

prints the plugin's highlights, the demo page to open (`ALFAKIT_DEMO_URL`, `config('alfakit.demo_url')`) with a short tour, and the plugins it works well with.

## A local playground

A new Laravel app with AlfaKit, every first-party plugin and demo data:

```bash
laravel new alfakit-playground --react --no-interaction   # or --vue, --svelte
cd alfakit-playground
composer require alfasix/alfakit
php artisan alfakit:setup --mode=panel --bundle=all --plugins=all --users --demo --migrate --no-interaction
composer run dev
```

Open `/admin` and sign in with the account printed by `database/seeders/AlfakitDemoSeeder.php`. The seeder only runs outside production. Some plugins need a key or a service to do their real work (Cashier keys for billing, a provider key for AI, a queue worker for webhooks and backups); the summary lists them, and everything else works straight away.

To try the plugins without installing anything, use the [live demo](https://demo.alfakit.dev): `demo@alfakit.dev` / `password`.
