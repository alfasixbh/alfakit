---
title: Resources
description: 'CRUD for an Eloquent model: form, table, pages and more.'
---

# Resources

A resource describes how one Eloquent model is managed. Generate one with:

```bash
php artisan make:alfakit-resource Post --generate --view --soft-deletes
```

`--soft-deletes` adds the trashed filter and restore actions, so it needs a model that uses Laravel's `SoftDeletes` trait and a table with a `deleted_at` column; leave it out otherwise.

```php
namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\PostResource\Pages;
use App\Alfakit\Resources\PostResource\RelationManagers;
use App\Models\Post;

class PostResource extends Resource
{
    protected static ?string $model = Post::class;

    protected static ?string $navigationIcon = 'file-text';

    protected static ?string $recordTitleAttribute = 'title';

    public static function form(Schema $schema): Schema { /* fields */ }

    public static function infolist(Schema $schema): Schema { /* read-only entries, optional */ }

    public static function table(Table $table): Table { /* columns, filters, actions */ }

    public static function getRelations(): array
    {
        return [RelationManagers\CommentsRelationManager::class];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPosts::route('/'),
            'create' => Pages\CreatePost::route('/create'),
            'view' => Pages\ViewPost::route('/{record}'),
            'edit' => Pages\EditPost::route('/{record}/edit'),
        ];
    }
}
```

## The resource wizard

`--generate` turns every column into a field and a table column with the wizard's defaults below (casts, enums and relationships included). To choose, run the wizard instead:

```bash
php artisan make:alfakit-resource --wizard   # or: php artisan alfakit:generate
```

It lists your models (`app/Models`), reads the model's table (columns, lengths, nullability, unique indexes, foreign keys), its casts and its relationships (public methods with a `Relation` return type), shows what each column becomes, and asks which columns become form fields, table columns, filters and infolist entries (the defaults are preselected), whether to add soft-delete support (preselected when the model uses `SoftDeletes`) and which `HasMany` / `BelongsToMany` / `MorphMany` relationships get a relation manager.

| Column                         | Form                                                                                                                             | Table                                    | Filter                         | Infolist                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------ | --------------------------- |
| string                         | `TextInput` (`->maxLength()` from the column, `->unique(ignoreRecord: true)` on unique indexes, `->email()` / `->url()` by name) | `TextColumn` searchable                  |                                | `TextEntry`                 |
| text                           | `Textarea` (`RichEditor` for `body` / `content`)                                                                                 | `TextColumn::limit(50)` (off by default) |                                | `TextEntry`                 |
| boolean                        | `Toggle`                                                                                                                         | `IconColumn::boolean()`                  | `TernaryFilter`                | `IconEntry::boolean()`      |
| backed enum cast               | `Select::options(Enum::class)`                                                                                                   | `TextColumn::badge()`                    | `SelectFilter`                 | `TextEntry::badge()`        |
| date / datetime                | `DatePicker` / `DateTimePicker`                                                                                                  | `->date()` / `->dateTime()`              | from / until range (opt-in)    | `->date()` / `->dateTime()` |
| foreign key with a `BelongsTo` | `Select::relationship()->searchable()->preload()`                                                                                | `TextColumn('author.name')`              | `SelectFilter::relationship()` | `TextEntry('author.name')`  |
| json / array cast              | `KeyValue`                                                                                                                       | (off by default)                         |                                | `KeyValueEntry`             |
| integer / decimal              | `TextInput::integer()` / `->numeric()`                                                                                           | `->numeric()`                            |                                | `->numeric()`               |

Literal column defaults become field defaults, so a create form starts with the value the database would store: `->boolean('is_active')->default(true)` gives `Toggle::make('is_active')->default(true)`, `->string('status')->default('draft')` gives `->default('draft')`, and numbers and enum values work the same way. A `false` boolean default adds nothing (the toggle is already off); expression defaults (`useCurrent()`, `CURRENT_TIMESTAMP`, sequences) and the defaults of dates, JSON, relationships and files are left out.

The related model's title column (`name`, `title`, `label`, `email`…) is picked for relationship selects and relation managers. The files are written with the regular generator stubs (published stubs and a bound `ClassGenerator` still apply), with sorted imports, so they pass Pint and PHPStan in a fresh app.

Every choice is also an option, so CI runs the wizard without prompts (`--no-interaction` uses the defaults for anything not given; `none` selects nothing):

```bash
php artisan alfakit:generate Post --form=title,slug,body,author_id --table=title,author_id,published_at \
    --filters=author_id,published_at --infolist=title,body --relation-managers=comments --no-soft-deletes --no-interaction
```

## Model, labels and slugs

| Property / method                   | Default                                                                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `$model`                            | `App\Models\{Name}` derived from the resource class name                                                                                       |
| `$modelLabel` / `$pluralModelLabel` | From the class name: `category` / `categories`                                                                                                 |
| `$slug`                             | English plural of the class name: `categories` (URL segment)                                                                                   |
| `$recordTitleAttribute`             | `null` — used for modal headings, breadcrumbs and global search; without it records are titled by the model label ("Edit Post", "Delete Post") |
| `$recordRouteKeyName`               | model route key                                                                                                                                |

Override `getModelLabel()`, `getRecordTitle($record)` etc. for dynamic values.

### Singular and plural labels

Labels are generated from the model's class name, with correct English plurals:

| Model      | Singular  | Plural     | URL           |
| ---------- | --------- | ---------- | ------------- |
| `Tag`      | tag       | tags       | `/tags`       |
| `Category` | category  | categories | `/categories` |
| `Person`   | person    | people     | `/people`     |
| `Status`   | status    | statuses   | `/statuses`   |
| `BlogPost` | blog post | blog posts | `/blog-posts` |
| `SeoPage`  | SEO page  | SEO pages  | `/seo-pages`  |

