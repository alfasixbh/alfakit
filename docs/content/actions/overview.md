---
title: Actions
description: Buttons that link, confirm, collect input and run code.
---

# Actions

An action is a button. It can link somewhere, open a modal (confirmation and/or form) and run server-side logic — with authorisation, validation, lifecycle hooks and notifications.

Actions work on panel pages, in a [starter kit](../getting-started/starter-kits) and, outside panels, in your own Inertia pages (see [Actions and infolists](../standalone/actions-and-infolists)). The example below shows most options at once; `Post::due()`, `isPublished()` and `archive()` stand for your own model's methods, and it needs `use AlfaSix\Alfakit\Actions\Action;` and `use AlfaSix\Alfakit\Support\Enums\Size;`.

```php
Action::make('archive')
    ->label('Archive')->icon('archive')->color('warning')->size(Size::Small)
    ->button()                                   // or outlined(), ghost(), link(), iconButton()
    ->badge(fn () => Post::due()->count())->badgeColor('danger')
    ->tooltip('Move to the archive')
    ->keyBindings(['mod+shift+a'])              // not bound for record actions inside table rows
    ->authorize('archive')                       // Gate ability, bool or closure
    ->visible(fn (?Post $record) => $record?->isPublished())
    ->disabled(fn () => ! auth()->user()->can('archive'))
    ->requiresConfirmation()
    ->modalHeading(fn (Post $record) => "Archive {$record->title}?")
    ->before(fn (Post $record) => Log::info("archiving {$record->id}"))
    ->action(function (Post $record, array $data, array $arguments, Action $action) {
        $record->archive();
    })
    ->after(fn () => Cache::forget('posts'))
    ->successNotificationTitle('Archived')
    ->successRedirectUrl(fn () => PostResource::getUrl());
```

## Trigger styles

```php
Action::make('edit')->button();                     // solid button
Action::make('edit')->outlined();                   // or ->ghost(), ->link()
Action::make('edit')->iconButton()->icon('pencil'); // icon only; the label becomes the tooltip and accessible name
Action::make('edit')->badge();                      // a tinted badge in the action's colour, with its label and icon
Action::make('filter')->iconButton()->icon('filter')->badge(5)->badgeColor('success'); // a count badge on the button
```

`badge()` without an argument switches the trigger to the badge style; `badge($value)` with a value adds a count badge to whatever style the button has. Calling another style (`button()`, `link()`, …) afterwards replaces the badge style.

