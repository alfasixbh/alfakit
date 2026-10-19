---
title: Relation managers
description: Manage related records on edit and view pages.
---

# Relation managers

A relation manager renders a table of related records under the form of an edit or view page, with create, edit and delete in modals.

```bash
php artisan make:alfakit-relation-manager PostResource comments body
```

```php
namespace App\Alfakit\Resources\PostResource\RelationManagers;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Resources\RelationManagers\RelationManager;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;

class CommentsRelationManager extends RelationManager
{
    protected static string $relationship = 'comments';

    protected static ?string $recordTitleAttribute = 'body';

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('author_name')->required(),
            Textarea::make('body')->required()->columnSpanFull(),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([TextColumn::make('author_name'), TextColumn::make('body')->limit(60)])
            ->headerActions([CreateAction::make()])
            ->recordActions([EditAction::make(), DeleteAction::make()])
            ->bulkActions([DeleteBulkAction::make()]);
    }
}
```

Register it in `Resource::getRelations()`. Multiple managers render as tabs, and the open tab is kept in the URL (`?relation=0`, `?relation=1`…) so a reload or a shared link opens it.

### Keys and properties

Key the array to name the tabs in the URL (`?relation=comments`) and to prefix each manager's table query string (`?comments_page=2`). `make([...])` registers a manager with values for its public properties, so one class can serve several tabs:

```php
public static function getRelations(): array
{
    return [
        'comments' => CommentsRelationManager::class,
        'approved' => CommentsRelationManager::make(['status' => 'approved']),
        'pending' => CommentsRelationManager::make(['status' => 'pending']),
    ];
}
```

```php
namespace App\Alfakit\Resources\PostResource\RelationManagers;

use AlfaSix\Alfakit\Resources\RelationManagers\RelationManager;
use AlfaSix\Alfakit\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class CommentsRelationManager extends RelationManager
{
    public ?string $status = null;

    public function table(Table $table): Table
    {
        return $table->modifyQueryUsing(fn (Builder $query) => $this->status ? $query->where('status', $this->status) : $query);
    }
}
```

Passing a property the manager doesn't declare as public throws. A keyed manager's identifier is `relationManager:{class}@{key}`; groups take keys too (`'contacts' => RelationGroup::make(...)`), and their members may be `make([...])` configurations.

## Relation groups

Show several managers under one tab with a `RelationGroup`; they render one after another, each with its own heading.

```php
use AlfaSix\Alfakit\Resources\RelationManagers\RelationGroup;

public static function getRelations(): array
{
    return [
        CommentsRelationManager::class,
        RelationGroup::make('Contacts', [
            PhonesRelationManager::class,
            EmailsRelationManager::class,
        ])->icon('users')->badge(fn (Customer $ownerRecord) => $ownerRecord->phones()->count()),
    ];
}
```

