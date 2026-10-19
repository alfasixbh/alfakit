---
title: Quick start
description: Build a blog admin in ten minutes.
---

# Quick start

This walkthrough builds a small blog admin: posts with categories, tags and comments. It assumes you have [installed AlfaKit](installation).

## The panel

`app/Providers/Alfakit/AdminPanelProvider.php` was created by the installer:

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

## A resource

```bash
php artisan make:alfakit-resource Post --generate --view --soft-deletes
```

`--soft-deletes` adds the trashed filter and restore actions, so it needs a model that uses Laravel's `SoftDeletes` trait and a table with a `deleted_at` column; leave it out otherwise.

Open `app/Alfakit/Resources/PostResource.php` and shape the form:

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
php artisan make:alfakit-relation-manager PostResource comments body
```

Register it in `PostResource::getRelations()`. It appears below the form on edit and view pages, with create / edit / delete in modals.

## A dashboard widget

```bash
php artisan make:alfakit-widget BlogStats --type=stats
```

Register the class in `->widgets([...])` on the panel. The dashboard renders every panel widget in a grid.

## Next steps

- [Resources](../resources/overview) for pages, policies and global search
- [Forms](../forms/overview), [Tables](../tables/overview), [Actions](../actions/overview)
- [Custom components](../adapters/custom-components) when the built-in fields are not enough
