# Maison Alfa — the AlfaKit demo

<p><picture><source media="(prefers-color-scheme: dark)" srcset="public/brand/alfasix/alfa-six-micro-white.svg"><img src="public/brand/alfasix/alfa-six-micro-navy.svg" alt="" width="24" height="18" align="top"></picture> <sub>by <a href="https://alfasixbh.com">Alfa Six</a></sub></p>

One Laravel 13 application, one SQLite database, **three admin panels that are configured identically** and differ only by renderer: React at `/react/admin`, Vue at `/vue/admin`, Svelte at `/svelte/admin`. A storefront per renderer lives at `/react`, `/vue` and `/svelte`. Herd serves it at http://alfakit-demo.localhost.

Sign in with `demo@alfakit.dev` / `password` (shown on the login page). `php artisan demo:reset` re-seeds everything and runs hourly.

The demo is an Alfa Six property, so it shows the Alfa Six credits: the panels' "Developed by Alfa Six" footer (sign-in pages included), the same line on the storefront, and the opt-in "Powered by AlfaKit · Alfa Six" line on the plugin pages customers see (CMS pages, forms, helpdesk portal and chat, shared dashboards, invoice links) and in emails, turned on in `config/alfakit.php` (`credit`). Apps built with AlfaKit keep that line off unless they opt in.

## Conventions for contributors (and agents)

### Where things go

| What                  | Path                                                        | Notes                                                                                                                      |
| --------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Resources             | `app/Alfakit/Resources/{Name}Resource.php` (+ `/Pages`)     | Discovered on all three panels (`App\Alfakit\Resources`).                                                                  |
| Custom pages          | `app/Alfakit/Pages/`                                        | Discovered (`App\Alfakit\Pages`).                                                                                          |
| Widgets               | `app/Alfakit/Widgets/`                                      | Discovered (`App\Alfakit\Widgets`); register on a dashboard with `getWidgets()` or on the panel.                           |
| Clusters              | `app/Alfakit/Clusters/`                                     | Discovered (`App\Alfakit\Clusters`).                                                                                       |
| Standalone components | `app/Alfakit/Standalone/`                                   | Forms/tables for the storefront (`AlfaSix\Alfakit\Standalone\*`), rendered with `<AlfakitComponent>` in each renderer.     |
| Models / enums        | `app/Models/`, `app/Enums/`                                 | Enums expose `getLabel()`, `getColor()`, `getIcon()` and `options()`; labels come from `lang/*/demo.php`.                  |
| Shared panel config   | `app/Demo/DemoPanel.php`                                    | **Shared file.** Only panel-wide options; edit with small targeted replacements, never rewrite.                            |
| Panel providers       | `app/Providers/Alfakit/{React,Vue,Svelte}PanelProvider.php` | Each calls `DemoPanel::configure($panel, $renderer)`. Don't touch.                                                         |
| Demo helpers          | `app/Demo/`                                                 | `Nav` (navigation groups), `Renderer` (switcher URLs), `Catalog` (curated seed vocabulary), `ProductArtwork` (SVG images). |
| Seeders               | `database/seeders/`                                         | Add your class to `$seeders` in `DatabaseSeeder` (**shared file**, append one line). `DemoSeeder` runs first.              |
| Factories             | `database/factories/`                                       | Store, User, Brand, Category, Tag, Product, Customer, Order, Review exist.                                                 |
| Migrations            | `database/migrations/`                                      | New tables: new files, never edit existing ones.                                                                           |
| Translations          | `lang/en/demo.php`, `lang/ar/demo.php`                      | Every string AlfaKit renders. Keep both files in sync (`TranslationParityTest`).                                           |
| Slot views            | `resources/views/demo/slots/`                               | Blade rendered into `Panel::slot(...)`.                                                                                    |
| Storefront routes     | `routes/web.php`                                            | **Shared file.** Add routes inside the `foreach (Renderer::ALL …)` group.                                                  |
| Storefront pages      | `resources/js/{react,vue,svelte}/storefront/`               | Register in `resources/js/{renderer}/app.*` under the same `Storefront/*` name in all three entries.                       |
| Shared frontend types | `resources/js/shared/`                                      | Framework-agnostic TypeScript (props, formatting helpers).                                                                 |
| Tests                 | `tests/Feature`, `tests/Unit`, `tests/Console`              | Feature tests use `RefreshDatabase`; Console tests don't (they run `migrate:fresh` themselves).                            |

### Registering

Nothing to register: resources, pages, widgets and clusters are **discovered** from `app/Alfakit/*` for all three panels. Dashboard widgets: create a `Dashboard` subclass in `app/Alfakit/Pages` or register widgets in `DemoPanel` (`->widgets([...])`, one line).

### Navigation groups

Groups are translated, so reference them through `App\Demo\Nav`:

```php
public static function getNavigationGroup(): ?string
{
    return Nav::group(Nav::CATALOG); // SALES, CUSTOMERS, MARKETING, REPORTS, SETTINGS, SHOWCASE
}
```

