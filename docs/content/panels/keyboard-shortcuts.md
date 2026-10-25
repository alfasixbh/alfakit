---
title: Keyboard shortcuts
description: Built-in shortcuts, panel command shortcuts, the ? overlay and per-user custom keys.
---

# Keyboard shortcuts

Every panel page has these shortcuts:

| Keys                              |                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------- |
| <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> | Open the [command palette](command-palette.md) (`globalSearchKeyBindings()`). |
| <kbd>/</kbd>                      | Focus the table search.                                                       |
| <kbd>G</kbd> then <kbd>D</kbd>    | Go to the dashboard (in a starter kit: your app's `/dashboard`).              |
| <kbd>?</kbd>                      | Show the shortcuts overlay.                                                   |

Panel commands add theirs with `shortcut()`, and actions keep their `keyBindings()`:

```php
Command::make('orders')->url(fn (): string => OrderResource::getUrl())->shortcut('g o');

Action::make('publish')->keyBindings(['mod+shift+p'])->action(fn (Post $record) => $record->publish());
```

A binding is up to three steps separated by spaces. Each step is optional modifiers and a key: `mod` (⌘ on macOS, Ctrl elsewhere), `ctrl`, `alt`, `shift`, `meta`, then a letter, digit, punctuation (`?`, `/`), `f1`–`f12` or a named key (`enter`, `escape`, `arrowup`…). Shortcuts without <kbd>Ctrl</kbd>, <kbd>⌘</kbd> or <kbd>Alt</kbd> don't fire while the user types in a field or a rich editor.

In a [starter kit](../getting-started/starter-kits) these shortcuts, command shortcuts and the overlay work on AlfaKit's pages; on your app's own pages only the palette's ⌘K / Ctrl+K is bound.

## The overlay

<kbd>?</kbd> opens a dialog listing everything available on the current page, grouped (general, navigation, commands, actions on this page). Users can change a shortcut ("Change", then press the new key with its modifiers, or a sequence of up to three keys such as <kbd>G</kbd> then <kbd>O</kbd>; the keys are saved a second after the last one, <kbd>Esc</kbd> cancels), turn it off or reset it. Keys already used by another shortcut are refused, including a key that starts another shortcut's sequence (<kbd>G</kbd> would shadow <kbd>G</kbd> then <kbd>O</kbd>). Action key bindings are listed but not changeable.

Custom keys are stored per user and panel on the server. Publish the table to keep them in the database (without it they live in the cache):

```bash
php artisan vendor:publish --tag=alfakit-user-preferences-migrations
php artisan migrate
```

Only well-formed bindings are accepted (the endpoint validates every value), and the renderer treats them as data for its key matcher.

## Options

```php
$panel->keyboardShortcuts(false);               // no built-ins, command shortcuts or overlay
$panel->keyboardShortcuts(customizable: false); // shortcuts on, users can't change them
```

With `keyboardShortcuts(false)` the palette's own key bindings and action `keyBindings()` still work.

## Renderers

`@alfakit/core` exports the registry the renderers share: `shortcuts.register({ id, keys, label, group, handler })` returns a disposer (register in an effect, never during a server render). A handler returning `false` lets the key keep its default behaviour. `shortcuts.trigger(id)`, `shortcuts.setOverrides()`, `isEditableTarget()`, `formatShortcut()`, `bindingFromEvent()` and `isValidShortcut()` help custom components. The `KeyboardShortcuts` component (mounted by the app layout) registers the built-ins and renders the overlay (`data-slot="shortcuts-overlay"`).
