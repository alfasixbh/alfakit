---
title: Table actions
description: Record, bulk, header and empty-state actions.
---

# Table actions

```php
$table
    ->recordActions([
        ViewAction::make(),
        EditAction::make(),
        ActionGroup::make([
            ReplicateAction::make(),
            DeleteAction::make(),
            RestoreAction::make(),
            ForceDeleteAction::make(),
        ]),
        Action::make('publish')->icon('send')->color('success')
            ->visible(fn (Post $record) => $record->isDraft())
            ->requiresConfirmation()
            ->action(fn (Post $record) => $record->publish())
            ->successNotificationTitle('Published'),
    ], position: 'after-columns')
    ->bulkActions([
        DeleteBulkAction::make(),
        BulkAction::make('publish')->icon('send')
            ->requiresConfirmation()
            ->action(fn (Collection $records) => $records->each->publish())
            ->deselectRecordsAfterCompletion(),
    ])
    ->headerActions([CreateAction::make(), Action::make('export')->url(route('posts.export'))]);
```

Record actions receive the row's `$record`; bulk actions receive the selected `$records` (a Collection). "Select all" across pages sends the filtered query's records.

Record actions with a modal form, a confirmation and a visibility rule:

```alfakit-example name="table-row-actions"

```

## Grouping bulk actions and the toolbar

```php
use AlfaSix\Alfakit\Actions\BulkActionGroup;

$table
    ->bulkActions([
        BulkActionGroup::make([DeleteBulkAction::make(), RestoreBulkAction::make()]), // a "Bulk actions" dropdown
        ExportBulkAction::make(),
    ])
    ->groupedBulkActions([...])   // shorthand: every bulk action in one BulkActionGroup
    ->toolbarActions([            // Filament's toolbar: bulk actions show with a selection,
        CreateAction::make(),     // the others in the header
        BulkActionGroup::make([DeleteBulkAction::make()]),
    ]);
```

`toolbarActions()` adds to `headerActions()` and `bulkActions()`: a `BulkAction`, or a group holding only bulk actions, joins the bulk actions; anything else joins the header actions. A `BulkActionGroup` is a labelled outline button; label, icon and variant can be changed like any `ActionGroup`.

`modifyUngroupedRecordActionsUsing(fn (Action $action) => $action->iconButton())` configures every record action that is not inside a group, handy in `Table::configureUsing()`.

## Bulk selection safeguards

```php
$table
    ->maxSelectableRecords(50)    // no more than 50 rows; "select all" is hidden
    ->selectGroupsOnly()          // while grouped: only records of one group
    ->bulkActions([
        BulkAction::make('archive')
            ->fetchSelectedRecords(false) // $records holds the selected keys, no models
            ->action(fn (Collection $records) => Post::whereKey($records)->update(['archived' => true])),
        BulkAction::make('publish')
            ->action(function (Collection $records, BulkAction $action): void {
                foreach ($records as $record) {
                    if (! $record->publish()) {
                        $action->reportBulkProcessingFailure('not-ready', message: fn (int $failureCount, int $totalCount): string => "{$failureCount} of {$totalCount} posts are not ready.");
                    }
                }
            })
            ->successNotificationTitle('Published')
            ->failureNotificationTitle(fn (int $successCount, int $totalCount): string => "{$successCount} of {$totalCount} published"),
    ]);
```

- `authorizeIndividualRecords('publish')` checks the policy for every selected record and skips the ones the user may not change; a warning names how many were skipped. Change its title with `unauthorizedRecordsNotificationTitle()` (a string, or a closure receiving `$count`).
- `maxSelectableRecords()` disables further checkboxes once the limit is reached, and the server refuses a larger selection (422) before the action runs.
- `selectGroupsOnly()` gives each group heading a checkbox that selects the group's records on the page; selecting a record of another group starts a new selection, and the server refuses selections that span groups. Changing the grouping clears the selection.
- `fetchSelectedRecords(false)` hands the action a plain `Illuminate\Support\Collection` of keys. When the table has `checkIfRecordIsSelectableUsing()` or the action uses `authorizeIndividualRecords()`, records are still read (lazily, in chunks) for those checks.
- `DeleteBulkAction`, `ForceDeleteBulkAction`, `RestoreBulkAction` and `DetachBulkAction` support `fetchSelectedRecords(false)`: they act on the keys by query, 500 at a time (soft-deleting models are still soft-deleted). Two things to know:
    - **Model events and observers don't fire**, because no models are loaded (`deleting`, `deleted`, `restored`, …). Keep the default if something listens to them.
    - **Per-record authorisation still loads the records.** The delete, force-delete and restore actions call `authorizeIndividualRecords()` by default, so each record is still read (lazily) to check the policy. To skip loading entirely, turn that off with `->authorizeIndividualRecords(null)` once `deleteAny` / `forceDeleteAny` / `restoreAny` is enough:

```php
DeleteBulkAction::make()
    ->fetchSelectedRecords(false)
    ->authorizeIndividualRecords(null), // only deleteAny is checked; no model is loaded
```

- `reportBulkProcessingFailure($key, message:)` counts a record the action could not process (call it at most once per record). After the action, the user gets the failure notification: `failureNotificationTitle()` (its closure receives `$successCount`, `$failureCount` and `$totalCount`) or "N of M records could not be processed", with each key's message as the body. A bulk action that calls `sendSuccessNotification()` sends the failure notification instead when something failed.

### Record actions that use the selection

```php
$table
    ->selectable() // checkboxes without bulk actions
    ->recordActions([
        Action::make('copyToSelected')
            ->accessSelectedRecords()
            ->action(function (Post $record, Collection $selectedRecords): void {
                $selectedRecords->each->update(['body' => $record->body]);
            }),
    ]);
```

The renderer sends the selected keys with the action; the server resolves them within the table's own query (tenant, filters of `modifyQueryUsing()`), drops records that can't be selected and applies `maxSelectableRecords()`. `$selectedRecords` is available in `action()`, `before()` and `after()`.

The position is a `RecordActionsPosition` (or its string value), passed to `recordActions($actions, position: …)` or set with `recordActionsPosition()`:

| Position                                        | Where                                                 |
| ----------------------------------------------- | ----------------------------------------------------- |
| `RecordActionsPosition::AfterColumns` (default) | After the last column                                 |
| `RecordActionsPosition::AfterCells`             | The last cell of the row                              |
| `RecordActionsPosition::BeforeColumns`          | After the selection checkbox, before the first column |
| `RecordActionsPosition::BeforeCells`            | The first cell, before the selection checkbox         |

```php
use AlfaSix\Alfakit\Tables\Enums\RecordActionsPosition;

$table->recordActions([EditAction::make()], position: RecordActionsPosition::BeforeCells);
```

In [content layouts](layout) the actions sit at the end of each record, or at its start for the two "before" positions.

Actions with forms open a modal whose form can depend on the record:

```php
Action::make('reschedule')
    ->form([DateTimePicker::make('published_at')->required()])
    ->fillForm(fn (Post $record) => ['published_at' => $record->published_at])
    ->action(fn (Post $record, array $data) => $record->update($data));
```

See [Actions](../actions/overview) for the full API.
