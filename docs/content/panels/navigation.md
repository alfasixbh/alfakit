---
title: Navigation
description: Sidebar groups, items, badges and the user menu.
---

# Navigation

Resources and pages register themselves in the sidebar automatically. Control placement with static properties:

```php
namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Resources\Resource;

class PostResource extends Resource
{
    protected static ?string $navigationIcon = 'file-text';   // Lucide icon name
    protected static ?string $navigationLabel = 'Articles';
    protected static ?string $navigationGroup = 'Blog';
    protected static ?int $navigationSort = 1;
    protected static ?string $navigationParentItem = ContentResource::class; // nest under another item (class or label)
    protected static ?string $navigationBadgeTooltip = 'Drafts'; // or override getNavigationBadgeTooltip()

    public static function getNavigationBadge(): ?string
    {
        $drafts = static::getModel()::where('status', 'draft')->count();

        return $drafts > 0 ? (string) $drafts : null; // null shows no badge; "0" would show one
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'warning';
    }
}
```

Hide an item with `protected static bool $shouldRegisterNavigation = false;` or override `shouldRegisterNavigation()`.

In a [starter kit panel](../getting-started/starter-kits) the same items, groups, parent items, badges (deferred ones too) and custom items are listed in your app's sidebar by `<AlfakitNav />`. The [user menu](#user-menu)'s link entries show in your app's user menu through [`<AlfakitUserMenuItems />`](../getting-started/starter-kits#the-user-menu); the sidebar width, breadcrumbs and avatars on this page belong to AlfaKit's own layout, which a starter kit replaces with yours.

### Setting navigation options from outside the class

Plugins and service providers can change a page's, resource's or cluster's item with static setters. They override the properties for that class only:

```php
UserResource::navigationGroup('Team');
UserResource::navigationLabel('People');
UserResource::navigationSort(2);
UserResource::navigationIcon('users');
Reports::navigationParentItem(UserResource::class);
```

### Parent items by class or key

`$navigationParentItem` (and `NavigationItem::parentItem()`) names the parent by its page or resource class, or by its label. Page and resource items are keyed by their class; give custom items a key with `key()`:

```php
$panel->navigationItems([
    NavigationItem::make('Impersonations')->parentItem(UserResource::class)->url('/impersonations'),
    NavigationItem::make('Docs')->key('docs')->url('/docs'),
    NavigationItem::make('API')->parentItem('docs')->url('/docs/api'),
]);
```

Children of the same parent are merged and sorted by `sort()`.

### HTML labels

Return an `Htmlable` from `getNavigationLabel()` (or pass one to `NavigationItem::label()`) to render markup. It is sanitised on the server; escape dynamic parts with `e()`. Titles, tooltips and breadcrumbs use its text.

```php
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Support\HtmlString;

public static function getNavigationLabel(): string|Htmlable
{
    return new HtmlString('Inbox <strong>new</strong>');
}
```

## Groups

Order and configure groups on the panel:

```php
use AlfaSix\Alfakit\Navigation\NavigationGroup;

$panel->navigationGroups([
    'Blog',
    NavigationGroup::make('Settings')->icon('settings')->collapsed(),
]);
```

Ungrouped items always come first.

Add HTML attributes to a group in the sidebar or the top navigation; `class` is merged with the group's own classes and event handler attributes (`on*`) are dropped:

```php
NavigationGroup::make('Shop')
    ->extraSidebarAttributes(['class' => 'shop-group', 'data-group' => 'shop'])
    ->extraTopbarAttributes(['class' => 'shop-group']);
```

Turn collapsing off for every group with `->collapsibleNavigationGroups(false)`: groups stay open and lose their toggles, whatever `collapsible()` or `collapsed()` say.

In the icon-only sidebar (`sidebarCollapsibleOnDesktop()`), a group with an `icon()` becomes a single button with that icon: it opens the group's items (and their children) in a flyout menu, like Filament. Groups without an icon keep showing their items' icons.