They appear in the navigation ("Categories"), page titles ("Create category"), buttons ("New category"), breadcrumbs, empty states, global search and relation managers.

If you set only `$modelLabel`, the plural is derived from it: `'staff member'` becomes "staff members". Set `$pluralModelLabel` too for words the rules get wrong.

Navigation labels, list titles and breadcrumbs capitalise the label (`getTitleCaseModelLabel()`, `getTitleCasePluralModelLabel()`). Keep its case, for labels such as "eBook", with `protected static bool $hasTitleCaseModelLabel = false;`.

**The URL never changes with the label.** The slug and the tenancy relationship name always come from the class name in English, so translating or renaming a label can't break routes.

### Labels in other languages

Add a `models` translation file per language, keyed by the snake-cased class name. Give the singular and plural explicitly, or use the `singular|plural` shorthand:

```php
// lang/ar/models.php
return [
    'category' => ['singular' => 'تصنيف', 'plural' => 'تصنيفات'],
    'blog_post' => 'تدوينة|تدوينات',
];

// lang/de/models.php
return [
    'category' => 'Kategorie|Kategorien',
];
```

Every resource, relation manager and table using that model picks them up. Use a different group with `config('alfakit.model_labels')`. With only a singular, the plural follows the language's own rules for English, French, Spanish, Portuguese, Turkish and Norwegian. Other languages never get a guessed English "s", so the singular is used until you add the plural. An English entry (`lang/en/models.php`) also overrides a plural the rules get wrong.

### Field, column and filter labels

Names become labels the same way everywhere:

| Name                           | Label           |
| ------------------------------ | --------------- |
| `author_id`                    | Author          |
| `cover_image_url`              | Cover image URL |
| `is_featured`                  | Is featured     |
| `author.name` (column, entry)  | Author          |
| `author.email` (column, entry) | Author email    |
| `meta.og_title` (form field)   | Og title        |

Only a trailing `_id` is removed, and common acronyms (ID, URL, SEO, SKU, VAT, …) are capitalised. In forms, dots nest state, so only the last part is used. In tables and infolists they walk relationships. Inside validation messages the label's first letter is lower-cased ("The cover image URL field is required."), except in German, where nouns keep their capital.

## The query

Override `getEloquentQuery()` to apply global constraints (soft deletes, scopes, eager loading). It feeds the table, record resolution and global search:

```php
public static function getEloquentQuery(): Builder
{
    return parent::getEloquentQuery()->withoutGlobalScopes([SoftDeletingScope::class])->with('author');
}
```

## Simple (modal) resources

For small models, use `--simple` to generate a single `ManageX` page where create/edit/delete happen in modals. The generated page reuses `form()` for the modal forms.

## Widgets on resource pages

Any resource page can return widgets from `getHeaderWidgets()` / `getFooterWidgets()`. Record pages inject the record into each widget (`$widget->getRecord()`).

## URLs

```php
PostResource::getUrl();                       // index
PostResource::getUrl('edit', ['record' => $post]);
PostResource::hasPage('view');
```

## Configurable resources

One resource class can be registered several times, each registration with a key and its own options: its own URL, navigation item and, through your code, its own query, labels or behaviour. Create a configuration class with the options you need:

```php
namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Resources\ResourceConfiguration;

class OrderResourceConfiguration extends ResourceConfiguration
{
    protected bool $isArchived = false;

    protected ?string $navigationLabel = null;

    public function archived(bool $condition = true): static
    {
        $this->isArchived = $condition;

        return $this;
    }

    public function isArchived(): bool
    {
        return $this->isArchived;
    }

    public function navigationLabel(string $label): static
    {
        $this->navigationLabel = $label;

        return $this;
    }

    public function getNavigationLabel(): ?string
    {
        return $this->navigationLabel;
    }
}
```

Link it to the resource and read the active registration with `static::getConfiguration()` (null for the plain registration) or `static::hasConfiguration()`:

```php
namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Resources\Resource;
use Illuminate\Database\Eloquent\Builder;

class OrderResource extends Resource
{
    protected static ?string $configurationClass = OrderResourceConfiguration::class;

    public static function getEloquentQuery(): Builder
    {
        $configuration = static::getConfiguration();

        return parent::getEloquentQuery()->where('is_archived', $configuration instanceof OrderResourceConfiguration && $configuration->isArchived());
    }

    public static function getNavigationLabel(): string
    {
        $configuration = static::getConfiguration();

        return $configuration instanceof OrderResourceConfiguration
            ? ($configuration->getNavigationLabel() ?? parent::getNavigationLabel())
            : parent::getNavigationLabel();
    }
}
```

Register configurations with `make($key)`, next to or instead of the plain class:

```php
$panel->resources([
    OrderResource::class,                                                          // /orders
    OrderResource::make('archived')->archived()->navigationLabel('Archived orders'), // /orders/archived
    OrderResource::make('returns')->slug('returns'),                                 // /returns
]);
```

Keys may contain letters, numbers, dashes and underscores and must be unique per resource. Each registration gets its own routes and navigation item. Pages, actions, forms and tables of a registration (including their internal requests) run with its configuration active, and `getUrl()` stays within it; link to another one with `getUrl(configuration: 'archived')`, or run code as another one with `OrderResource::withConfiguration('archived', fn () => …)`.

Configured registrations are not part of `$panel->getResources()` (use `getResourceConfigurations()` or `getResourceRegistrations()`), and global search, clusters and `getModelResource()` only use the plain registration.
