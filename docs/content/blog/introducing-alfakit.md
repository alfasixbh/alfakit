---
title: Introducing AlfaKit
description: An admin panel builder for Laravel that you write in PHP and render with React, Vue or Svelte. What it is, why it has three renderers, what the first release contains and how to try it.
date: '2026-10-12'
author: Alfa Six
cover: /screenshots/dashboard-light.webp
coverAlt: The dashboard of the AlfaKit demo with revenue, orders and customer stats and a revenue chart.
---

AlfaKit is an admin panel builder for Laravel 13. You describe panels, resources, forms, tables, actions, infolists and widgets with a fluent PHP API, and AlfaKit renders them through Inertia with shadcn components in React, Vue or Svelte. It is built by [Alfa Six](https://alfasixbh.com) and released under the MIT licence.

If you have used Filament, the PHP side will look familiar on purpose: `Resource`, `Panel`, `TextInput::make('title')->required()`, `TextColumn::make('status')->badge()`, `EditAction::make()`. The difference is what happens after `toSchema()`.

## How it works

Every component serialises itself into a plain array, the schema. A page sends that schema to the browser as Inertia props, and the renderer for your framework maps each schema `type` to a component through a registry. When a user submits a form, runs an action, searches a select or changes a `live()` field, the renderer calls a small internal endpoint (`/_alfakit/*`). The server rebuilds the same PHP objects, validates, authorises and responds.

So validation, authorisation and queries live in one place, your PHP code. The JavaScript only draws what the schema describes.

## Why three renderers

The Laravel starter kits come in React, Vue and Svelte flavours, and many teams have standardised on one of them. Those teams want their admin panel to share the stack of the rest of the application: the same components, the same theme, the same build pipeline and the same developers.

AlfaKit keeps the definition of a panel in PHP and leaves the rendering to the framework you already use. The three renderers (`@alfakit/react`, `@alfakit/vue` and `@alfakit/svelte`) implement the same schema contract, emit the same CSS hooks and share one theme stylesheet, so the same PHP resource looks and behaves the same in each.

## What the first release contains

The [changelog](/changelog) lists everything, release by release. In short:

- **Panels and resources**: multiple panels, authentication with multi-factor authentication, navigation groups and clusters, global search, list, create, edit and view pages, relation managers, nested and singular resources, policies on every action, impersonation.
- **Forms**: text, select, repeater, builder, rich and Markdown editors, file uploads, sliders, toggle buttons, a code editor, modal table selects and more; sections, tabs and wizards; `live()` fields that re-run your closures on the server and send back only the components that changed.
- **Tables**: sorting, searching, filters (including a query builder), summaries, grouping, bulk actions, inline editing, reordering, column layouts and card grids, and virtualised rows for long lists.
- **Actions**: modals, slide-overs, wizards, confirmation, rate limits, and imports and exports to CSV and XLSX.
- **Dashboards**: stats, Chart.js charts, table widgets, filters shared by widgets and lazy loading.
- **Multi-tenancy**: tenant switching, subdomain and custom-domain tenancy, a billing hook and the `alfakit:tenancy:check` audit.
- **Localization**: any number of languages with a language menu, full right-to-left layouts, every currency and per-user timezones, plus a translations package with twelve languages.
- **Design**: six themes that change structure as well as colour (`neutral`, `alfakit`, `minimal`, `soft`, `corporate`, `filament`), a sidebar, top navigation or icon-rail layout, a mobile preset with bottom navigation, and more than 100 slots.
- **Outside panels**: forms, tables, infolists and widgets in your own Inertia pages through standalone components.
- **Tooling**: generators for every piece, server-side rendering, a debug panel, test helpers, a migration command for Filament apps, and guidelines and skills for AI coding agents.

## Try the demo

The [live demo](/demo) is "Maison Alfa", a perfume shop admin. It runs three panels with the same PHP configuration, one per renderer, plus a storefront that uses standalone components. Sign in with `demo@alfakit.dev` and `password`; the data resets every hour. The switcher in the top bar opens the page you are on in React, Vue or Svelte.

## Get started

```bash
composer require alfasix/alfakit
php artisan alfakit:install
```

The [installation guide](/docs/getting-started/installation) covers the details, and the [quick start](/docs/getting-started/quick-start) builds a first resource. Questions, bug reports and pull requests are welcome on [GitHub](https://github.com/alfasixbh/alfakit).
