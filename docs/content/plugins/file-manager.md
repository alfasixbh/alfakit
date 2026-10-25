---
title: File Manager
description: A Google-Drive-lite file manager for any Laravel filesystem disk, with uploads, folders, previews, zip downloads, trash, shareable links and a picker field. Every operation is authorised, path-checked and tenant-scoped.
---

# File Manager

`alfasix/alfakit-file-manager` adds a file manager page to a panel for one or more Laravel filesystem disks (local, S3 or any Flysystem adapter). Users browse a folder tree, switch between grid and list views, sort, search the folder (and every folder below it), select with the mouse, touch or keyboard, upload by dragging files from the desktop (with progress), create folders, rename, move (drag onto a folder or use the dialog), copy, delete to a trash and restore, preview images, PDFs, video, audio and text, edit images, download files or a zip of a selection, and share files with expiring or revocable links. `FileManagerPicker` lets forms pick files from the manager.

The UI renders in React, Vue and Svelte (registry keys `file-manager` and `FileManagerPicker`, lazy-loaded), works right to left and is announced to screen readers. Everything is listed, checked and changed on the server: the browser only sends paths relative to the manager's root.

Works on an [admin panel](../getting-started/installation) and on a [starter kit](../getting-started/starter-kits) panel (`->starterKit()`), where its pages are listed in your app's sidebar. It needs a panel, so it doesn't apply to [standalone](../standalone/overview) components.

## Installation

```bash
composer require alfasix/alfakit-file-manager
```