Adding a group: a constant + icon in `Nav`, a key in both `lang/*/demo.php` (`navigation.*`), and the constant in `DemoPanel::navigationGroups()`.

### Tenancy

- Tenant model: `App\Models\Store` (slug in the URL: `/react/admin/{store}/...`). Ownership relationship: `store` (`store_id`).
- Models with `store_id` are scoped automatically. Reference data shared by all stores is marked `#[SharedAcrossTenants]` (`Brand`, `Category`, `Tag`).
- Models reached through another model (e.g. `Review` → `product.store`) need `protected static ?string $tenantOwnershipRelationshipName` or a `modifyQueryUsing` on the resource.
- `alfakit()->getTenant()` returns the current `Store`. Seed data per store; the demo user belongs to all three stores.

### Roles

`store_user.role` holds `App\Enums\StaffRole` (`owner` > `manager` > `staff`). On `User`:

```php
$user->roleIn($store);            // StaffRole|null (current tenant by default)
$user->hasStaffRole('manager');        // manager or above in the current store (is_admin always true)
$user->isOwner(); $user->isManager();
```

Use them in resource `can*` methods or policies. `demo@alfakit.dev` is `is_admin` and owner of Manama.

On top of the ladder, **Shield** (alfasix/alfakit-shield, spatie/laravel-permission with teams = stores) gives every member a role per store: `owner`, `manager`, `support_agent` or `viewer` (`App\Demo\Access`, seeded by `DemoPluginsSeeder`). Spatie's `$user->hasRole('owner')` reads them in the current store; the plugins are gated with them (Ops, Health, Backups, Webhooks, Feature flags, Translations: owners; Analytics, Invoices, Forms, CMS publishing: managers; Helpdesk: support agents and up). `demo@alfakit.dev` is `owner` in every store, so it sees everything. The catalogue and sales policies keep using the ladder above.

### Uploads

`FileUpload`/`ImageColumn` use the `demo` disk (`storage/app/demo`, served from `/demo-files`); it is emptied by `demo:reset`. Product artwork is generated locally by `ProductArtwork::store()`, never remote URLs. Rate limiters `demo-uploads` and `demo-imports` are defined in `AppServiceProvider`.

### Storefront and Showcase

- Storefront pages: `Storefront/Home|Product|Contact|Track`, listed once per renderer in `resources/js/{renderer}/storefront/pages.ts` (shared by `app.*` and `resources/js/ssr.ts`, so they are server-rendered). Props and copy types live in `resources/js/shared/{storefront,shop}.ts`; the PHP side is `StorefrontPagesController` and `App\Demo\Shop` (the store the shop sells, memoised per request).
- Standalone components (`app/Alfakit/Standalone`): `ReviewForm` (product page), `ContactForm` (rate limited, mails through `log`), `NewsletterForm` (footer of every storefront page, shared prop `newsletter`), `CustomerOrdersTable` + `OrderTimeline` (order tracking). Strings in `lang/*/shop.php`.
- Showcase group (`app/Alfakit/Pages/Showcase`, strings in `lang/*/showcase.php`): one page per feature area, intro from `showcase.{key}.intro`. Custom frontend pieces: `demo-perf-readout` (View) and `demo-stock-meter` (ViewColumn) in `resources/js/{renderer}/components`, logic shared in `resources/js/shared/showcase.ts`. The dashboard tour banner is `App\Demo\Tour` (session flag `demo.tour_dismissed`, route `/demo/tour/dismiss`).

### First-party plugins

Every plugin of `packages/plugins` except Teams is registered on the three panels by `App\Demo\DemoPlugins` (called from `DemoPanel::configure()`), seeded per store by `DemoPluginsSeeder`, with strings in `lang/*/plugins.php`:

| Plugin                                            | Where                                                                                                                                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kanban                                            | Sales › Orders › **Board** (`/orders/board`, `OrderBoard`): status columns, allowed transitions, timeline entry per move                                                                                                              |
| Workflows                                         | Sales › **Returns** (`ReturnRequest`, `ReturnRequestResource`) and **Approvals**: submit → owner/manager approval → refund                                                                                                            |
| Invoices                                          | Sales › **Invoices** / **Tax rates**; "Issue invoice" on an order (`OrderResource\PluginActions`)                                                                                                                                     |
| Calendar                                          | Marketing › **Calendar** (`PromotionsCalendar`) and the dashboard's "This week" (`ThisWeekCalendar`): promotions (drag, resize, click, select to create), shipments, deliveries, scheduled CMS pages                                  |
| Helpdesk                                          | Support › Inbox, Tickets, Canned replies, Groups; storefront chat bubble and `/support` portal (`Storefront/Support`)                                                                                                                 |
| CMS                                               | Content › Pages, Menus…; storefront pages at `/{renderer}/pages/{path}` (`StorefrontPluginsController`, `Storefront/CmsPage`), editing bar and live preview                                                                           |
| Forms                                             | Marketing › Forms; `/{renderer}/wholesale` and `/forms/{slug}` (`Storefront/Wholesale`, `Storefront/Form`)                                                                                                                            |
| Analytics                                         | Marketing › Analytics (30 days seeded); `<AlfakitAnalytics>` in the three storefront layouts                                                                                                                                          |
| Comments, Activity log                            | Order timeline tab (comments with @mentions, audit trail); Settings › Activity log                                                                                                                                                    |
| Tags, Media library                               | Customer segments (`spatie_tags`, type `segment`); product **Lifestyle gallery** (Media tab)                                                                                                                                          |
| Tree                                              | Catalog › Categories › **Tree view** (`CategoryTree`); the category form uses the core `IconPicker`                                                                                                                                   |
| Feature flags                                     | Settings › Feature flags: `storefront-live-chat`, `wholesale-enquiries`, `new-checkout` (`app/Features`, per store)                                                                                                                   |
| Shield, Settings, Translations, Webhooks, API, AI | Settings group: Roles, House settings (`MaisonSettings`), Translations, Webhooks, API tokens / API reference, AI usage; `->aiAssist()` on product descriptions, "Summarise reviews" on products, `aiFilters()` on orders, the copilot |
| Billing                                           | Store menu › Billing (`/billing/plans` from the plugin, checkout disabled: `DemoPlansBillingProvider`)                                                                                                                                |
| Ops, Health, Backups                              | System group, owners only, read-only                                                                                                                                                                                                  |

Core features wired at the same time: customizable dashboards, saved views and spreadsheet editing on products, undoable deletes (products, orders), record history on products, command palette commands, `languageSwitcher('both')` with the 13 AlfaKit locales; the demo copy (lang/) and the storefront language menu cover all 13 too.

### Demo chrome

- Renderer switcher: `Slot::TOPBAR_END` + storefront header, built by `Renderer::links()` (swaps the first URL segment, keeps tenant prefix and query string).
- Theme picker and mobile preset: session flags `demo.theme` / `demo.mobile` set by `/demo/theme/{theme}` and `/demo/mobile/{on|off}` (`?back=` path).
- Login hint (`Slot::AUTH_BEFORE`), reset note (`Slot::SIDEBAR_FOOTER`).

### Public demo safeguards

- The shared account (`User::isDemoAccount()`) can't change its e-mail, password or second factors (`App\Alfakit\Auth\EditProfile`, wired with `->profile()`); it is also the only account that may impersonate (`User::canImpersonate()`).
- Uploads: 4 MB per file (`ALFAKIT_UPLOAD_MAX_KB`) and the `demo-uploads` limiter on every upload endpoint (`App\Http\Middleware\ThrottleDemoUploads`). Imports, exports and the storefront forms use `->rateLimit()`.
- `demo:reset` runs hourly inside maintenance mode (branded `resources/views/errors/503.blade.php`); the sidebar footer shows the minutes left. Branded error pages for 403/404/419/429/500/503 live in `resources/views/errors`.
- Head tags (description, icons, `og:image` = `public/brand/alfakit-social-card.png`) come from `resources/views/demo/partials/meta.blade.php`, included by the panel root view `resources/views/demo/panel.blade.php` and the storefront root view.
- Plugins: mail goes to the `log` mailer; webhook endpoints are read-only (`WebhookEndpointPolicy`) and deliveries go to the `demo-null` queue connection; Ops is read-only without logs or maintenance mode; backups can't be created, downloaded or deleted (`DemoBackups`); file sharing is off and file manager uploads are capped at 4 MB in a per-store root; translations are per store and never written to files; AI answers locally (`demoResponses()`, no provider key); checkout never calls a payment provider; helpdesk and forms uploads are capped at 4 MB. Everything is rebuilt by the hourly `demo:reset`, and `DemoPluginsSeeder` can also run again on a seeded database (it clears its own data first).
- Deployment (Node for SSR, cron, `storage:link`, environment): see [`DEPLOY.md`](DEPLOY.md).

## Commands

```bash
composer install && cp .env.example .env && php artisan key:generate
php artisan demo:reset              # migrate:fresh --seed + clear demo disk (DEMO_SEED_SCALE=0.1 for a small dataset)
php artisan test                    # Pest
vendor/bin/phpstan analyse          # level 6
vendor/bin/pint                     # format (demo only)

pnpm --filter @alfakit/demo build         # client assets (public/build)
pnpm --filter @alfakit/demo build:ssr     # + bootstrap/ssr/ssr.js
node bootstrap/ssr/ssr.js                 # one SSR server for all three renderers, port 13720 (INERTIA_SSR_ENABLED=true)
pnpm --filter @alfakit/demo types:check   # tsc; also: pnpm exec vue-tsc --noEmit, pnpm exec svelte-check
```

Build renderers first when you change `packages/*` (`pnpm build` at the repo root). Herd: `herd link alfakit-demo` inside `demo/`.
