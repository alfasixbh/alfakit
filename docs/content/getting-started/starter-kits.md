---
title: Inside a starter kit
description: Run AlfaKit inside an app made from Laravel's React, Vue or Svelte starter kit, with its login, layout, sidebar and theme.
---

# Inside a starter kit

Laravel's [starter kits](https://laravel.com/docs/starter-kits) (`laravel new my-app --react`, `--vue` or `--svelte`) give you Inertia, shadcn components, Fortify authentication, an app layout with a sidebar, settings pages and light/dark appearance. **Starter kit mode** runs an AlfaKit panel _inside_ that app instead of next to it:

- users sign in with the app's own login page (Fortify, the `web` guard); AlfaKit's login, registration, password reset and profile pages are off;
- AlfaKit pages render inside the app's `AppLayout`, with its sidebar, header and breadcrumbs;
- the panel's resources and pages (groups, icons, badges, active state) are listed in the app sidebar, on the app's own pages too;
- AlfaKit's command palette and global search, its notifications bell, (for tenancy panels) its tenant switcher and (with the AI plugin) the AI copilot drop into the app header, on every page;
- the panel's widgets show on the app's own dashboard (`/dashboard`);
- the app's shadcn theme tokens and its appearance setting (light, dark, system) apply to AlfaKit pages. AlfaKit sets no theme attributes, fonts, favicon or colour scheme on the document.

## Install

In an app made from a starter kit:

```bash
composer require alfasix/alfakit
php artisan alfakit:install --starter-kit
php artisan migrate   # the notifications table for the bell
npm run build         # or npm run dev
```

`alfakit:setup` picks this mode on its own when it finds a starter kit. The installer finds the kit from its files, prints what it changed, and does nothing on a second run:

| File                                                                                                 | Change                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resources/js/pages/Alfakit/Page.tsx` (`.vue`, `.svelte`)                                            | The `Alfakit/Page` Inertia page, rendered in your `AppLayout`                                                                                                                 |
| `resources/js/components/alfakit-nav.tsx` (`AlfakitNav.vue`, `AlfakitNav.svelte`)                    | The panel navigation, built from your own `@/components/ui/sidebar` primitives                                                                                                |
| `resources/js/components/app-sidebar.tsx` (`AppSidebar.vue`, `.svelte`)                              | `<AlfakitNav />` after `<NavMain />`, in a block marked `alfakit:nav`                                                                                                         |
| `resources/js/components/alfakit-user-menu-items.tsx` (`AlfakitUserMenuItems.vue`, `.svelte`)        | The panel's user menu entries (`userMenuItems()`, plugin entries such as Billing's), built from your own `@/components/ui/dropdown-menu` items                                |
| `resources/js/components/user-menu-content.tsx` (`UserMenuContent.vue`, `.svelte`)                   | `<AlfakitUserMenuItems />` before the separator above **Log out**, in a block marked `alfakit:user-menu`                                                                      |
| `resources/js/components/app-sidebar-header.tsx`, `app-header.tsx` (`AppSidebarHeader`, `AppHeader`) | `<AlfakitSearch />`, `<AlfakitNotifications />`, `<AlfakitCopilot />` and `<AlfakitLanguageSwitcher />` in the header of both app layouts, in a block marked `alfakit:header` |
| `resources/js/pages/dashboard.tsx` (`Dashboard.vue`, `Dashboard.svelte`)                             | The row of placeholder boxes wrapped in `<AlfakitWidgets>`, in a block marked `alfakit:widgets`                                                                               |
| `resources/css/app.css`                                                                              | `@import '@alfakit/<kit>/standalone.css'` and the `@source` of the renderer's components                                                                                      |
| `app/Providers/Alfakit/AdminPanelProvider.php`                                                       | A panel with `->starterKit()` at `/admin` (`--panel=` and `--path=` change it), registered in `bootstrap/providers.php`                                                       |

Your entry file (`resources/js/app.tsx` or `app.ts`) needs no change. Inertia's Vite plugin resolves pages from `resources/js/pages`, and the root view preloads `resources/js/pages/{component}`, so AlfaKit's page is a page file like your own. Page resolution, code splitting and SSR work the same for both. (SSR is on whenever `config/inertia.php` says so; some starter kits hard-code `'enabled' => true`, so `INERTIA_SSR_ENABLED` has no effect until you change it to `(bool) env('INERTIA_SSR_ENABLED', true)`, see [SSR](../advanced/ssr).) Pass `--no-npm` to install `@alfakit/react`, `@alfakit/vue` or `@alfakit/svelte` yourself, `--no-header-widgets` to leave your headers alone, `--no-dashboard-widgets` to leave your dashboard alone, and `--force` to rewrite the generated files.

Then sign in (or register) with the app's own pages, create a resource and open it from the sidebar:

```bash
php artisan make:alfakit-resource Post --generate
```

The resource needs an Eloquent model and its table: a new app has only `User`, so create `Post` first (`php artisan make:model Post --migration`, then migrate), or follow the [Quick start](quick-start), which builds one. Until the panel has a resource or page, `/admin` sends you to `/dashboard` and the sidebar shows no panel links.

## The panel

```php
use AlfaSix\Alfakit\Panel;