| Method                                                              | Description                                                                                                     |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `icon('send')->iconPosition(IconPosition::After)`                   | Put the icon after the label (`IconPosition::Before` is the default; mirrored in RTL)                           |
| `hiddenLabel()`                                                     | Show only the icon; the label stays the tooltip and the accessible name                                         |
| `labeledFrom('md')`                                                 | Icon only below a breakpoint, label from it up (see [Responsive labels](#responsive-labels))                    |
| `size(Size::Small)`                                                 | `ExtraSmall`, `Small`, `Medium`, `Large`, `ExtraLarge`                                                          |
| `extraAttributes(['data-tour' => 'archive', 'class' => 'ms-auto'])` | HTML attributes on the button; `class` is merged with the button's classes, `merge: true` adds to earlier calls |

## Where actions live

| Place                                    | Method                                  |
| ---------------------------------------- | --------------------------------------- |
| Page header                              | `getHeaderActions()` on any page        |
| Below a page form                        | `getFormActions()`                      |
| Section header / footer                  | `Section::make()->headerActions([...])` |
| Table rows / bulk / header / empty state | see [Table actions](../tables/actions)  |
| Notifications                            | `Notification::make()->actions([...])`  |

## Links

```php
Action::make('docs')->url('https://alfakit.dev', shouldOpenInNewTab: true)->link();
Action::make('edit')->url(fn (Post $record) => PostResource::getUrl('edit', ['record' => $record]));
```

An action with a URL and no handler renders as a plain link.

`postToUrl()` sends a POST request (with the CSRF token) to the URL instead of visiting it:

```php
Action::make('lockSession')->url(fn () => route('lock-session'))->postToUrl();
```

## Authorisation

`authorize()` takes a Gate ability (checked against the record, or the model class without one), a boolean or a closure. The closure may return a policy `Response` with a message. An unauthorised action is hidden and refused by the action endpoint.

To tell users why they can't use an action, keep it visible:

```php
use Illuminate\Auth\Access\Response;

Action::make('publish')
    ->authorize('publish')            // PostPolicy::publish() returns Response::deny('Only editors can publish.')
    ->authorizationTooltip();         // shown disabled, the message as its tooltip

Action::make('archive')
    ->authorize(fn (Post $record): Response => $record->isLocked() ? Response::deny('Locked posts are read-only.') : Response::allow())
    ->authorizationNotification();    // clickable; clicking sends the message as a danger notification

Action::make('export')
    ->authorize(false)
    ->authorizationTooltip()
    ->authorizationMessage('Ask an admin for access.');   // used when the policy gives no message
```

Without a message (a plain `false` from the policy and no `authorizationMessage()`), the action stays hidden. Either way the action never runs: its modal doesn't open, the endpoint answers 403 (or, with `authorizationNotification()`, sends the notification and stops), and actions nested in its modal are refused too.

## Groups

```php
ActionGroup::make([EditAction::make(), DeleteAction::make()])
    ->label('More')->icon('ellipsis-vertical')->button()->dropdownPlacement('bottom-end');
```

| Method                        | Description                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `buttonGroup()`               | Render the actions as joined buttons instead of a dropdown                                                    |
| `dropdown(false)`             | A nested group becomes a divided section of its parent dropdown; a top-level group renders its actions inline |
| `dropdownWidth(Width::Small)` | Width of the dropdown (`xs` … `7xl`)                                                                          |
| `dropdownOffset(8)`           | Pixels between the trigger and the dropdown                                                                   |
| `maxHeight('300px')`          | The dropdown scrolls beyond this height                                                                       |

```php
ActionGroup::make([
    ActionGroup::make([EditAction::make(), ViewAction::make()])->dropdown(false),
    DeleteAction::make(),
]);
```

## Responsive labels

`labeledFrom('md')` shows only the icon below the breakpoint (`sm`, `md`, `lg`, `xl`, `2xl`) and the label from it up. The label stays the button's accessible name on every screen size.

```php
Action::make('export')->icon('download')->labeledFrom('md')
```

## Injection

Handlers and closures receive `$record`, `$data` (validated modal form data), `$arguments`, `$action`, `$mountedActions` (the open actions, outermost first, see [nested actions](/docs/actions/modals#reading-and-writing-the-parents-data)), `$form`/`$schema`, `$get`/`$set` (modal form), plus type-hinted dependencies and the owning context (`Table`, a page, a `RelationManager`).

## Halting and cancelling

```php
->action(function (Post $record, Action $action) {
    if ($record->isLocked()) {
        Notification::make()->danger()->title('Locked')->send();
        $action->halt();      // keeps the modal open
    }

    $action->cancel();        // closes the modal without running after() hooks
})
```

## Database transactions

Wrap every action's `before()` hooks, handler and `after()` hooks in a database transaction with `->databaseTransactions()` on the panel. Page saves (create and edit forms) run as actions, so they are covered too. An exception, `halt()` or `cancel()` rolls back everything the action wrote. Opt a single action in or out with `->databaseTransaction()` / `->databaseTransaction(false)`:

```php
$panel->databaseTransactions();

Action::make('sync')->databaseTransaction(false)->action(fn () => $this->callRemoteApi());
```

## Rate limiting

`->rateLimit(5)` allows five runs a minute per user (per IP address for guests). A submission whose form fails validation is not a run and does not count. Further attempts halt the action, keep its modal open and send a "Too many attempts" notification that says how long to wait. Pass the window as a second argument (`->rateLimit(10, decaySeconds: 3600)`) and customise the notification with `rateLimitedNotificationTitle()` or `rateLimitedNotification()`; both closures receive `$seconds` and `$minutes`.

```php
Action::make('resendInvite')
    ->rateLimit(3)
    ->rateLimitedNotificationTitle(fn (int $minutes) => "Try again in {$minutes} min")
    ->action(fn (Invite $record) => $record->resend());
```

## Bulk actions

`BulkAction` handlers receive the selected records as `$records`. The selection is read from the table's own query (tenant scope, relation manager scope and list tab included), so a user can only act on records the table can show; "select all" applies the current filters, search and tab.

| Method                                  | Description                                                                                                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authorizeIndividualRecords('delete')`  | Check a policy ability (or a closure receiving `$record`) for every record; refused records are left out and the user is told how many were skipped. Defaults to `'update'` |
| `chunkSelectedRecords(250)`             | Load the selection lazily, 250 records at a time; `$records` is then a `LazyCollection` (type-hint `Enumerable` to accept both)                                             |
| `deselectRecordsAfterCompletion(false)` | Keep the selection after the run                                                                                                                                            |

`DeleteBulkAction`, `ForceDeleteBulkAction` and `RestoreBulkAction` authorise each record (`delete`, `forceDelete`, `restore`) in addition to the `*Any` ability.

```php
BulkAction::make('archive')
    ->authorizeIndividualRecords('archive')
    ->chunkSelectedRecords(500)
    ->action(fn (Enumerable $records) => $records->each->archive());
```

## Arguments

Pass extra data from the frontend (`arguments: { reason: 'spam' }`) or set them in PHP with `->arguments([...])`; read them via `$arguments`.

## Responses

Return a `Response` or `Responsable` from the handler (e.g. `response()->streamDownload(...)`) to send it directly. For downloads prefer `->url()` to a route, which plays best with Inertia.

## Prebuilt actions

`CreateAction`, `EditAction`, `ViewAction`, `DeleteAction`, `RestoreAction`, `ForceDeleteAction`, `ReplicateAction`, `AttachAction`, `DetachAction`, `AssociateAction`, `DissociateAction` and the `*BulkAction` variants (including `DetachBulkAction` and `DissociateBulkAction`) — see [Prebuilt actions](prebuilt).
