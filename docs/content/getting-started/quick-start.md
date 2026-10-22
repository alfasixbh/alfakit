---
title: Quick start
description: Build a blog admin in ten minutes.
---

# Quick start

This walkthrough builds a small blog admin: posts with tags and comments. It assumes you have [installed AlfaKit](installation) as an **admin panel** or **inside a starter kit**; every step is the same in both, and the few differences are noted. It builds resources, which need a panel, so it doesn't apply to standalone mode ([Outside panels](../standalone/overview) has its own walkthrough).

## The panel

`app/Providers/Alfakit/AdminPanelProvider.php` was created by the installer (in a starter kit it has `->starterKit()` instead of `->login()`, `->passwordReset()`, `->profile()`, the colours and the dashboard page; see [Inside a starter kit](starter-kits#the-panel)):

```php
public function panel(Panel $panel): Panel
{
    return $panel
        ->default()
        ->id('admin')
        ->path('admin')
        ->login()
        ->passwordReset()
        ->profile()
        ->colors(['primary' => '#2563eb'])
        ->discoverResources(in: app_path('Alfakit/Resources'), for: 'App\\Alfakit\\Resources')
        ->discoverPages(in: app_path('Alfakit/Pages'), for: 'App\\Alfakit\\Pages')
        ->pages([Dashboard::class])
        ->discoverWidgets(in: app_path('Alfakit/Widgets'), for: 'App\\Alfakit\\Widgets')
        ->middleware(['web'])
        ->databaseNotifications();
}
```

## Signing in

The panel lives at `/admin` with its own login page. If the setup wizard didn't create your user, create one now (in a starter kit, sign in or register with your app's own pages instead, and open the panel's links from the app sidebar):

```bash
php artisan make:alfakit-user
```

## The models

AlfaKit builds on your Eloquent models, so create them first (skip this if your app already has them):

```bash
php artisan make:model Post --migration --factory
php artisan make:model Tag --migration
php artisan make:model Comment --migration
php artisan make:migration create_post_tag_table
```

The migrations (the bodies of their `up()` methods):

```php
// create_posts_table
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->string('slug')->unique();
    $table->longText('content')->nullable();
    $table->string('status')->default('draft');
    $table->foreignId('author_id')->constrained('users');
    $table->dateTime('published_at')->nullable();
    $table->string('cover_image')->nullable();
    $table->boolean('is_featured')->default(false);
    $table->timestamps();
    $table->softDeletes();
});

// create_tags_table
Schema::create('tags', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->timestamps();
});

// create_comments_table
Schema::create('comments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('post_id')->constrained()->cascadeOnDelete();
    $table->text('body');
    $table->timestamps();
});

// create_post_tag_table
Schema::create('post_tag', function (Blueprint $table) {
    $table->foreignId('post_id')->constrained()->cascadeOnDelete();
    $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
    $table->primary(['post_id', 'tag_id']);
});
```

And the `Post` model, with soft deletes and the relationships the form and table below use:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['published_at' => 'datetime', 'is_featured' => 'boolean'];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }
}
```

Add `protected $guarded = [];` to `Tag` and `Comment` too, then run `php artisan migrate`.

## A resource

```bash
php artisan make:alfakit-resource Post --generate --view --soft-deletes
```

`--generate` reads the `posts` table and the model's casts and relationships to write the form fields and table columns. `--soft-deletes` adds the trashed filter and restore actions, so it needs a model that uses Laravel's `SoftDeletes` trait and a table with a `deleted_at` column; leave it out otherwise. For a brand-new model, `make:alfakit-resource Post --model --migration --factory` creates the model, migration and factory with the resource; fill in the migration, run it, then generate again with `--generate --force`.

Open `app/Alfakit/Resources/PostResource.php` and shape the form. The examples use these imports at the top of the file (the generated resource already has some of them):

```php
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Actions\RestoreAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Forms\Components\DateTimePicker;
use AlfaSix\Alfakit\Forms\Components\FileUpload;
use AlfaSix\Alfakit\Forms\Components\RichEditor;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Columns\ToggleColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Filters\TrashedFilter;
use AlfaSix\Alfakit\Tables\Table;
```

```php
public static function form(Schema $schema): Schema
{
    return $schema->components([
        Section::make('Content')->schema([
            TextInput::make('title')->required()->live(onBlur: true)
                ->afterStateUpdated(fn (Set $set, ?string $state) => $set('slug', str($state ?? '')->slug()->toString())),
            TextInput::make('slug')->required()->unique(ignoreRecord: true),
            RichEditor::make('content')->columnSpanFull(),
        ]),
        Section::make('Publishing')->schema([
            Select::make('status')->options(['draft' => 'Draft', 'published' => 'Published'])->required(),
            Select::make('author_id')->relationship('author', 'name')->searchable()->preload()->required(),
            Select::make('tags')->relationship('tags', 'name')->multiple()->preload(),
            DateTimePicker::make('published_at'),
            FileUpload::make('cover_image')->image()->directory('posts'),
        ])->columns(2),
    ]);
}
```

And the table:

```php
public static function table(Table $table): Table
{
    return $table
        ->columns([
            TextColumn::make('title')->searchable()->sortable(),
            TextColumn::make('author.name')->sortable(),
            TextColumn::make('status')->badge()->color(fn (string $state) => $state === 'published' ? 'success' : 'gray'),
            ToggleColumn::make('is_featured'),
            TextColumn::make('published_at')->since()->sortable(),
        ])
        ->filters([
            SelectFilter::make('status')->options(['draft' => 'Draft', 'published' => 'Published']),
            TrashedFilter::make(),
        ])
        ->recordActions([ViewAction::make(), EditAction::make(), DeleteAction::make(), RestoreAction::make()])
        ->bulkActions([DeleteBulkAction::make()])
        ->defaultSort('created_at', 'desc');
}
```

## Comments as a relation manager

```bash
php artisan make:alfakit-relation-manager PostResource comments body --register
```

`--register` adds it to `PostResource::getRelations()` for you. Without it, add the line yourself; the class lives in the resource's own folder, so name it from there (the resource doesn't import `RelationManagers`):

```php
public static function getRelations(): array
{
    return [
        PostResource\RelationManagers\CommentsRelationManager::class,
    ];
}
```

It appears below the form on edit and view pages, with create / edit / delete in modals.

## A dashboard widget

```bash
php artisan make:alfakit-widget BlogStats --type=stats
```

The panel's `->discoverWidgets(...)` picks up every widget in `app/Alfakit/Widgets`, so it shows on the dashboard right away (`/admin`, or your app's own `/dashboard` in a starter kit); register widgets from elsewhere in `->widgets([...])`. The dashboard renders every panel widget in a grid. The generated widget shows three example stats; replace them in `getStats()`.

## Next steps

- [Resources](../resources/overview) for pages, policies and global search
- [Forms](../forms/overview), [Tables](../tables/overview), [Actions](../actions/overview)
- [Custom components](../adapters/custom-components) when the built-in fields are not enough