public function panel(Panel $panel): Panel
{
    return $panel
        ->default()
        ->id('admin')
        ->path('admin')
        ->starterKit()
        ->discoverResources(in: app_path('Alfakit/Resources'), for: 'App\\Alfakit\\Resources')
        ->discoverPages(in: app_path('Alfakit/Pages'), for: 'App\\Alfakit\\Pages')
        ->discoverWidgets(in: app_path('Alfakit/Widgets'), for: 'App\\Alfakit\\Widgets')
        ->middleware(['web'])
        // Like the starter kit's dashboard: signed in with a verified email address.
        ->authMiddleware(['verified'])
        // The bell of <AlfakitNotifications /> (export links, mentions, approvals).
        ->databaseNotifications();
}
```

`starterKit(bool $condition = true, string $rootView = 'app', string $loginRoute = 'login')`:

- renders through the app's Inertia root view (`resources/views/app.blade.php`) instead of `alfakit::app`, so its fonts, appearance script and Vite entry load;
- sends guests to the `login` route (Fortify's) and turns AlfaKit's own auth pages off. Call `->login()` or `->profile()` after `starterKit()` to bring one back; AlfaKit's sign-in and other `auth`-layout pages (multi-factor challenge, password reset) then render on their own, without your `AppLayout`;
- shares the navigation with every Inertia page as the `alfakitNavigation` prop, with what the header components need before they load (`widgets`). It is null for guests and for users who may not open the panel. On tenancy panels the navigation groups are empty outside a tenant (their links point to tenant routes);
- shares the panel's widgets with the app's dashboard as the `alfakitWidgets` prop (see [Widgets on your dashboard](#widgets-on-your-dashboard));
- ignores `->multiFactorAuthentication()` while the app signs users in (see [Two-factor authentication](#two-factor-authentication)).

`->embedded()` is an alias. Every other panel option works as usual. In production your `User` model must implement `AlfaSix\Alfakit\Contracts\CanAccessPanel`, as for any panel.

## The page file

The generated page passes your layout to AlfaKit. `discover` auto-registers the [custom components](../adapters/custom-components) in `resources/js/alfakit/{fields,columns,entries,widgets,pages,components,blocks}` (what `make:alfakit-field`, `make:alfakit-column` and the other generators write), as `createAlfakit({ discover })` does in panel mode; register anything else here, as you would with `createAlfakit()`:

```tsx
// resources/js/pages/Alfakit/Page.tsx
import { createStarterKitPage } from '@alfakit/react'
import AppLayout from '@/layouts/app-layout'
import { MapPicker } from '@/components/map-picker'

export default createStarterKitPage({
    layout: AppLayout,
    discover: import.meta.glob(
        '../../alfakit/{fields,columns,entries,widgets,pages,components,blocks}/**/*.tsx',
    ),
    components: { 'map-picker': MapPicker },
})
```

```vue
<!-- resources/js/pages/Alfakit/Page.vue -->
<script lang="ts">
import { createStarterKitPage } from '@alfakit/vue'
import AppLayout from '@/layouts/AppLayout.vue'