The label, `icon()`, `badge()` and `badgeColor()` accept closures receiving `$ownerRecord`; `badgeColor()` also receives the value as `$badge`. `->deferBadge()` counts the badge in a request after the page has loaded (pass the badge as a closure so the count doesn't run earlier). Managers hidden by `canViewForRecord()` are left out; a group with no visible manager disappears.

## Modal forms

`CreateAction`, `EditAction` and `ViewAction` used inside a relation manager automatically use the manager's `form()`, and `CreateAction` creates records through the relationship (also when you give it its own `->form([...])`; `->using()` replaces that).

## Pivot attributes

On a `BelongsToMany`, fields named after the relationship's `withPivot()` columns belong to the pivot row: `CreateAction` creates the record and attaches it with them, `EditAction` fills them from the pivot and saves them with `updateExistingPivot()`, and `ViewAction` shows them. The pivot's keys and timestamps are never written from the form.

```php
// Post model
public function tags(): BelongsToMany
{
    return $this->belongsToMany(Tag::class)->withPivot(['role', 'position'])->withTimestamps();
}

// TagsRelationManager
public function form(Schema $schema): Schema
{
    return $schema->components([
        TextInput::make('name')->required(), // tags.name
        TextInput::make('role'),             // post_tag.role
    ]);
}

public function table(Table $table): Table
{
    return $table->columns([
        TextColumn::make('name'),
        TextColumn::make('role'),            // or TextColumn::make('pivot.role')
    ]);
}
```

The table selects the related table's columns and the pivot columns apart and loads each row's `pivot`, so a pivot column never overwrites a related column of the same name (such as `id`). Columns read pivot attributes by name (`role`) or through `pivot.role`; sorting and searching on pivot columns are not supported yet.

## Many-to-many and has-many helpers

| Action                 | Relationship        | Behaviour                                                                               |
| ---------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| `AttachAction`         | BelongsToMany       | Select existing records (searchable, `->multiple()`, extra pivot fields via `->form()`) |
| `DetachAction`         | BelongsToMany       | Detach a row                                                                            |
| `AssociateAction`      | HasMany / MorphMany | Associate orphan records                                                                |
| `DissociateAction`     | HasMany / MorphMany | Null the foreign key                                                                    |
| `DetachBulkAction`     | BelongsToMany       | Detach the selected rows                                                                |
| `DissociateBulkAction` | HasMany / MorphMany | Null the foreign key of the selected rows                                               |

Pass `--attach` or `--associate` to the generator to scaffold these.

### Record selects

`AttachAction` and `AssociateAction` offer the records that can be added in a searchable select (records already attached or owned elsewhere are left out, and the tenant applies):

```php
AttachAction::make()
    ->preloadRecordSelect()                                  // options before typing
    ->recordSelectSearchColumns(['name', 'email'])           // default: the record title attribute
    ->recordSelectOptionsQuery(fn (Builder $query) => $query->where('is_active', true))
    ->recordSelect(fn (Select $select) => $select->placeholder('Pick a user'))
    ->form([TextInput::make('role')]);                       // pivot fields after the select
```

`AssociateAction` takes the same `preloadRecordSelect()`, `recordSelectSearchColumns()`, `recordSelectOptionsQuery()` and `recordSelect()`. To lay out the modal yourself, use the public `getRecordSelect()` in `schema()`: `->schema(fn (AttachAction $action): array => [$action->getRecordSelect(), TextInput::make('role')])`.

To pick the records from a full table in a modal (columns, search, filters, sorting, pagination) instead of the searchable select, pass a table configuration to `tableSelect()`: a class with a static `configure(Table $table): Table` method, a resource class (its `table()`), or a closure receiving `$table`:

```php
AttachAction::make()
    ->multiple()
    ->tableSelect(ProductsTable::class)
    ->recordSelectOptionsQuery(fn (Builder $query) => $query->where('is_active', true));
```

The table lists the same records the select would offer: not yet attached (unless `allowDuplicates()`), in the current tenant and narrowed by `recordSelectOptionsQuery()`, and submitted keys are checked against that query. The picker is a [`ModalTableSelect`](../forms/modal-table-select), so `recordSelect(fn (ModalTableSelect $select) => $select->selectAction(…))` customises it.

`AttachAction::allowDuplicates()` (or `protected bool $allowsDuplicates = true;` on the manager, for all its attach actions) also offers records that are already attached, so one record can be attached several times. The pivot table needs its own primary key; row actions such as detach act on every copy of the record.

## Visibility

```php
public static function canViewForRecord(Model $ownerRecord, string $pageClass): bool
{
    return $pageClass === EditPost::class && auth()->user()->can('moderate', $ownerRecord);
}
```

### Read-only on View pages

Relation managers are read-only on View pages and when the user can't update the owner record: create, edit, delete, restore, replicate, attach, detach, associate and dissociate actions are hidden. A manager that points at a [nested resource](nested-resources#linking-from-the-parent) is the exception: its actions open the nested resource's own pages, which check that resource's policies, so it keeps them on View pages too. Let every manager of the panel write on View pages (they stay read-only for users who may not update the record):

```php
$panel->readOnlyRelationManagersOnResourceViewPagesByDefault(false);
```

Or override `isReadOnly()` on one manager:

```php
public function isReadOnly(): bool
{
    return ! auth()->user()->can('manageComments', $this->getOwnerRecord());
}
```

### Different managers per page

A page shows the resource's `getRelations()`. Override `getAllRelationManagers()` on an Edit or View page to show others there:

```php
namespace App\Alfakit\Resources\PostResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\ViewRecord;
use App\Alfakit\Resources\PostResource\RelationManagers\CommentsRelationManager;

class ViewPost extends ViewRecord
{
    public function getAllRelationManagers(): array
    {
        return [CommentsRelationManager::class]; // relation managers and RelationGroups
    }
}
```

### Form and relation managers as tabs

On an Edit or View page, the form (or infolist) can be a tab next to the relation manager tabs instead of sitting above them:

```php
use AlfaSix\Alfakit\Resources\Pages\Enums\ContentTabPosition;

public function hasCombinedRelationManagerTabsWithContent(): bool
{
    return true;
}

public function getContentTabLabel(): ?string
{
    return 'Details'; // default: "Edit" / "View"
}

public function getContentTabIcon(): ?string
{
    return 'file-text';
}

public function getContentTabPosition(): ?ContentTabPosition
{
    return ContentTabPosition::After; // default: Before
}
```

Override `getContentTabComponent(): Tab` instead to build the whole tab (label, icon, badge). To put the content tab between relation manager tabs (or reorder them), override `getCombinedTabComponents()`; the keys are the `getRelations()` keys, with `''` for the content tab:

```php
public function getCombinedTabComponents(): array
{
    return [
        'comments' => $this->getRelationManagerTabComponent('comments'),
        '' => $this->getContentTabComponent(),
        'tags' => $this->getRelationManagerTabComponent('tags'),
    ];
}
```

Only the order counts: tabs that aren't the content tab or a relation manager (a `Tab` with its own schema) are not supported. Tabs left out of the array aren't shown. The form keeps its unsaved changes while another tab is open. A page without visible relation managers shows the form as usual.

### Sharing a form or table with the resource

A relation manager can reuse the resource's `form()` and `table()`. Hide what doesn't belong there with a class name in `hiddenOn()` or `visibleOn()`; it works on fields, layout components, columns and filters:

```php
Select::make('course_id')->relationship('course', 'title')->hiddenOn(RelationManager::class), // the manager already knows the course
TextColumn::make('pivot.role')->visibleOn(RelationManager::class),
```

Class names and operation names can be mixed: `->hiddenOn([RelationManager::class, 'create'])`. A form inside an action is owned by the action's page or relation manager; a table is owned by the page or manager that builds it.

Static `$title`, `$icon` and `$badge` control the tab/heading. Set `$relatedResource` to point prebuilt actions at a resource (for URLs and policies).

## Tab badges

A manager's tab can show a badge, with a colour and a tooltip:

```php
protected static ?string $badge = 'New';

protected static ?string $badgeColor = 'danger';

protected static ?string $badgeTooltip = 'Unanswered comments';

// or computed for the owner record:
public static function getBadge(Model $ownerRecord, string $pageClass): ?string
{
    return (string) $ownerRecord->comments()->whereNull('answered_at')->count();
}
```

`getBadgeColor()` and `getBadgeTooltip()` take the same arguments. The badge is evaluated with the page (lazy managers included). For a badge that runs a slow query, defer it:

```php
protected static bool $isBadgeDeferred = true;
```

The tab renders without a badge and the badge (with its colour and tooltip) arrives in the deferred `alfakitLazy` request, together with lazy managers and widgets. A deferred badge is built from `getTitle()`, `getIcon()` and `getBadge()`, `getBadgeColor()`, `getBadgeTooltip()`; a custom `getTabComponent()` supplies the badge in the deferred request only.

To build the whole tab in one place, override `getTabComponent()` and return a `Tab` with its label, icon, badge and badge colour:

```php
use AlfaSix\Alfakit\Schemas\Components\Tabs\Tab;

public static function getTabComponent(Model $ownerRecord, string $pageClass): Tab
{
    return Tab::make('Comments')
        ->icon('message-circle')
        ->badge($ownerRecord->comments()->count())
        ->badgeColor('warning');
}
```

The default tab is built from `getTitle()`, `getIcon()`, `getBadge()` and `getBadgeColor()`; the badge tooltip still comes from `getBadgeTooltip()`.

## Lazy loading

Relation managers are lazy by default (`protected static bool $isLazy = true;`, read with `static::isLazy()`): the first page response sends only their tab label, icon and badge, the renderer shows a table skeleton in their place, and their tables arrive right after through an Inertia deferred prop (`alfakitLazy`), in one request with the page's lazy widgets. Paging, sorting, searching and filtering reload the page partially and render the manager in place, so they never wait for a second request. Set `$isLazy = false` to render a manager with the page. A page without lazy content makes no extra request.