## Sidebar width

```php
$panel->sidebarWidth('18rem')->collapsedSidebarWidth('4rem');
```

Both take a CSS length and set the sidebar's `--sidebar-width` and `--sidebar-width-icon` variables in every renderer.

## Clusters and sub-navigation

Group related pages and resources under one item with its own sub-navigation, and link the pages of a record to each other: see [Clusters and sub-navigation](clusters).

## Custom items

```php
use AlfaSix\Alfakit\Navigation\NavigationItem;

$panel->navigationItems([
    NavigationItem::make('Analytics')
        ->url('https://analytics.example.com', shouldOpenInNewTab: true)
        ->icon('bar-chart-3')
        ->group('Reports')
        ->sort(3)
        ->badge('Beta', color: 'info')
        ->visible(fn () => auth()->user()->isAdmin()),
    NavigationItem::make('Orders')
        ->url('/orders')
        ->badge(fn (): int => Order::query()->where('status', 'new')->count())
        // Badge colour and tooltip closures receive the badge value.
        ->badgeColor(fn (int $badge): string => $badge > 10 ? 'danger' : 'gray')
        ->badgeTooltip(fn (int $badge): string => "{$badge} new orders")
        // HTML attributes for the item's link; `class` is merged with its own.
        ->extraAttributes(['class' => 'font-semibold', 'data-tour' => 'orders']),
]);
```

## Building the whole navigation yourself

```php
$panel->navigation(fn (NavigationBuilder $builder) => $builder
    ->items([NavigationItem::make('Dashboard')->icon('layout-dashboard')->url(Dashboard::getUrl())])
    ->group(NavigationGroup::make('Blog')->items([...PostResource::getNavigationItems(), ...CategoryResource::getNavigationItems()])),
);
```

Pass `->navigation(false)` to hide the sidebar navigation entirely. A closure that returns a boolean decides per request: `true` keeps the auto-discovered items, `false` hides the navigation (for example during onboarding):

```php
$panel->navigation(fn (): bool => auth()->user()?->hasCompletedOnboarding() ?? false);
```

## User menu

Menu entries are [actions](../actions/overview): links, POST links, or actions with server logic and modals. Nested arrays are groups, separated by a divider. Closures in `visible()` / `hidden()` run when the menu is rendered.

```php
use AlfaSix\Alfakit\Actions\Action;

$panel->userMenuItems([
    'profile' => fn (Action $action) => $action->label('Edit profile'),
    'logout' => fn (Action $action) => $action->label('Log out')->icon('door-open'),
    [
        Action::make('billing')->label('Billing')->icon('credit-card')->url('/billing'),
        Action::make('docs')->label('Documentation')->url('https://alfakit.dev', shouldOpenInNewTab: true),
    ],
    [
        Action::make('lockSession')->label('Lock')->url(fn () => route('lock-session'))->postToUrl(),
        Action::make('feedback')
            ->label('Send feedback')
            ->schema([Textarea::make('message')->required()])
            ->action(fn (array $data) => Feedback::create($data))
            ->visible(fn (): bool => auth()->user()->can('sendFeedback')),
    ],
]);
```

| Key       | Built-in entry     | Customise with                                                                    |
| --------- | ------------------ | --------------------------------------------------------------------------------- |
| `profile` | The profile link   | An `Action`, or `fn (Action $action) => $action->label(…)->icon(…)`; `->hidden()` |
| `logout`  | The sign-out entry | Same; it always posts to the logout route unless you give it a `url()`            |