export default createStarterKitPage({
    layout: AppLayout,
    discover: import.meta.glob(
        '../../alfakit/{fields,columns,entries,widgets,pages,components,blocks}/**/*.vue',
    ),
})
</script>
```

```svelte
<!-- resources/js/pages/Alfakit/Page.svelte -->
<script module lang="ts">
    import { createStarterKitLayout } from '@alfakit/svelte'
    import AppLayout from '@/layouts/AppLayout.svelte'

    export const layout = createStarterKitLayout({
        layout: AppLayout,
        discover: import.meta.glob(
            '../../alfakit/{fields,columns,entries,widgets,pages,components,blocks}/**/*.svelte',
        ),
    })
</script>

<script lang="ts">
    import { AlfakitPage } from '@alfakit/svelte'
</script>

<AlfakitPage />
```

`layout` gets the page's breadcrumbs in the starter kit's shape (`{ title, href }[]`). It can be any component that takes `breadcrumbs` and children, for example `AppHeaderLayout` for the header variant, or `null` for no layout. Inside it, AlfaKit renders its content area (registry key `layout:app`, element `data-slot="content"` with `data-alfakit-embedded`) and its modals and toasts. Replace the content area with `components: { 'layout:app': MyContent }`. The options also take `pages`, `chartFormatters`, `chartPlugins` and `richEditorExtensions`. Pages written before `discover` was added: add the `discover` line yourself (the generators print it until you do).

## Customising the sidebar

The generated `alfakit-nav` component is yours to edit. It reads the navigation with `useAlfakitNavigation()`:

```tsx
import { Icon, useAlfakitNavigation } from '@alfakit/react'

const { groups, navigation } = useAlfakitNavigation() // or useAlfakitNavigation('admin')
// groups: [{ key, label, icon, items: [{ key, title, href, icon, isActive, badge, badgeColor, badgeTooltip, openInNewTab, children }] }]
// navigation: { id, url, brandName, groups, userMenu } as the server shared it, or null for guests
const { userMenuItems } = useAlfakitNavigation()
// userMenuItems: [{ key, title, href, icon, openInNewTab, method, group, startsGroup }]
```

In Vue, `useAlfakitNavigation()` returns a computed ref (`navigation.value.groups`). In Svelte it returns an object whose `groups` and `navigation` getters follow the current page. Icons are AlfaKit icon names: render them with `<Icon name={item.icon} />` from the renderer package. Labels come translated and as plain text (HTML labels have their markup removed). To place the panel links elsewhere, move `<AlfakitNav />` (or call the hook) anywhere in your layout. To add them to `NavMain`'s list instead, map `groups[].items` to your `NavItem` type.

## The user menu

The panel's own user menu entries, `userMenuItems()` and those plugins add (Billing's **Billing**), show in your app's user menu: the generated `alfakit-user-menu-items` component (`AlfakitUserMenuItems.vue`, `.svelte`) renders `userMenuItems` from `useAlfakitNavigation()` with your own `DropdownMenuItem`s, and the installer puts `<AlfakitUserMenuItems />` before **Log out**. It renders nothing while the panel has no entries. Only links are shared (`url()`, `postToUrl()`, `openUrlInNewTab()`); entries with `action()` or a modal need an AlfaKit page and are left out, as are the built-in profile and logout entries (your app has its own). Tenancy panels share them only inside a tenant. The component is yours to edit like `alfakit-nav`.

## Search, notifications and tenants in the header

Five components put AlfaKit's own chrome in your header. Each one works on every page of the app (the dashboard and settings pages too), renders nothing for guests and for panels without the feature, and costs almost nothing until it is used: it renders a lightweight button from the shared prop at once (also during SSR), then loads its code and the panel data (translations, endpoints, the palette's options) once in the browser.

```tsx
// resources/js/components/app-sidebar-header.tsx
import {
    AlfakitCopilot,
    AlfakitLanguageSwitcher,
    AlfakitNotifications,
    AlfakitSearch,
    AlfakitTenantSwitcher,
} from '@alfakit/react'

