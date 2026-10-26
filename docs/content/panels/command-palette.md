---
title: Command palette
description: Search, page actions, panel commands, navigation, create links, recent records and theme switching in one keyboard-first palette.
---

# Command palette

Press <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> (or click the search field) to open the command palette. Besides [global search](../resources/global-search.md) it lists, in groups:

- **Recent**: the records the user opened last (view and edit pages), newest first.
- **Actions**: the current page's header actions. Actions with a modal open the normal modal.
- **Commands**: panel-wide commands registered with `Panel::commands()`.
- **Create**: "New …" for every resource the user may create records in.
- **Go to**: every navigation item.
- **Theme**: light, dark and system mode (when the theme switcher is on).
- **Help**: the [keyboard shortcuts](keyboard-shortcuts.md) overlay.

Typing filters every group with fuzzy matching on labels and keywords (`clc` finds "Clear cache"). The palette is a combobox: arrow keys move, <kbd>Enter</kbd> runs, <kbd>Esc</kbd> closes, and the result count is announced to screen readers.

The palette is on whenever the panel has global search or commands. Turn its extras off with:

```php
$panel->commandPalette(false);
```

In a [starter kit](../getting-started/starter-kits#search-notifications-and-tenants-in-the-header) the palette opens from `<AlfakitSearch />` in your app header with recent records, "New …" links and the panel navigation; panel commands, page actions, theme switching and the shortcuts overlay need an AlfaKit page around them and are left out there. **Install app** (`pwa()`) is offered while an AlfaKit page is open, and on your own pages too with `pwa(push: true)`, whose bell starts the PWA runtime on every page.

## Panel commands

A command is an action, so everything an action can do works: `url()` links, `action()` runs on the server through the action endpoint with the action's authorisation (`visible()`, `authorize()`, `requiresConfirmation()`, `schema()` for a form in the modal, rate limiting, password confirmation).

```php
use AlfaSix\Alfakit\CommandPalette\Command;

$panel->commands([
    Command::make('clear-cache')
        ->label('Clear cache')
        ->icon('trash')
        ->keywords(['flush', 'reset'])
        ->group('Maintenance')
        ->description('Empties the application cache')
        ->shortcut('mod+shift+x')
        ->requiresConfirmation()
        ->visible(fn (): bool => auth()->user()?->is_admin ?? false)
        ->action(fn () => cache()->flush()),

    Command::make('orders')
        ->label('Open orders')
        ->url(fn (): string => OrderResource::getUrl())
        ->shortcut('g o'),
]);
```

| Method                    |                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `keywords(array)`         | Extra words the palette matches.                                                                    |
| `group(string)`           | The heading it is listed under (default "Commands").                                                |
| `description(string)`     | A second line under the label.                                                                      |
| `shortcut(string\|array)` | A key binding on every page (alias of `keyBindings()`): `mod+shift+x`, or a sequence such as `g o`. |

Commands pass `commands()` any `Action` too. Hidden or unauthorised commands are not sent to the browser, and the action endpoint refuses them.

## Recent records

Visiting a record's view or edit page remembers it for the user, per panel and tenant (in the cache, for 30 days). Only references are stored: every time the palette opens, each record is loaded again through its resource's tenant-scoped query and checked with the `view` / `update` policy, so records the user can no longer open never show up.

```php
$panel->recentRecords(8);      // how many (default 5, at most 20)
$panel->recentRecords(false);  // off
```

Keep a resource out of the list:

```php
protected static bool $hasRecentRecords = false;
```

## Renderers

The palette is the `GlobalSearch` component in all three renderers (it keeps the `global-search.*` slots). The building blocks are in `@alfakit/core`: `commandPaletteItems()`, `filterCommandPalette()`, `fuzzyScore()` and `paletteGroupKey()`.
