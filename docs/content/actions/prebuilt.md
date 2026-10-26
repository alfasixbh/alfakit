---
title: Prebuilt actions
description: CRUD, soft-delete and relationship actions.
---

# Prebuilt actions

All prebuilt actions resolve URLs and policies through the resource of the page, table or relation manager they live in, so they work without configuration inside resources.

Outside resources (a [standalone table](../standalone/tables) or infolist) there are no resource pages to link to: give `CreateAction`, `EditAction` and `ViewAction` a `->form([...])` so they open modals (and `CreateAction` a `->model(Order::class)`; an `EditAction` with no form, URL, `using()` or `action()` is hidden), and the model's policy authorises them. Modal headings name the record by its `title`, `name`, `label` or `email` attribute, else by its key; set another with `->recordTitle(fn (Order $record) => $record->number)`.

| Action                                                           | Behaviour                                                                                                                           | Notable options                                                                                                                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CreateAction`                                                   | Links to the create page, or opens a modal form when `->form()` is set (relation managers and simple resources)                     | `mutateDataUsing()`, `using()`, `createAnother(false)`, `model()`                                                                                                              |
| `EditAction`                                                     | Links to the edit page or opens a modal form                                                                                        | `mutateRecordDataUsing()`, `mutateDataUsing()`, `using()`                                                                                                                      |
| `ViewAction`                                                     | Links to the view page or shows a disabled form / `modalContent()`                                                                  | `mutateRecordDataUsing()`                                                                                                                                                      |
| `DeleteAction`                                                   | Confirmation, `$record->delete()`, redirects to the index when run from a record page                                               | —                                                                                                                                                                              |
| `RestoreAction` / `ForceDeleteAction`                            | Visible only for trashed records                                                                                                    | —                                                                                                                                                                              |
| `ReplicateAction`                                                | Copies the record (`excludeAttributes()`, `beforeReplicaSaved()`, `afterReplicaSaved()`); add `->form()` to let users edit the copy | —                                                                                                                                                                              |
| `AttachAction` / `DetachAction`                                  | BelongsToMany in relation managers                                                                                                  | `multiple()`, `preloadRecordSelect()`, `recordSelectOptionsQuery()`, `recordSelectSearchColumns()`, `recordSelect()`, `allowDuplicates()`, `getRecordSelect()`, pivot `form()` |
| `AssociateAction` / `DissociateAction`                           | HasMany / MorphMany in relation managers                                                                                            | `multiple()`, `preloadRecordSelect()`, `recordSelectOptionsQuery()`, `recordSelectSearchColumns()`, `recordSelect()`, `getRecordSelect()`                                      |
| `DeleteBulkAction`, `RestoreBulkAction`, `ForceDeleteBulkAction` | Bulk variants with confirmation; each selected record is checked against `delete` / `restore` / `forceDelete`                       | `authorizeIndividualRecords()`, `chunkSelectedRecords()`                                                                                                                       |
| `ImportAction` / `ExportAction` / `ExportBulkAction`             | CSV import with column mapping; CSV/XLSX export of the table or the selection, queued ([Import & export](./import-export))          | `importer()`, `exporter()`, `maxRows()`, `chunkSize()`, `formats()`                                                                                                            |
| `DetachBulkAction`                                               | Detaches the selected records of a BelongsToMany relation manager                                                                   | —                                                                                                                                                                              |
| `DissociateBulkAction`                                           | Clears the foreign key (and morph type) of the selected records of a HasMany / MorphMany relation manager                           | —                                                                                                                                                                              |

## Create & create another

A modal `CreateAction` shows a **Create & create another** button next to **Create**. It saves the record, keeps the modal open and reloads the form with its default values, so the next record can be typed straight away (no success redirect runs). Hide the button with `createAnother(false)`; keep some values for the next record with `preserveFormDataWhenCreatingAnother()` (every field) or `preserveFormDataWhenCreatingAnother(['category_id', 'status'])` (the named fields):

```php
CreateAction::make()
    ->form([...])
    ->preserveFormDataWhenCreatingAnother(['category_id']);
```

`preserveFormDataWhenCreatingAnother()` also takes a closure returning either of those, or (as in Filament) the part of `$data` to keep, whose keys name the fields: `fn (array $data): array => Arr::only($data, ['category_id'])`.

Customise the button itself with `createAnotherAction()`: the closure receives it as an `Action` and returns it changed (label, colour, icon), or `false` to remove it:

```php
CreateAction::make()
    ->createAnotherAction(fn (Action $action): Action => $action->label('Save and add another')->icon('plus'));
```

Every prebuilt action is a normal `Action`: override labels, icons, colours, notifications, hooks or `->action()` freely.

```php
DeleteAction::make()
    ->before(fn (Post $record) => $record->comments()->delete())
    ->successNotificationTitle('Post removed');
```
