---
title: Icons
description: Icon names, Heroicons, custom SVG and image icons, icon sets, Iconify sets, aliases for Alfakit's own icons, and swapping the icon set.
---

# Icons

Icons are named with [Lucide](https://lucide.dev/icons) names everywhere in PHP: `->icon('users')`, `$navigationIcon = 'file-text'`, `IconColumn::make('status')->icon('circle-check')`. The renderer loads each icon on demand, so every Lucide icon is available without importing it. Everything on this page works the same in admin panels, starter kit panels and [components outside panels](../standalone/overview).

Every icon value is resolved on the server by `Icons::resolve()`, which also understands Heroicons, image URLs, inline SVG and registered icon sets (below). Renderers receive one of three things: a Lucide name, an image URL (drawn as a decorative `<img>`) or sanitised `<svg>` markup (drawn inline, sized like any other icon).

## Heroicons

Code ported from Filament can keep its Heroicon names. `heroicon-o-*`, `heroicon-s-*`, `heroicon-m-*` and `heroicon-c-*` names, and the `Heroicon` enum with Filament's case names, map to the closest Lucide icon (all 324 Heroicons are covered; an unknown `heroicon-*` name shows `circle-help`):

```php
use AlfaSix\Alfakit\Support\Icons;
use AlfaSix\Alfakit\Support\Icons\Heroicon;

NavigationItem::make('Users')->icon('heroicon-o-users');        // → users
Icons::resolve(Heroicon::OutlinedCog6Tooth);                    // → settings
Heroicon::OutlinedUser->getIconName();                          // 'heroicon-o-user'
Heroicon::User->getLucideName();                                // 'user'
```

Pass a `Heroicon` case wherever a closure is accepted (`->icon(fn () => Heroicon::OutlinedUsers)`) or to `Icons::register()`. To draw the real Heroicons instead of their Lucide equivalents, register them as an icon set (`heroicon-o`, `heroicon-s`…), see below.

## Image and SVG icons

An icon can be an image URL or inline SVG:

```php
NavigationItem::make('Partners')->icon('https://cdn.example.com/partner.svg');
NavigationItem::make('Reports')->icon(asset('images/reports.svg'));
Action::make('brand')->icon(fn () => new HtmlString('<svg viewBox="0 0 24 24">…</svg>'));
```

URLs must be `http(s)://`, protocol-relative, root-relative (`/…`) or `data:image/…` (anything else, such as `javascript:`, is not treated as a URL). SVG markup is sanitised on the server before it reaches the browser: only drawing elements (`svg`, `g`, `path`, `circle`, `rect`, gradients, `use` with a `#fragment`…) and presentation attributes survive; scripts, event handlers, `foreignObject`, `<style>`, external references and `url()`s that leave the icon are removed. Markup that isn't an SVG document is dropped. Use `currentColor` in the SVG so the icon follows the text colour.

## Icon sets

Register a set of SVG icons under a prefix, like Blade Icons, and use `{prefix}-{name}` anywhere:

```php
use AlfaSix\Alfakit\Support\Icons;

public function boot(): void
{
    // A directory of {name}.svg files.
    Icons::registerSet('app', resource_path('svg'));                       // 'app-logo' → resources/svg/logo.svg

    // The real Heroicons from blade-ui-kit/blade-heroicons (o-user.svg, s-user.svg…).
    Icons::registerSet('heroicon-o', base_path('vendor/blade-ui-kit/blade-heroicons/resources/svg'));

    // Or a closure returning SVG markup, an Htmlable, an image URL, an .svg path or null.
    Icons::registerSet('brand', fn (string $name) => Brand::svg($name));
}
```

The longest matching prefix wins, a registered `heroicon-o` set wins over the Lucide mapping, and an icon the set doesn't have falls through to sets with shorter prefixes, then the usual resolution. Registering a prefix again replaces the earlier source (the last registration wins). Icon names may only contain letters, digits, dots, dashes and underscores, so a name can't reach outside the set's directory. Set icons are sanitised like any inline SVG.

## Iconify icon sets

Any of the [Iconify](https://icon-sets.iconify.design) sets (Material Design Icons, Tabler, Phosphor, Font Awesome, flags, brand logos…) can be used by name once its `@iconify-json/{set}` package is installed. Sets are opt-in, one at a time:

```bash
php artisan alfakit:icons mdi tabler      # installs @iconify-json/mdi and @iconify-json/tabler, registers them
php artisan alfakit:icons tabler --remove # uninstalls and unregisters
php artisan alfakit:icons mdi --no-install # only registers (the package is already installed)
php artisan alfakit:icons --search=home   # lists matching icons in Lucide and the registered sets
php artisan alfakit:icons                 # lists the registered sets
```

The command asks before it runs your package manager (npm, pnpm, yarn or bun, detected from the lock file) and adds the set to `icons.iconify` in `config/alfakit.php`, publishing the config first if needed. `--search` takes `--set=mdi` (repeatable) and `--limit=50`.

```php
NavigationItem::make('Home')->icon('mdi-home');
Action::make('star')->icon('tabler-star');
IconColumn::make('status')->icon(fn (string $state): string => "mdi-{$state}");
```

You can register sets yourself instead of (or as well as) the config:

```php
use AlfaSix\Alfakit\Support\Icons;

Icons::iconify(['mdi', 'tabler']);                                // node_modules/@iconify-json/{set}/icons.json
Icons::iconify('brand', resource_path('icons/brand.json'));       // any file in Iconify's JSON format
Icons::iconify(['mdi' => storage_path('icons/mdi.json')]);
```

```php
// config/alfakit.php
'icons' => [
    'iconify' => ['mdi', 'tabler', 'brand' => resource_path('icons/brand.json')],
    'iconify_path' => env('ALFAKIT_ICONIFY_PATH'),  // directory holding {set}/icons.json; default base_path('node_modules/@iconify-json')
    'cache' => null,                                // cache store; null = default store, false = no cache
],
```

Icons are turned into SVG on the server: aliases, each icon's width and height (or the set's), flips and rotations are applied like Iconify does, and the markup is sanitised like any inline SVG. Nothing is fetched from a CDN or the network at runtime, and nothing is read until an icon of the set is used. The JSON files can be megabytes, so each resolved icon (and the set's name list, used by the IconPicker) is kept in Laravel's cache under a key that includes the file's modification time: updating the package invalidates it, and a request that only draws cached icons never decodes the file.

Production servers need the JSON files at runtime. If you don't deploy `node_modules`, point `iconify_path` (or a per-set path) at a copy, for example `resources/icons/mdi/icons.json`.

### Name collisions

A set prefix can claim Lucide names: with a `flag` set registered, `flag-off` is looked up in that set first. The rules, in order:

1. `Icons::register()` aliases.
2. Registered sets, longest prefix first; a set without the icon lets the next matching set try. For one prefix, the last registration wins, so a set registered in your `AppServiceProvider` replaces one from the config.
3. `lucide-{name}` is the Lucide icon (`lucide-flag-off`), unless you registered a set under the `lucide` prefix (Iconify's `lucide` set draws the same icons).
4. Heroicon names (`heroicon-o-*`) map to Lucide.
5. Anything else is a Lucide name.

The IconPicker stores Lucide icons a registered prefix would claim with the `lucide-` prefix, so a picked icon always draws the same.

## Picking icons in forms

`IconPicker::make('icon')` lets users choose an icon from Lucide and the registered sets, searched on the server a page at a time. See [IconPicker](../forms/fields#iconpicker).

## Icon aliases

The icons Alfakit picks itself (built-in actions, notification statuses, empty states, callouts) are named by alias, and the server resolves each alias before the schema reaches the browser. Replace them in a service provider:

```php
use AlfaSix\Alfakit\Support\Icons;

public function boot(): void
{
    Icons::register([
        'alfakit::actions.delete' => 'trash',
        'alfakit::actions.edit' => 'square-pen',
        'alfakit::notifications.success' => 'party-popper',
    ]);
}
```

The catalogue follows Filament's icon aliases, with an `alfakit::` prefix: Filament's `panels::sidebar.collapse-button` is `alfakit::panels.sidebar.collapse-button`, and `Icons::register()` accepts either spelling (`'panels::sidebar.collapse-button' => 'arrow-left'`). Values can be anything an icon accepts: a Lucide name, a `Heroicon` case, a URL or `HtmlString` SVG. `Icons::DEFAULTS` lists every alias with its default.

| Alias                                                              | Default                                                 | Used by                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------- |
| `alfakit::actions.associate`                                       | `link`                                                  | `AssociateAction`                                        |
| `alfakit::actions.attach`                                          | `link`                                                  | `AttachAction`                                           |
| `alfakit::actions.delete`                                          | `trash-2`                                               | `DeleteAction`, `DeleteBulkAction`                       |
| `alfakit::actions.detach`                                          | `unlink`                                                | `DetachAction`                                           |
| `alfakit::actions.dissociate`                                      | `unlink`                                                | `DissociateAction`                                       |
| `alfakit::actions.edit`                                            | `pencil`                                                | `EditAction`                                             |
| `alfakit::actions.force-delete`                                    | `trash-2`                                               | `ForceDeleteAction`, `ForceDeleteBulkAction`             |
| `alfakit::actions.group`                                           | `ellipsis-vertical`                                     | `ActionGroup` trigger                                    |
| `alfakit::actions.replicate`                                       | `copy`                                                  | `ReplicateAction`                                        |
| `alfakit::actions.restore`                                         | `rotate-ccw`                                            | `RestoreAction`, `RestoreBulkAction`                     |
| `alfakit::actions.view`                                            | `eye`                                                   | `ViewAction`                                             |
| `alfakit::notifications.success` / `warning` / `danger` / `info`   | `circle-check` / `triangle-alert` / `circle-x` / `info` | `Notification::make()->success()` …, error notifications |
| `alfakit::schemas.callout.success` / `warning` / `danger` / `info` | same as notifications                                   | `Callout::make()->success()` …                           |
| `alfakit::schemas.empty-state`                                     | `inbox`                                                 | `EmptyState`                                             |
| `alfakit::tables.empty-state`                                      | `inbox`                                                 | Empty tables                                             |

The rest of the catalogue names the icons of the renderer chrome, grouped like Filament's. Replacements for these are sent to the browser with the panel (`theme.icons`) and every renderer (React, Vue and Svelte) draws them in place of its built-in glyph:

| Area    | Aliases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel   | `alfakit::panels.global-search.field`, `panels.sidebar.toggle-button`, `panels.sidebar.group.collapse-button`, `panels.topbar.open-sidebar-button` (mobile menu), `panels.topbar.open-database-notifications-button` (bell), `panels.user-menu.toggle-button` / `profile-item` / `logout-button` / `install-app-item` / `push-on-item` / `push-off-item` (`pwa()`), `panels.tenant-menu.toggle-button` / `profile-button` / `registration-button`, `panels.theme-switcher.light-button` / `dark-button` / `system-button`, `panels.widgets.account.logout-button` (full-screen layout) |
| Support | `alfakit::support.breadcrumbs.separator`, `support.loading-indicator` (the spinner shown while something loads, in all three renderers), `support.modal.close-button` (dialogs and slide-overs), `support.pagination.first-button` / `previous-button` / `next-button` / `last-button`                                                                                                                                                                                                                                                                                                 |
| Tables  | `alfakit::tables.search-field`, `tables.actions.filter`, `tables.filters.remove-all-button`, `tables.actions.column-manager`, `tables.actions.group`, `tables.grouping.collapse-button`, `tables.actions.enable-reordering`, `tables.reorder.handle`, `tables.header-cell.sort-button` / `sort-asc-button` / `sort-desc-button`                                                                                                                                                                                                                                                        |
| Forms   | `alfakit::forms.components.repeater.actions.*` and `builder.actions.*` (`delete`, `clone`, `move-up`, `move-down`, `reorder`, `collapse`, `expand`; builder also `edit`), `key-value.actions.delete` / `reorder`, `text-input.actions.show-password` / `hide-password` / `copy`                                                                                                                                                                                                                                                                                                        |
| Schemas | `alfakit::schemas.section.collapse-button`, `schemas.wizard.completed-step`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Widgets | `alfakit::widgets.chart.empty-state`, `widgets.chart.filter`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

```php
Icons::register([
    'alfakit::support.modal.close-button' => 'circle-x',
    'alfakit::panels.sidebar.toggle-button' => Heroicon::OutlinedBars3,
    'alfakit::tables.actions.filter' => asset('icons/filter.svg'),
]);
```

Repeater, builder and key-value item buttons follow their aliases too: customised item actions (`deleteAction(fn (Action $action) => …)`) are resolved on the server like any action icon, and the default buttons draw the replacement sent with the panel. The other chrome icons are resolved in the browser: until an alias is replaced the renderer draws its bundled Lucide glyph directly (nothing is loaded lazily, so there is no flash), and once it is replaced it draws the replacement through `<Icon>`. A `panel:icon` component only sees replaced chrome aliases, not the built-in glyphs.

Custom renderer components can do the same. Pass the alias as `name` and the bundled glyph (or a Lucide name) as `fallback`:

```tsx
import { SearchIcon } from 'lucide-react'
import { Icon } from '@alfakit/react'

;<Icon name="alfakit::panels.global-search.field" fallback={SearchIcon} className="size-4" />
// Vue:    <Icon name="alfakit::panels.global-search.field" :fallback="SearchIcon" />
// Svelte: <Icon name="alfakit::panels.global-search.field" fallback={SearchIcon} />
```

`iconAlias(name, fallback)` and `iconAliasOverride(name)` from `@alfakit/core` resolve an alias yourself. The remaining aliases in `Icons::DEFAULTS` (sidebar collapse/expand buttons, sub-navigation menu, checkbox-list search, file-upload editor, rich-editor toolbar, query builder, tabs "more" button, collapsible column, bulk-actions trigger, dashboard filter) follow Filament's catalogue but no renderer reads them yet, so registering them has no effect.

`Icons::register()` is not limited to `alfakit::` names: register your own aliases (`'app::orders' => 'shopping-cart'`) or remap any plain name, and use them anywhere an icon is accepted. Every icon option is resolved on the server before the schema is sent:

- **Form fields**: `prefixIcon()` / `suffixIcon()` (`TextInput`, `Select`, `DatePicker`, `MoneyInput`), `hintIcon()`, `Toggle` `onIcon()` / `offIcon()`, option icons (`icons([...])` on `Select`, `CheckboxList`, `Radio`, `ToggleButtons`), `Builder` block icons and rich-editor custom block icons.
- **Layout and prime components**: `Section`, `Tabs\Tab` (including resource list tabs), `Wizard\Step`, `Text`, `Icon`, `Callout` and `EmptyState`.
- **Infolist entries**: `TextEntry` and `IconEntry` icons (including `trueIcon()` / `falseIcon()` and icons named by the state) and entry `hintIcon()`.
- **Tables**: `TextColumn` and `IconColumn` icons (including `trueIcon()` / `falseIcon()` and icons named by the state), `ToggleColumn` `onIcon()` / `offIcon()`, query-builder constraint `icon()` and `emptyStateIcon()`.
- **Actions**: action and action-group `icon()`, `modalIcon()` (and the confirmation icon), and notification actions.
- **Notifications**: `Notification::make()->icon()` and the status icons.
- **Navigation**: navigation items (`icon()`, `activeIcon()`, `$navigationIcon`, `$activeNavigationIcon`), navigation groups, user and tenant menu items, relation manager tabs (`protected static ?string $icon`) and relation groups.
- **Widgets**: stat `icon()` and `descriptionIcon()`.

So `Text::make('Trash')->icon('alfakit::actions.delete')` renders whatever the alias points to. The PHP getters (`getIcon()`, `getPrefixIcon()`, `getOnIcon()`, `getModalIcon()`, `RelationManager::getIcon()`…) return the resolved name too, and `Icons::resolve('app::orders')` / `Icons::get('alfakit::actions.delete')` resolve a name yourself.

Because aliases in the schema are resolved on the server, a custom renderer component only ever receives a resolved icon: a Lucide name, an image URL or sanitised SVG markup. A `panel:icon` component (below) receives only names; URLs and SVG are drawn by the built-in `<Icon>`.

## Swapping the icon set

To draw icons from another set (Heroicons, Phosphor, your own SVGs), register a `panel:icon` component. It replaces the icon of every named icon in the schema: navigation, actions, columns, entries, notifications, sections. It receives `name`, `fallback` and the class to apply. Renderer chrome draws its bundled Lucide glyphs unless you replace their aliases with `Icons::register()` (above); a replaced alias that is a name goes through `panel:icon` too.

Combine it with `Icons::register()` (to rename Alfakit's own icons) and use your set's names in PHP.

### React

```tsx
import { createAlfakit } from '@alfakit/react'
import * as Phosphor from '@phosphor-icons/react'

function PhosphorIcon({ name, className }: { name: string; className?: string }) {
    const Component = (Phosphor as Record<string, React.ComponentType<{ className?: string }>>)[
        name
    ]

    return Component ? <Component className={className} /> : null
}

void createAlfakit({ components: { 'panel:icon': PhosphorIcon } })
```

### Vue

```ts
import { createAlfakit } from '@alfakit/vue'
import PhosphorIcon from './components/PhosphorIcon.vue' // props: name, fallback; class falls through

void createAlfakit({ components: { 'panel:icon': PhosphorIcon } })
```

### Svelte

```ts
import { createAlfakit } from '@alfakit/svelte'
import PhosphorIcon from './components/PhosphorIcon.svelte' // props: name, fallback, class

void createAlfakit({ components: { 'panel:icon': PhosphorIcon } })
```

Svelte also has `registerIcons({ 'my-logo': MyLogo })` from `@alfakit/svelte` to add single icons to the Lucide set without replacing it.

Register the same component in your SSR entry (`createAlfakitServer({ components })`) so server and browser render the same markup.
