---
title: Media Library
description: Upload, show and order Spatie Media Library files in forms, tables and infolists.
---

# Media Library

`alfasix/alfakit-media-library` connects AlfaKit to [Spatie Laravel Media Library](https://spatie.be/docs/laravel-medialibrary). It adds a form field that stores its files as media of the record, a table column and an infolist entry that show them. If you know Filament's `filament/spatie-laravel-media-library-plugin`, the class names and options are the same.

| Class                           | Extends       | Does                                                                     |
| ------------------------------- | ------------- | ------------------------------------------------------------------------ |
| `SpatieMediaLibraryFileUpload`  | `FileUpload`  | Uploads to a media collection; deletes removed media and saves the order |
| `SpatieMediaLibraryImageColumn` | `ImageColumn` | Shows a collection's images in a table                                   |
| `SpatieMediaLibraryImageEntry`  | `ImageEntry`  | Shows a collection's images in an infolist                               |

The three render as the built-in `FileUpload`, `ImageColumn` and `ImageEntry` in React, Vue and Svelte, so there is no frontend package to install.

**Works in** an [admin panel](../getting-started/installation), a [starter kit](../getting-started/starter-kits) panel and [outside panels](../standalone/overview) (a standalone form bound to a record with `make(['record' => $product])`: the field saves its media after `submit()`).

## Installation

```bash
composer require alfasix/alfakit-media-library
```

Install the media library as its documentation describes (publish and run its `media` migration: `php artisan vendor:publish --provider="Spatie\MediaLibrary\MediaLibraryServiceProvider" --tag="medialibrary-migrations"`, then `php artisan migrate`), run `php artisan storage:link` so previews on the `public` disk load (Herd and Valet serve `storage/app/public` without the link, a real server doesn't), and prepare your model:

```php
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Product extends Model implements HasMedia
{
    use InteractsWithMedia;

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('cover')->singleFile();
        $this->addMediaCollection('gallery');
        $this->addMediaCollection('manuals')->useDisk('s3');
    }
}
```

Registering the plugin on a panel is optional; the components work in any panel and in standalone forms and tables. Register it to declare the dependency and read it back with `MediaLibraryPlugin::get()`:

```php
use AlfaSix\AlfakitMediaLibrary\MediaLibraryPlugin;

$panel->plugin(MediaLibraryPlugin::make());
```

## Form field

```php
use AlfaSix\AlfakitMediaLibrary\Forms\Components\SpatieMediaLibraryFileUpload;

SpatieMediaLibraryFileUpload::make('gallery')
    ->collection('gallery')
    ->multiple()
    ->reorderable()
    ->image()
```

The field's state is the list of the record's media UUIDs in the collection, in their `order_column` order. It is never saved to an attribute: after the record is created or saved, the field

1. adds every new upload to the collection (`addMediaFromDisk()` from AlfaKit's temporary upload),
2. deletes the media of the collection that were removed from the field,
3. saves the field's order with `Media::setNewOrder()`.

All of this runs inside the page's database transaction, so a failing upload (for example a file the collection doesn't accept) rolls back the record and shows a validation error on the field. Only media of the record's own collection can be submitted back: a UUID of someone else's media is rejected like any tampered file path.

Every `FileUpload` option works: `multiple()`, `reorderable()`, `image()`, `acceptedFileTypes()`, `maxSize()`, `maxFiles()`, `imageEditor()`, `downloadable()`, `openable()`, `preserveFilenames()`, `getUploadedFileNameForStorageUsing()` (its closure receives `$file`, `$originalName` and `$extension`, see [File upload](../forms/fields#fileupload)) and so on. These options are added:

| Method                                   | Description                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `collection(string\|Closure\|null)`      | The media collection. Default `default`.                                                                                 |
| `conversion(string\|Closure\|null)`      | The conversion shown in the preview, once generated (the original is shown until then).                                  |
| `conversionsDisk(string\|Closure\|null)` | Store conversions on this disk (`storingConversionsOnDisk()`).                                                           |
| `customProperties(array\|Closure\|null)` | Custom properties of new media. A closure receives the upload as `$file`.                                                |
| `manipulations(array\|Closure\|null)`    | Manipulations per conversion: spatie/image method => its arguments as a list, `['thumb' => ['blur' => [10]]]`.           |
| `properties(array\|Closure\|null)`       | Attributes set on new media models (`withProperties()`).                                                                 |
| `customHeaders(array\|Closure\|null)`    | Headers for remote disks, `['CacheControl' => 'max-age=86400']`.                                                         |
| `mediaName(string\|Closure\|null)`       | The media `name`. Default: the original file name without its extension. A closure receives `$file` and `$originalName`. |
| `responsiveImages(bool\|Closure = true)` | Generate responsive images (`withResponsiveImages()`; `withResponsiveImages()` is an alias).                             |
| `filterMediaUsing(?Closure)`             | Narrow the media the field shows and manages, `fn (Collection $media): Collection`.                                      |

### Disks and private files

`disk('s3')` sets the disk new media are stored on. Without it the disk of the model's registered collection is used (`useDisk()`), else the media library's `disk_name`.

Previews use `getUrl()`; on a private disk (`visibility()` set to `private`, or a disk whose `visibility` is `private`) they use `getTemporaryUrl()`, valid for 30 minutes, so private buckets work without making files public.

### Closures

Like every AlfaKit option, these accept closures with `$record`, `$state`, `$get`, `$operation` and type-hinted dependencies injected:

```php
SpatieMediaLibraryFileUpload::make('attachments')
    ->collection(fn (Get $get): string => $get('type') === 'invoice' ? 'invoices' : 'attachments')
    ->customProperties(fn (TemporaryUpload $file): array => ['original' => $file->originalName()])
```

## Table column

```php
use AlfaSix\AlfakitMediaLibrary\Tables\Columns\SpatieMediaLibraryImageColumn;

SpatieMediaLibraryImageColumn::make('cover')
    ->collection('cover')
    ->conversion('thumb')
    ->circular()
```

The `media` relation is eager loaded. All `ImageColumn` options work (`circular()`, `stacked()`, `limit()`, `limitedRemainingText()`, `defaultImageUrl()`, `size()`…), plus:

| Method                                 | Description                                                          |
| -------------------------------------- | -------------------------------------------------------------------- |
| `collection(string\|Closure\|null)`    | The collection to show. Default `default`.                           |
| `allCollections(bool\|Closure = true)` | Show the media of every collection.                                  |
| `conversion(string\|Closure\|null)`    | The conversion to show once generated.                               |
| `filterMediaUsing(?Closure)`           | `fn (Collection $media): Collection`.                                |
| `visibility('private')`                | Force signed temporary URLs (otherwise taken from the media's disk). |

## Infolist entry

```php
use AlfaSix\AlfakitMediaLibrary\Infolists\Components\SpatieMediaLibraryImageEntry;

SpatieMediaLibraryImageEntry::make('gallery')
    ->collection('gallery')
    ->conversion('preview')
    ->stacked()
```

It takes the same options as the column, and every `ImageEntry` option.

## Translations

The plugin has one string, `alfakit-media-library::media-library.file_cannot_be_added` (shown when the media library refuses a file). Override it in `lang/vendor/alfakit-media-library/{locale}/media-library.php`.
