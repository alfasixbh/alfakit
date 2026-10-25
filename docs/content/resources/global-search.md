---
title: Global search
description: Search across resources from the command palette.
---

# Global search

Press <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> to open the command palette. Every resource with a `$recordTitleAttribute` participates.

The palette also lists page actions, panel commands, navigation, "create" links and recent records: see [Command palette](../panels/command-palette.md).

```php
namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Resources\Resource;
use Illuminate\Database\Eloquent\Model;

class PostResource extends Resource
{
    protected static ?string $recordTitleAttribute = 'title';

    public static function getGloballySearchableAttributes(): array
    {
        return ['title', 'slug', 'author.name'];   // columns of the table; dotted paths search relationships
    }

    public static function getGlobalSearchResultDetails(Model $record): array
    {
        return ['Author' => $record->author->name, 'Status' => $record->status];
    }

    public static function getGlobalSearchResultUrl(Model $record): ?string
    {
        return static::getUrl('edit', ['record' => $record]);
    }

    protected static int $globalSearchResultsLimit = 20;
}
```

The search runs on `getGlobalSearchEloquentQuery()`, which defaults to `getEloquentQuery()` (tenant and parent scoping included). Override it to eager-load what the result details read, or to narrow the results:

```php
use Illuminate\Database\Eloquent\Builder;

public static function getGlobalSearchEloquentQuery(): Builder
{
    return parent::getGlobalSearchEloquentQuery()->with(['author'])->where('status', '!=', 'archived');
}
```

The panel's `globalSearch(position: GlobalSearchPosition::Sidebar)` puts the field in the sidebar; see [Panel configuration](../panels/configuration#global-search).

Closing the palette, or navigating to another page, clears the search term and results, so it opens empty next time. A screen-reader status region announces the number of results (or "No results.") once a search has finished.

## Result actions

Buttons next to a result, for shortcuts to related pages. Every URL must exist: a missing route or page throws and the whole search fails. Only actions with a URL are shown (nothing runs on the server from the search box); hidden and unauthorised actions are left out.

```php
use AlfaSix\Alfakit\Actions\Action;

public static function getGlobalSearchResultActions(Model $record): array
{
    return [
        // a 'comments' page in getPages(), e.g. ManagePostComments (see Resource pages)
        Action::make('comments')->icon('message-circle')->url(static::getUrl('comments', ['record' => $record])),
        // your app's own public route for the post
        Action::make('preview')->url(route('posts.show', $record), shouldOpenInNewTab: true),
    ];
}
```

Disable per resource with `protected static bool $isGloballySearchable = false;`, or on the panel with `->globalSearch(false)`. Change the shortcut with `->globalSearch(keyBindings: ['mod+/'])`.

## Order, phrases and opting in

```php
namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Resources\Resource;

class PostResource extends Resource
{
    // This resource's results come first (lower first; resources without one follow in panel order).
    protected static ?int $globalSearchSort = 1;

    // Search "blue whale" as one phrase instead of "blue" and "whale" separately.
    protected static ?bool $shouldSplitGlobalSearchTerms = false;
}
```

With `->globalSearchResourceOptIn()` on the panel, only resources that declare `protected static bool $isGloballySearchable = true;` themselves are searched. The search field's debounce, suffix and key binding hint are panel options: see [Panel configuration](../panels/configuration#global-search).