Public links (optional, see [Sharing](#sharing)) need the plugin's table:

```bash
php artisan vendor:publish --tag=alfakit-file-manager-migrations
php artisan migrate
```

Zip downloads need the `zip` PHP extension.

## Register

```php
use AlfaSix\AlfakitFileManager\FileManagerPlugin;

$panel->plugin(FileManagerPlugin::make());
```

The page lives at `/{panel}/files` (navigation label "Files", icon `folder`). It opens the folder named in `?disk=…&path=…` and keeps the address bar in sync, so a reload or a pasted URL returns to the same folder.

## Disks and root

```php
FileManagerPlugin::make()
    ->disks(['public', 's3' => 'Cloud'])
    ->root('uploads');
```

- `disks()`: disk names, or names with labels. The first one opens by default; a selector appears when there are several.
- `root()`: the folder of each disk the manager is limited to, a string or a closure receiving `$tenant`, `$disk`, `$user`, `$panel`:

```php
->root(fn (Team $tenant, string $disk): string => 'teams/'.$tenant->getKey())
```

On panels with tenancy the root defaults to `tenants/{tenant key}`, so every tenant gets its own files. Pass `root('')` to share the whole disk. A root that is not a safe relative path throws an exception instead of opening more of the disk.

## Uploads

```php
FileManagerPlugin::make()
    ->maxUploadSize(20 * 1024)                       // kilobytes
    ->acceptedFileTypes(['image/*', 'application/pdf', '.csv'])
    ->allowFileTypes(['svg'])                        // unblock a default-blocked type
    ->blockedFileTypes(['php', 'phtml', 'exe'])      // replace the blocklist
    ->blockedMimeTypes(['text/x-php']);              // replace the blocked detected types
```

Files upload to the panel's temporary upload endpoint (with progress, three at a time) and are then stored in the folder; names that are taken get ` (1)`, ` (2)`… Files larger than `alfakit.uploads.chunk_size` (5 MB) are sent in resumable chunks, so `maxUploadSize()` may exceed `alfakit.uploads.max_size_kb` (the default limit); the panel's `blocked_mime_types` still apply on top. Each upload is checked on the server:

- blocked extensions (scripts, HTML, SVG, executables, server configuration files), also anywhere in the name for server-side scripts (`shell.php.jpg`);
- the type detected from the contents (never the browser's): blocked types are refused, and an image, audio, video or PDF extension whose contents are something else is refused;
- `acceptedFileTypes()`, matched against the detected type;
- hidden names (starting with a dot) and `\ / : * ? " < > |` are never used.

Renaming checks the new name the same way (`notes.txt` can't become `notes.php`).

## Authorisation

```php
use App\Models\User;

FileManagerPlugin::make()
    ->authorize(fn (User $user): bool => $user->can('manage-files'))
    ->can('delete', fn (User $user, array $paths): bool => $user->is_admin)
    ->can(['rename', 'move'], fn (string $path): bool => ! str_starts_with($path, 'contracts'))
    ->readOnly(fn (User $user): bool => ! $user->is_editor);
```

`$user->is_admin` stands for your own check: a new Laravel app's `users` table has no such column, so use a role, a gate or a column you add. The closure's `bool` return type is strict: SQLite returns `0`/`1` and a model created without the attribute holds `null`, so cast the column to `boolean` and give it a default, or return `(bool) $user->is_admin`.

- `authorize()`: who may open the page, the picker and every action.
- `can()`: the abilities `upload`, `createFolder`, `rename`, `move`, `copy`, `delete`, `restore`, `download` and `share`. Closures receive `$ability`, `$disk`, `$path` (the item, or the target folder for uploads, folders, moves and copies), `$paths`, `$user` and `$tenant`.
- `readOnly()`: browse, preview, download and share only.

The UI hides what the user may not do; the server checks every request again.

## Trash, search and limits

```php
FileManagerPlugin::make()
    ->trash(retentionDays: 30)        // or trash(false) to delete straight away
    ->recursiveSearch(maxResults: 200, maxScanned: 5000)
    ->maxListedEntries(2000)
    ->maxItemsPerOperation(500)
    ->defaultView('list');
```

Deleted items go to a hidden `.trash` folder under the root, where they can be restored (to their folder, re-created if needed) or deleted for good; items older than the retention are removed when the trash is opened. Hidden files and the trash never appear in listings, searches or zips.

## Downloads and previews

```php
FileManagerPlugin::make()
    ->zipDownloads(maxSizeKb: 512000, maxFiles: 1000)
    ->rateLimits(downloadsPerMinute: 120, zipsPerMinute: 10)
    ->signedUrlLifetime(30)
    ->textPreviewMaxSize(512);
```

Files are served from signed, expiring routes inside the panel (`/{panel}/files/file`, `/{panel}/files/zip`), behind its authentication and tenant middleware. The URLs carry the path under the root, never the root or an absolute path; the root is worked out again for the signed-in user's tenant. Only images (not SVG), audio, video, PDF and plain text are ever shown inline, sandboxed and with `nosniff`; everything else downloads. Local files support range requests, so players can seek. Zip archives are checked against their size and file limits before they are built.

## Sharing

```php
FileManagerPlugin::make()
    ->shareLinks(expiries: [60, 1440, 10080])   // minutes
    ->publicLinks();
```

`shareLinks()` creates signed temporary URLs anyone can open until they expire (`/alfakit-files/share`, the location encrypted). With `publicLinks()` links are stored instead: they may never expire, are listed per file with their download count, can be revoked, follow renames and moves, and stop working when the file is deleted. Only a hash of each token is searchable and the token is stored encrypted. Turning sharing off ends every link. The public route prefix and middleware are in `config/alfakit-file-manager.php` (`--tag=alfakit-file-manager-config`).

## Picker field

```php
use AlfaSix\AlfakitFileManager\Forms\Components\FileManagerPicker;

FileManagerPicker::make('attachment')
    ->disk('public')
    ->directory('invoices')
    ->acceptedFileTypes(['application/pdf']);

FileManagerPicker::make('gallery')->multiple()->maxFiles(5)->acceptedFileTypes(['image/*']);
```

The state is the path on the disk (`tenants/4/invoices/march.pdf`), or a list with `multiple()`, so `Storage::disk('public')->url($record->attachment)` works. The dialog browses through the file manager page, with its authorisation and root; on save every path is checked again (a file under the root, outside the trash, of an accepted type). The field needs `FileManagerPlugin` on the panel.

With spatie/laravel-medialibrary (`alfasix/alfakit-media-library`), `toMediaCollection('gallery')` adds copies of the picked files to the record's media collection instead of saving paths.

## Customising the page

```php
use AlfaSix\AlfakitFileManager\FileManagerPlugin;
use AlfaSix\AlfakitFileManager\Pages\FileManager;

class Files extends FileManager
{
    protected static ?string $slug = 'documents';
}

FileManagerPlugin::make()->usingPage(Files::class)->navigationGroup('Content')->navigationSort(3);
```

`navigationLabel()`, `navigationGroup()`, `navigationIcon()`, `navigationSort()` and `registerNavigation()` set the navigation item.

## Keyboard

Arrow keys move between items (by rows in the grid, mirrored right to left), Shift extends the selection, Ctrl/Cmd moves without selecting and Space toggles, Ctrl/Cmd+A selects all, Enter opens, Backspace or Alt+Up goes to the parent folder, Delete deletes, F2 renames and Escape clears the selection. In the preview, the left and right arrows show the previous and next file.

## Security notes

- Every posted path is normalised: `..`, `.`, empty and hidden segments, backslashes, drive letters, stream wrappers, control characters and over-long paths are refused, never repaired.
- Every operation works under the root of the disk for the current tenant; requests from one tenant's page can't run under another tenant's URL.
- Uploads are type-checked from their contents; dangerous types are blocked by default.
- Downloads and zips are rate limited per user; share links are throttled per IP.
- Neither the disk's absolute path nor the root is sent to the browser by the file manager itself (the picker's state is the stored disk path).
