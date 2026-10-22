---
title: Live demo
description: Maison Alfa, a fictional perfume shop that shows every AlfaKit feature in React, Vue and Svelte.
---

# Live demo

The [live demo](https://demo.alfakit.dev) is **Maison Alfa**, a fictional perfume and lifestyle shop with three boutiques. It is one Laravel application with one SQLite database and one panel definition, served three times: the same PHP classes render through React, Vue and Svelte.

| Address                                                                                                                                                              | What you get                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`/react/admin`](https://demo.alfakit.dev/react/admin), [`/vue/admin`](https://demo.alfakit.dev/vue/admin), [`/svelte/admin`](https://demo.alfakit.dev/svelte/admin) | The admin panel in each renderer                                                                         |
| [`/react`](https://demo.alfakit.dev/react), [`/vue`](https://demo.alfakit.dev/vue), [`/svelte`](https://demo.alfakit.dev/svelte)                                     | The storefront, built from [standalone components](../standalone/overview) inside ordinary Inertia pages |

## Signing in

Everyone shares one account, shown on the login page with a button that fills it in:

- E-mail: `demo@alfakit.dev`
- Password: `password`

The account owns the Manama boutique and manages Dubai and London, so the store switcher, per-role layouts (owners get the sidebar, managers the top bar) and policies all have something to show. Its e-mail address, password and second factors are locked so the next visitor can sign in; impersonate a colleague from **Settings › Staff** to try two-factor set-up.

## The renderer switcher

The top bar of every panel page has a **React · Vue · Svelte** switch. It opens the _same_ page in the other renderer: the store, the record, the filters and the query string are kept, so `/react/admin/manama/orders?tab=open` becomes `/vue/admin/manama/orders?tab=open`. The storefront header has the same switch. Next to it, a theme picker and a mobile preset (bottom navigation on phones) change the design for your session; the language button in the top bar switches language, including Arabic in right to left.

## What to look at

- **Dashboard**: a filter form driving lazy stat, chart and table widgets, and a database notification you can send yourself.
- **Catalog**: products with variants, images and a scent pyramid; categories as a tree; brands, tags and review moderation.
- **Sales**: a four-step order wizard, order sub-pages for items, payments and shipments, refunds behind password confirmation, printable invoices, imports and exports.
- **Reports**: a cluster with sales, inventory and customer reports.
- **Settings**: store settings, staff with roles and impersonation, billing and tenant registration.
- **Showcase**: one page per feature area (fields, layouts, actions, tables, theming, performance, accessibility, AI agents).

## Hourly reset

Everything you change is temporary. `php artisan demo:reset` rebuilds the database from the seeders and empties the upload disk every hour, on the hour; the sidebar shows the minutes left. Uploads are limited to 4 MB a file and throttled, mail is written to the log instead of being sent, and imports, exports and the storefront forms are rate limited.

## Running it locally

The demo lives in the `demo/` directory of the [AlfaKit repository](https://github.com/alfasixbh/alfakit):

```bash
pnpm install && pnpm build          # repository root: core, then the renderers
cd demo
composer install
cp .env.example .env && php artisan key:generate
php artisan storage:link
php artisan demo:reset
pnpm --filter @alfakit/demo build
php artisan serve
```

`demo/DEPLOY.md` covers server-side rendering, the scheduler and the production environment.
