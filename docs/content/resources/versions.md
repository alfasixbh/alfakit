---
title: Record history
description: Snapshots of a record on every change, a History slide-over with field-by-field diffs, and restoring a version.
---

# Record history

Add `HasRecordVersions` to a model and every create, update, delete and restore stores a snapshot of its tracked attributes, with the author, the tenant and the time. Resources of the model get a **History** header action on their edit and view pages: a slide-over listing the versions with a field-by-field diff (old → new; long and rich text as a word diff) and **Restore this version**.

```bash
php artisan vendor:publish --tag=alfakit-record-versions-migrations
php artisan migrate
```

```php
use AlfaSix\Alfakit\Versions\HasRecordVersions;

class Post extends Model
{
    use HasRecordVersions;

    // Optional: only these attributes (default: all except the key, timestamps and `$hidden`).
    protected array $versionInclude = ['title', 'body', 'status'];

    // Optional: never these.
    protected array $versionExclude = ['views'];

    // Versions kept per record (default 50); older ones are pruned on save.
    protected int $maxVersions = 100;
}
```

Updates that only change untracked attributes write no version. `Post::withoutVersions(fn () => $post->update([...]))` skips versioning for a block. `$post->recordVersions()` (also `versions()`) is the morph-many relation to `AlfaSix\Alfakit\Versions\RecordVersion`, newest first.

It works without the activity log plugin: it only listens to Eloquent events.

## The History action

Seeing the history needs the `view` (or `update`) ability on the record. Restoring needs `update`: it writes the tracked attributes of the version back (other attributes stay), saves the record and stores a new version marked as restored. On tenancy panels only versions written in the current tenant (or outside any tenant, e.g. from the console) are listed or restorable, and the record itself is loaded through the resource's tenant-scoped query.

Turn it off for a resource (the model keeps writing versions):

```php
protected static ?bool $hasVersions = false;
```

Place it yourself (it is then not added again) to configure it:

```php
use AlfaSix\Alfakit\Actions\HistoryAction;

protected function getHeaderActions(): array
{
    return [
        HistoryAction::make()
            ->attributeLabels(['body' => 'Content'])
            ->limit(30)
            ->restorable(fn (): bool => auth()->user()->is_editor),
    ];
}
```

## Pruning

```bash
php artisan alfakit:prune-versions --days=365           # older than a year
php artisan alfakit:prune-versions --keep=20            # the newest 20 per record
php artisan alfakit:prune-versions --keep=5 --model="App\Models\Post"
```

Schedule it with `Schedule::command('alfakit:prune-versions --days=365')->daily();`.

## Renderers

The slide-over content is the `RecordVersions` schema component (registry key `RecordVersions`, `data-slot="record-versions"`, `record-version`, `record-version-change`, `record-version-diff`). Its restore button runs the nested `history>restoreVersion` action with the argument `version`.