;<div className="ms-auto flex items-center gap-2">
    <AlfakitTenantSwitcher />
    <AlfakitSearch />
    <AlfakitNotifications />
    <AlfakitCopilot />
    <AlfakitLanguageSwitcher />
</div>
```

Vue and Svelte import the same names from `@alfakit/vue` and `@alfakit/svelte`. Each takes an optional `panel` prop (a panel id) when the app has more than one `starterKit()` panel; without it, a component follows the panel of the open AlfaKit page, else the first panel that has what it shows (search, notifications, tenancy, the copilot, languages). The installer adds search, notifications, the copilot and the language switcher; `alfakit:add teams` adds `<AlfakitTenantSwitcher />`.

| Component                     | Needs                                                         | What it does                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<AlfakitSearch />`           | `->globalSearch()` or panel commands (the palette)            | The search field and the command palette: global search results, the panel navigation, "create" links and recent records. `globalSearchKeyBindings()` (⌘K / Ctrl+K) open it from anywhere, also before its code loaded; they are bound once however many fields the page has.                                                                                                                                                             |
| `<AlfakitNotifications />`    | `->databaseNotifications()`                                   | The bell with the unread count, the notifications menu, polling and, on your own pages, realtime notifications (`->realtimeNotifications()`). Actions with `->openDatabaseNotifications()` open it.                                                                                                                                                                                                                                       |
| `<AlfakitTenantSwitcher />`   | `->tenant()`                                                  | Inside a tenant, the panel's tenant menu. On your own pages, a menu of the user's tenants (and "New" with tenant registration).                                                                                                                                                                                                                                                                                                           |
| `<AlfakitCopilot />`          | the [AI plugin](../plugins/ai#copilot) with `->copilot()`     | The copilot's sparkle button and chat slide-over, as in the panel's top bar. `copilotKeyBindings()` (`mod+j`) open it from anywhere, also before its code loaded. Not shown to users `authorize()` refuses, nor (tenancy panels) outside a tenant. Without a provider key it answers "AI isn't set up yet".                                                                                                                               |
| `<AlfakitLanguageSwitcher />` | two or more `->locales()` (and not `->localeSwitcher(false)`) | A languages button with the current language in its own name, and a menu of the panel's languages. Picking one switches the panel's language as the panel's own switcher does (session, cookie, `persistLocaleUsing()`) and reloads the page: AlfaKit's pages and the header components show it, your own pages keep the app's language. `languageSwitcher()` positions do not apply: the component is the switcher, wherever you put it. |

While an admin impersonates a user, the first of these components on the page also shows the impersonation banner with **Leave** on your own pages (AlfaKit's pages show their own).

The palette in the header leaves out what needs an AlfaKit page around it or AlfaKit's own chrome: panel commands and page header actions (run them from the page), theme switching (your appearance setting owns the colour scheme) and the keyboard shortcuts overlay; **Install app** (`pwa()`) is offered on AlfaKit's pages only. On tenancy panels search is tenant-scoped, so `<AlfakitSearch />` renders inside a tenant only. If your app binds ⌘K itself, an earlier listener that calls `event.preventDefault()` wins; otherwise remove one of the two bindings (`globalSearchKeyBindings()`). The components emit `data-slot="starter-kit-search"`, `starter-kit-notifications`, `starter-kit-tenant-switcher`, `starter-kit-copilot` and `starter-kit-language-switcher` wrappers for styling.

The data comes from the panel's `/{path}/_alfakit/starter-kit` endpoint (signed-in users only, `Cache-Control: no-store`), requested once per full page load. The installer adds the search field, the bell, the copilot (which renders nothing until the AI plugin's copilot is on) and the language switcher (which renders nothing until the panel has two or more languages) to both header components of the kit (the sidebar layout's `app-sidebar-header` and the header layout's `app-header`, before the user menu). Headers set up before `<AlfakitCopilot />` existed get it from `php artisan alfakit:add ai`. Headers set up before `<AlfakitLanguageSwitcher />` existed get it when you run the installer again: `php artisan alfakit:install --starter-kit --no-npm` (pass the `--panel` and `--path` you installed with, so it does not create a second panel), which only adds what is missing and reports the rest as unchanged; `alfakit:upgrade` reminds you while a header lacks it. Otherwise add the one line yourself next to `<AlfakitNotifications />`. Rebuild your frontend afterwards. The header layout of the kits also has a placeholder search button you can remove.

## Widgets on your dashboard

A starter kit panel has no dashboard page of its own: your app has one (`/dashboard`). The panel's widgets show there instead. Make one and open `/dashboard`:

```bash
php artisan make:alfakit-widget BlogStats --type=stats
```

```php
// app/Alfakit/Widgets/BlogStats.php
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget\Stat;
use App\Models\User;

class BlogStats extends StatsOverviewWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('Users', User::count()),
        ];
    }
}
```

Nothing else needs registering: the generated panel provider discovers `app/Alfakit/Widgets` (`->discoverWidgets()`), and `->widgets([...])` adds more. The installer wrapped the kit's row of placeholder boxes in `<AlfakitWidgets>`:

```tsx
// resources/js/pages/dashboard.tsx
import { AlfakitWidgets } from '@alfakit/react'

;<div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
    <AlfakitWidgets>{/* the kit's three placeholder boxes */}</AlfakitWidgets>
    {/* the kit's large placeholder box */}
</div>
```

```vue
<!-- resources/js/pages/Dashboard.vue -->
<script setup lang="ts">
import { AlfakitWidgets } from '@alfakit/vue'
</script>

<template>
    <AlfakitWidgets>
        <!-- the kit's three placeholder boxes -->
    </AlfakitWidgets>
</template>
```

```svelte
<!-- resources/js/pages/Dashboard.svelte -->
<script lang="ts">
    import { AlfakitWidgets } from '@alfakit/svelte'
</script>

<AlfakitWidgets>
    <!-- the kit's three placeholder boxes -->
</AlfakitWidgets>
```

The widgets take the place of the placeholder row, in the panel's widget grid (two columns from `lg`), with your app's theme. Its children (the boxes) render while there are no widgets to show: the panel has none, the user is a guest or may not open the panel. Without children it renders nothing then. Replace the large box below with your own content, or delete the children once you have widgets.

- **Which widgets**: the panel's (`widgets()`, `discoverWidgets()`), each filtered by its `canView()`, ordered by `$sort` and sized by `$columnSpan`, as on a panel dashboard. If you register a `Dashboard` page in the panel, its `getWidgets()` and `getColumns()` are used instead.
- **Which pages**: the prop is built only on the routes of `->starterKitDashboard()`, by name or pattern (`'dashboard'` by default, `['dashboard', 'teams.*']`), and is null everywhere else, so other pages pay nothing. `->starterKitDashboard(false)` turns it off.
- **Loading**: the component's code loads in the browser; the server render (SSR) and hydration show placeholder boxes. Lazy widgets (the default) and `poll()` are fetched from the panel's `/{path}/_alfakit/standalone/components` endpoint by context token, which re-checks the user, `canAccessPanel()` and the panel's `authMiddleware()` (`verified`) on every request. Table widget actions run through the panel's own endpoints.
- **Props**: `panel` (a panel id, when the app has more than one `starterKit()` panel), `components` (the frontend components of custom widgets, as for [`<AlfakitComponent>`](../standalone/overview); the `components` of `createStarterKitPage()` only apply to AlfaKit pages) and `className` (`class` in Vue and Svelte) on the widget grid's wrapper. It emits `data-slot="starter-kit-widgets"` (and `starter-kit-widgets-placeholder` while loading).

`make:alfakit-widget` prints where a starter kit panel's widget appears. To put widgets on another page of your app, add `<AlfakitWidgets />` to it and list its route in `starterKitDashboard()`, or build your own [standalone widgets](../standalone/widgets-and-notifications).

## Two-factor authentication

Sign-in, and so its second factor, is the app's: use the starter kit's two-factor settings (Fortify, on its `settings/security` page with passkeys), which protect every page including AlfaKit's. AlfaKit's own multi-factor authentication belongs to its login and profile pages, which are off in starter kit mode, so `->multiFactorAuthentication()` is ignored there (`hasMultiFactorAuthentication()` is false and its `isRequired` redirect never runs). The two never conflict: Fortify keeps its `two_factor_*` columns, AlfaKit's providers theirs. Bring AlfaKit's back only together with its own login (`->starterKit()->login()->profile()->multiFactorAuthentication([...])`). To require two-factor authentication for the panel, add a middleware to `->authMiddleware()` that checks Fortify's `two_factor_confirmed_at` and redirects to `security.edit`.

## Styles and theme

`standalone.css` adds only what shadcn has no token for: the `success`, `warning` and `info` status colours (from `->colors()` when set) and the grid and rich text rules AlfaKit components need. Your `--primary`, `--background`, `--sidebar`, `--radius` and dark tokens are used as they are. Don't import `@alfakit/<kit>/styles.css` or `themes.css` in starter kit mode: they define a full panel palette. Panel themes (`->theme()`) and design options (`->design()`) do not apply.

## Limitations

- AlfaKit's own chrome is not rendered: no AlfaKit sidebar, top bar or user menu. Your app layout owns those, and takes AlfaKit's search, bell, tenant switcher, AI copilot and language switcher as [header components](#search-notifications-and-tenants-in-the-header). Other content you put in the panel's top bar slots (`Slot::TOPBAR_*`) is not shown. Flashed and realtime notifications still show as toasts on AlfaKit pages.
- The appearance switcher is the app's (`settings/appearance`). `->darkMode()` and `->defaultThemeMode()` do not apply.
- The [users resource](../resources/users) signs suspended and banned users out of your own pages too: `alfakit:users` adds its `EnsureAccountIsActive` middleware to the `web` group in `bootstrap/app.php`, and your login page shows the reason (session `status`).
- Languages: the panel's `locales()` apply to AlfaKit's pages, the header components and what the panel shares with your pages (the sidebar navigation, the dashboard widgets); your own pages keep the app's language. Users pick the language with [`<AlfakitLanguageSwitcher />`](#search-notifications-and-tenants-in-the-header) in your header (the panel's own switcher lives in its top bar and user menu, which starter kits replace). In a right-to-left language AlfaKit mirrors its own content (`data-slot="starter-kit-root"` with `dir` and `lang`, its modals and menus) and leaves `<html dir>` to your app, whose sidebar is not built to mirror.
- Pages with the `auth` layout (multi-factor challenge, email verification prompt) are not used: authentication and its settings are the app's (Fortify). Email change verification needs AlfaKit's profile page, so leave it off.
- Tenancy panels work, but the shared navigation is empty outside a tenant, and their widgets (tenant-scoped) are not shown on the app's dashboard. `<AlfakitTenantSwitcher />` links to the user's tenants from any page.
- One `alfakitNavigation` entry is shared per `starterKit()` panel. Without a panel id, `useAlfakitNavigation()` and the header components follow the panel of the open AlfaKit page and use the first panel on your own pages (`<AlfakitTenantSwitcher />`: the first panel with tenancy). Pass a panel id to pin them. For a team workspace next to `/admin`, see [Teams in a starter kit app](../plugins/teams#in-a-starter-kit-app): `alfakit:add teams` adds `<AlfakitTenantSwitcher />` to the header block.
- `alfakit:install --starter-kit` recognises the files of the official kits. If your sidebar no longer has a `<NavMain … />` element, the step is skipped and reported: add `<AlfakitNav />` yourself. A user menu without the separator above its `logout-button` item is skipped the same way: add `<AlfakitUserMenuItems />` yourself. The same goes for a dashboard page without the kit's row of placeholder boxes: add `<AlfakitWidgets />` where the widgets should go.