Entries sort by `sort()` within their group. Actions with `action()` or a modal run through the action endpoint as user menu actions (the page's context token authorises the request; only signed-in users can run them). The profile entry stays first and sign-out last; `MenuItem::make()` entries still work but are deprecated in favour of actions. Hide the menu with `->userMenu(false)`.

In the sidebar layouts the menu sits at the bottom of the sidebar. Move it into the top bar with `->userMenu(position: UserMenuPosition::Topbar)` (`AlfaSix\Alfakit\Support\Enums\UserMenuPosition`, or `->userMenuPosition('topbar')`); without a top bar it stays in the sidebar. The top navigation layout always shows it in its bar.

## Breadcrumbs

`$panel->breadcrumbs(hasNavigationHierarchy: true)` starts every page's breadcrumbs with its navigation group and, for an item nested with `$navigationParentItem`, the parent item (linked): `Shop › Products › Edit`. Labels already in the trail aren't repeated. `breadcrumbs(false)` hides them.

## User name and avatar

Implement `AlfaSix\Alfakit\Contracts\HasName` and `HasAvatar` on your user model, or call `->userName(fn ($user) => …)` on the panel. Without them AlfaKit uses the `name`, `email` and `avatar_url` attributes.

Users and tenants without an avatar (`HasAvatar` returning `null`, no `avatar_url`) show their initials, drawn by the renderer. A default avatar provider makes an image URL instead:

```php
use AlfaSix\Alfakit\AvatarProviders\InitialsAvatarProvider;
use AlfaSix\Alfakit\AvatarProviders\UiAvatarsProvider;

$panel->defaultAvatarProvider(InitialsAvatarProvider::class);       // SVG drawn on your server
$panel->defaultAvatarProvider(new UiAvatarsProvider(background: '1e3a8a')); // ui-avatars.com
```

`InitialsAvatarProvider` returns an SVG `data:` URL with the initials on a colour derived from the name (or `new InitialsAvatarProvider(background: '#1e3a8a', color: '#fff')`). `UiAvatarsProvider` links to ui-avatars.com, which then receives the user's name: prefer the initials provider when that matters. Write your own by implementing `AlfaSix\Alfakit\AvatarProviders\Contracts\AvatarProvider` (`get(Model|Authenticatable $record): string`); `$panel->getNameForDefaultAvatar($record)` gives the name to draw from.

## Page navigation badges

Pages, like resources, can show a badge with a tooltip in the navigation:

```php
protected static ?string $navigationBadgeTooltip = 'Open orders';

public static function getNavigationBadge(): string|int|null
{
    return Order::query()->where('status', 'open')->count();
}
```

Override `getNavigationBadgeTooltip()` for a dynamic tooltip.

### Deferred badges

Badges are often count queries that run on every page. `deferNavigationBadges()` leaves them out of the page response: items that have one show a placeholder, and all badges load with one Inertia deferred prop (`alfakitNavigationBadges`) right after the page rendered. While the next page loads, the badges of the previous one stay on screen.

```php
return $panel->deferNavigationBadges();
```

Only pages and resources that override `getNavigationBadge()` (and custom items with a `badge()`) get a placeholder; the badge methods are not called for the page itself.

## How the navigation reaches the browser

The translations, the navigation, the endpoints, the localization, the command palette and the theme are Inertia once props: the browser receives them with the first page and reuses them on later visits. Each is keyed by a hash of its content, so it is sent again as soon as it changes: another language, a user who may see other items, new configuration. The active items and the badges travel separately with every page (`alfakit.navigationState`, items addressed by position, such as `0.2`), and `usePanel()` merges them back into `navigation`. Turn this off with `$panel->onceProps(false)`.

## Custom page options

```php
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Support\Enums\Alignment;

class Settings extends Page
{
    // Header actions under the heading, aligned to the start (default: End, beside the heading).
    protected ?Alignment $headerActionsAlignment = Alignment::Start;

    // Attributes on <body> while the page is open; `class` is merged and removed on leave.
    protected array $extraBodyAttributes = ['class' => 'settings-page'];

    // Data for the page's widgets: each widget gets the entries it declares as public properties.
    public function getWidgetData(): array
    {
        return ['status' => $this->status];
    }
}
```

Override `getExtraBodyAttributes()` to build the attributes per request (event handler attributes are dropped). Properties given to `Widget::make([...])` win over `getWidgetData()`.
