---
title: Clusters and sub-navigation
description: Group pages and resources under one navigation item, and link a record's pages to each other.
---

# Clusters and sub-navigation

A page can carry a secondary navigation next to (or above) its content. Alfakit fills it in two situations:

- **Clusters** group pages and resources under one item of the main navigation. The cluster's pages are listed in the sub-navigation and their URLs start with the cluster's slug.
- **Record sub-navigation** links the pages of one record to each other: view, edit and any custom record page of a resource.

## Clusters

Generate a cluster:

```bash
php artisan make:alfakit-cluster Settings
```

```php
namespace App\Alfakit\Clusters;

use AlfaSix\Alfakit\Clusters\Cluster;

class Settings extends Cluster
{
    protected static ?string $navigationIcon = 'settings';

    protected static ?int $navigationSort = 90;
}
```

A cluster is a page, so register it like one: `->pages([Settings::class])`, or discover the directory with `->discoverClusters(in: app_path('Alfakit/Clusters'), for: 'App\\Alfakit\\Clusters')`.

Put pages and resources in the cluster with `$cluster`:

```php
namespace App\Alfakit\Pages;

use AlfaSix\Alfakit\Pages\Page;
use App\Alfakit\Clusters\Settings;

class GeneralSettings extends Page
{
    protected static ?string $cluster = Settings::class;

    protected static ?string $navigationIcon = 'sliders-horizontal';
}
```

```php
namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Resources\Resource;
use App\Alfakit\Clusters\Settings;

class TagResource extends Resource
{
    protected static ?string $cluster = Settings::class;
}
```

What changes:

|                 | Without a cluster                        | In the `Settings` cluster                                                                        |
| --------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| URL             | `/admin/general-settings`, `/admin/tags` | `/admin/settings/general-settings`, `/admin/settings/tags`                                       |
| Main navigation | One item per page and resource           | One **Settings** item, active on every page of the cluster                                       |
| Sub-navigation  | None                                     | The cluster's pages and resources, sorted by `$navigationSort` and grouped by `$navigationGroup` |
| Breadcrumbs     | The page's own                           | Led by the cluster (`$clusterBreadcrumb`, defaults to the navigation label)                      |

Route names don't change, so `GeneralSettings::getUrl()` and `TagResource::getUrl()` keep working. Visiting the cluster URL (`/admin/settings`) redirects to its first page. The cluster disappears from the navigation when the user can't open any of its pages (`canAccess()` and resource policies are checked as usual).

A class name ending in `Cluster` (`SettingsCluster`) gets the slug `settings` and the label "Settings".

To keep a cluster's URLs and navigation item but drop its sub-navigation (and link the pages yourself), set `protected static bool $shouldRegisterSubNavigation = false;` on the cluster.

## Record sub-navigation

Return the record's pages from `getRecordSubNavigation()` on the resource:

```php
use AlfaSix\Alfakit\Resources\Pages\Page;

class CustomerResource extends Resource
{
    public static function getRecordSubNavigation(Page $page): array
    {
        return $page->generateNavigationItems([
            Pages\ViewCustomer::class,
            Pages\EditCustomer::class,
            Pages\CustomerOrders::class,
        ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCustomers::route('/'),
            'view' => Pages\ViewCustomer::route('/{record}'),
            'edit' => Pages\EditCustomer::route('/{record}/edit'),
            'orders' => Pages\CustomerOrders::route('/{record}/orders'),
        ];
    }
}
```

`generateNavigationItems()` links each page to the current record and marks the current page active. Pages the user may not open for that record are left out: an `EditRecord` page needs the `update` ability, a `ViewRecord` page `view`, any other page `canAccess()`. Labels are `$navigationLabel`, then `$title`, then "Edit" or "View" for edit and view pages. You can add your own `NavigationItem`s to the array; items with a `group()` are shown under that heading.

The sub-navigation only appears on pages that have a record. List pages of a clustered resource show the cluster's navigation instead.

## Position

The sub-navigation sits in a column at the start of the content by default. Change it with `SubNavigationPosition`:

```php
use AlfaSix\Alfakit\Navigation\SubNavigationPosition;

protected static ?SubNavigationPosition $subNavigationPosition = SubNavigationPosition::Top;
```

Set it on a page, a resource (for its record pages) or a cluster; the panel's `->subNavigationPosition(SubNavigationPosition::Top)` sets the default for all of them.

| Value   | Rendering                                                                                 |
| ------- | ----------------------------------------------------------------------------------------- |
| `Start` | A column on the start side (left in left-to-right languages, right in right-to-left ones) |
| `End`   | A column on the end side                                                                  |
| `Top`   | Tabs above the content                                                                    |

Set it on a page, a resource (all its pages) or a cluster (all its pages). The most specific one wins: page, then resource, then cluster.

## Custom sub-navigation

Override `getSubNavigation()` on any page to return your own `NavigationItem`s or `NavigationGroup`s:

```php
public function getSubNavigation(): array
{
    return [
        NavigationItem::make('Overview')->url(Overview::getUrl())->isActiveWhen(fn () => request()->routeIs('*.overview')),
        NavigationItem::make('Reports')->url(Reports::getUrl()),
    ];
}
```

## Frontend

The page schema carries `subNavigation: { position, groups }`, where `groups` has the same shape as the main navigation. Every renderer draws it with the `data-slot="sub-navigation"` hook (`data-position="start|end|top"`). Replace it in all three renderers with the `panel:sub-navigation` registry key, which receives the `navigation` prop:

```ts
createAlfakit({ components: { 'panel:sub-navigation': MySubNavigation } })
```
