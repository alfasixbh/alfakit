---
title: Undo
description: Offer "Undo" in the toast after an action instead of asking for confirmation.
---

# Undo

`undoable()` puts an **Undo** button with a countdown in the toast an action shows when it succeeds. The toast stays up for the countdown; Undo is reachable with the keyboard, and Ctrl+Z (Cmd+Z on macOS) undoes the newest offer while focus is not in a text field.

```php
DeleteAction::make()->undoable();
DeleteBulkAction::make()->undoable();
EditAction::make()->undoable(seconds: 10);
```

`undoable(?Closure $undoUsing = null, int $seconds = 8)`.

## Built-in undos

| Action                             | Undo                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `DeleteAction`, `DeleteBulkAction` | Restores the records, on models that use `SoftDeletes` (only the records this run deleted). Models without soft deletes get no undo. |
| `EditAction`                       | Puts back the attributes the save changed.                                                                                           |
| The edit page's save               | Same, with `protected static bool $isSaveUndoable = true;` (and `$saveUndoSeconds`) on the `EditRecord` page.                        |

Edits are undone attribute by attribute (relationships are not tracked). Narrow it with `undoTrackedAttributes(['title', 'status'])`. When someone saved the record again in the meantime, the undo is refused with a message instead of overwriting their change.

## Skipping the confirmation

An undoable delete doesn't need to ask first: undoable `DeleteAction` and `DeleteBulkAction` skip their confirmation modal. Keep it with `->skipConfirmationWhenUndoable(false)`, or for every action with `alfakit.undo.skip_delete_confirmation => false`.

## Custom actions

Give any action the closure that reverses it. Store what it needs from the handler with `undoData()`:

```php
Action::make('publish')
    ->action(function (Post $record, Action $action): void {
        $action->undoData(['previous' => $record->status]);
        $record->update(['status' => 'published']);
    })
    ->undoable(fn (Post $record, array $undoData) => $record->update(['status' => $undoData['previous']]));
```

`undoUsing()` receives `$record` / `$records` (the same record or selection), `$data` (the action's form data), `$arguments` and `$undoData`. It runs in a database transaction.

## Security

The toast carries an encrypted undo token. It is bound to the user, panel and tenant, expires with the countdown (plus a few seconds of grace) and works once: what the undo needs (record keys, attribute snapshot, the action's context) stays on the server in the cache (`alfakit.undo.cache_store`), never in the browser. The undo request (`POST /_alfakit/actions/undo`) re-checks the page the action ran on (user, panel access, auth middleware, tenant, `canAccess()`) and the action's policy: built-in undos check the original ability (`delete`, `update`) on every record again, custom ones rebuild the action and check `isAuthorized()`. Expired, used or conflicting undos answer with a notification; forged tokens are refused.

## Frontend

The button is `data-slot="undo-button"` in all three renderers. `@alfakit/core` exports `bindUndo()`, `performUndo()`, `startUndoCountdown()` and `undoShortcuts` for custom toasts (`NotificationSchema.undo` holds `{token, seconds, url}`).
