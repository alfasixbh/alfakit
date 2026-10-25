---
title: Resource pages
description: Customising list, create, edit and view pages.
---

# Resource pages

Every resource page extends a base class in `AlfaSix\Alfakit\Resources\Pages` and can be customised with hooks.

## ListRecords

```php
namespace App\Alfakit\Resources\PostResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\PostResource;

class ListPosts extends ListRecords
{
    protected static string $resource = PostResource::class;

    protected function getHeaderActions(): array
    {
        return [CreateAction::make()];
    }

    public function table(Table $table): Table
    {
        return parent::table($table)->defaultSort('created_at', 'desc');
    }
}
```

Rows link to the edit page when the user may update the record, otherwise to the view page. Override `getTableRecordUrl()` to change that, or set `->recordUrl(null)` to disable row links.

### Tabs

`getTabs()` adds tabs above the table, each narrowing its query. The keys are the values of `?activeTab=` in the URL; an unknown or hidden key shows the default tab (the first one, or `getDefaultActiveTab()`). Filters, search and sort are kept when switching tabs, and "select all" bulk actions only see the records of the active tab.

The example uses the `status` column of the [Quick start](../getting-started/quick-start)'s `Post`:

```php
use AlfaSix\Alfakit\Schemas\Components\Tabs\Tab;
use App\Models\Post;
use Illuminate\Database\Eloquent\Builder;

public function getTabs(): array
{
    return [
        'all' => Tab::make('All'),
        'published' => Tab::make('Published')
            ->icon('circle-check')
            ->badge(fn () => Post::query()->where('status', 'published')->count())
            ->badgeColor('success')
            ->modifyQueryUsing(fn (Builder $query) => $query->where('status', 'published')),
        'drafts' => Tab::make()->modifyQueryUsing(fn (Builder $query) => $query->where('status', 'draft')),
    ];
}

public function getDefaultActiveTab(): string|int|null
{
    return 'published';
}
```

A tab without a label is labelled from its key. `->hidden()` / `->visible()` remove a tab (and make its key unusable in the URL).

| Tab option                            | Effect                                                                                                                                                                                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `->excludeQueryWhenResolvingRecord()` | Record actions and inline edits find their record without the tab's query, so an action whose modal is open while the record leaves the tab (another user publishes a draft on the Drafts tab) still runs. The table itself still lists only the tab's records. |
| `->deferBadge()`                      | The badge is counted in a deferred request after the page loaded (a placeholder shows meanwhile), so a slow count doesn't hold up the page.                                                                                                                     |
| `->extraAttributes([...])`            | HTML attributes on the tab button; `class` is merged with the tab's own classes.                                                                                                                                                                                |

### Around the table

Three ways to put things above or below a list page's table:

- **Tabs** (`getTabs()`, above) sit directly above it.
- **Widgets:** `getHeaderWidgets()` and `getFooterWidgets()` return [widgets](../widgets/overview) (stats, charts, tables) shown above and below the table.
- **Any schema component:** `content()` takes callouts, text, sections, grids, infolist entries or a form. Place the table with `EmbeddedTable`; without the marker, the components go above it.

```php
use AlfaSix\Alfakit\Schemas\Components\{Callout, EmbeddedTable, Text};
use AlfaSix\Alfakit\Schemas\Schema;

public function content(Schema $schema): Schema
{
    return $schema->components([
        Callout::make()->info()->heading(__('Prices include VAT')),
        EmbeddedTable::make(),
        Text::make(__('Stock levels refresh every five minutes.')),
    ]);
}
```

Only a top-level `EmbeddedTable` is recognised (`$this->getTableContentComponent()` returns one). For content in specific places of the layout (the page header, the table toolbar), use [slots](../design/slots) such as `Slot::PAGE_HEADER_AFTER` and `Slot::TABLE_TOOLBAR_START`.

### Opening an action from a URL

A link can open a table action's modal when the list page loads, e.g. "edit record 5" on a [simple (modal) resource](overview), or from a notification:

```php
PostResource::getUrl('index', ['tableAction' => 'edit', 'tableActionRecord' => $post->getKey()]);
// optional: 'tableActionArguments' => ['step' => 2]
```

Any page opens its own action with `protected ?string $defaultAction = 'onboarding';` (plus `$defaultActionArguments` and `$defaultActionContext`, e.g. `['table' => true, 'recordKey' => 5]`), or with `?defaultAction=onboarding&defaultActionArguments[step]=2`; override `getDefaultAction()` for a computed one. Filament's keys work too: `?action=onboarding&actionArguments[step]=2` (with `actionComponent=page` or without it; a link naming another component opens nothing). The renderer opens the modal once the page has hydrated and removes those keys from the URL.

Only actions with a modal (a form, a confirmation, a wizard) are opened this way; an action that would run right away, a link, an unknown or hidden action, and a record outside the table's (tenant-scoped) query are ignored, so a link someone sends can never change data on its own. The modal itself is loaded through the action endpoint, with the usual visibility and authorisation checks.

## Page content

`content()` works on Create, Edit and View pages too, like Filament. Place the page's own blocks with markers and put any schema components around them:

```php
public function content(Schema $schema): Schema
{
    return $schema->components([
        Callout::make()->warning()->heading(__('This order is locked')),
        $this->getFormContentComponent(),             // Create, Edit; View without an infolist
        $this->getRelationManagersContentComponent(), // Edit, View
    ]);
}
```

`getInfolistContentComponent()` places a View page's infolist. Content without any marker goes above the page's usual blocks; once you use markers, a block without one (say, the relation managers) is left out. Only top-level markers are recognised. The markers are `EmbeddedSchema::make('form' | 'infolist')` and `EmbeddedRelationManagers::make()` (and `EmbeddedTable::make()` on list pages).

## CreateRecord

| Hook                                                         | Purpose                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `mutateFormDataBeforeCreate(array $data): array`             | Change validated data before saving                                             |
| `handleRecordCreation(array $data): Model`                   | Replace the default `Model::create()`                                           |
| `beforeFill()` / `afterFill()`                               | When the page loads, around filling the form with defaults                      |
| `beforeValidate()` / `afterValidate()`                       | On submit, around validation                                                    |
| `beforeCreate()` / `afterCreate()`                           | Side effects                                                                    |
| `getCreatedNotificationTitle()` / `getCreatedNotification()` | Toast (return `null` to disable)                                                |
| `getRedirectUrl()`                                           | Defaults to view → edit → index (or the panel's `resourceCreatePageRedirect()`) |
| `canCreateAnother()`                                         | Show the "Create & create another" button                                       |
| `preserveFormDataWhenCreatingAnother(array $data): array`    | Values "Create & create another" keeps in the fresh form                        |

Relationships (`Select::relationship()->multiple()`, `Repeater::relationship()`, `CheckboxList::relationship()`) are saved after the record exists, inside the same database transaction.

"Create & create another" starts from an empty form; keep some values with:

```php
use Illuminate\Support\Arr;

protected function preserveFormDataWhenCreatingAnother(array $data): array
{
    return Arr::only($data, ['category_id', 'is_published']);
}
```

### Wizard create pages

The `HasWizard` trait turns the form into a wizard. Each "Next" validates its step on the server; the form buttons (create, create another, cancel) show on the last step only.

```php
use AlfaSix\Alfakit\Resources\Pages\CreateRecord;
use AlfaSix\Alfakit\Resources\Pages\CreateRecord\Concerns\HasWizard;
use AlfaSix\Alfakit\Schemas\Components\Wizard\Step;

class CreateOrder extends CreateRecord
{
    use HasWizard;

    protected static string $resource = OrderResource::class;

    protected function getSteps(): array
    {
        return [
            Step::make('Customer')->schema([/* ... */]),
            Step::make('Items')->schema([/* ... */]),
        ];
    }

    public function hasSkippableSteps(): bool
    {
        return false; // true lets users jump to any step
    }

    public function getStartStep(): int
    {
        return 1;
    }
}
```

### Header submit buttons

`formId('form')` makes any action submit the page form with its current state (and show its errors and processing state), for example a "Save" in the page header:

```php
protected function getHeaderActions(): array
{
    return [$this->getSaveFormAction()->formId('form'), DeleteAction::make()];
}

protected function getFormActions(): array
{
    return []; // no buttons under the form
}
```

On create pages use `$this->getCreateFormAction()->formId('form')`.

## EditRecord

| Hook                                                    | Purpose                                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `mutateFormDataBeforeFill(array $data): array`          | Change record data before it enters the form                            |
| `mutateFormDataBeforeSave(array $data): array`          | Change validated data before saving                                     |
| `handleRecordUpdate(Model $record, array $data): Model` | Replace the default `fill()->save()`                                    |
| `beforeFill()` / `afterFill()`                          | When the page loads, around filling the form from the record            |
| `beforeValidate()` / `afterValidate()`                  | On submit, around validation                                            |
| `beforeSave()` / `afterSave()`                          | Side effects                                                            |
| `getSavedNotificationTitle()`                           | Toast                                                                   |
| `getRedirectUrl()`                                      | Defaults to the same page (or the panel's `resourceEditPageRedirect()`) |

Header actions typically include `ViewAction`, `DeleteAction`, `RestoreAction` and `ForceDeleteAction`; they redirect to the index after deleting.

Attributes in the model's `$hidden` (a password, an API token) never reach the browser, so their fields load blank. Saving with such a field left blank keeps the stored value; typing a value replaces it. Override `keepHiddenAttributesLeftBlank(array $data): array` to change this.

### Refreshing form data

After an action changed the record, copy some of its attributes into the form without touching the fields the user is editing:

```php
Action::make('approve')->action(function (): void {
    $this->record->update(['status' => 'approved']);
    $this->refreshFormData(['status']);
}),
```

The values are read from `$this->record` (call `$this->record->refresh()` first if it was changed elsewhere). `refreshFormData()` also works on View pages that show the disabled form.

### Saving one section

`saveFormComponentOnly()` validates and saves only the fields of one component (given as the component or its key), leaving other unsaved edits in the form. Send the form's state with `formId('form')`:

```php
Section::make('Shipping')->key('shipping')->schema([/* ... */])->footerActions([
    Action::make('saveShipping')
        ->label(__('Save shipping'))
        ->formId('form')
        ->action(function (EditRecord $page): void {
            $page->saveFormComponentOnly('shipping');

            Notification::make()->success()->title(__('Saved'))->send();
        }),
]),
```

It runs `handleRecordUpdate()` and saves the component's relationships, but not the page's save hooks.

### Redirects for every resource

Instead of overriding `getRedirectUrl()` on each page, set the panel default:

```php
$panel
    ->resourceCreatePageRedirect('index') // 'index', 'view' or 'edit'
    ->resourceEditPageRedirect('view');
```

A target the resource has no page for, or the user may not open for the record, falls back to the page's default. A page's own `getRedirectUrl()` still wins.

## Lifecycle hooks

On submit the hooks run in this order: `beforeValidate()` → validation → `afterValidate()` → `beforeCreate()` / `beforeSave()` (with the validated `$data`) → `mutateFormDataBeforeCreate()` / `mutateFormDataBeforeSave()` → create or update → `afterCreate()` / `afterSave()`. If validation fails, nothing after it runs. `beforeFill()` / `afterFill()` run once when the page loads (on `CreateRecord`, `EditRecord`, and `ViewRecord` when it shows the disabled form instead of an infolist); action and reactive-form requests rebuild the form without them.

**Hooks in traits.** As in Filament, a trait can add to any hook with a method named after the hook and the trait: `afterSaveHasAuditLog()` in `trait HasAuditLog` runs after the page's own `afterSave()`. This works for every hook above.

```php
trait HasAuditLog
{
    protected function afterSaveHasAuditLog(): void
    {
        activity()->performedOn($this->getRecord())->log('updated');
    }
}
```

**Halting.** Call `$this->halt()` in a hook to stop without saving and without an error. The form stays as filled in, and any notification you sent is shown:

```php
protected function beforeCreate(array $data): void
{
    if (! auth()->user()->team->subscribed()) {
        Notification::make()->warning()->title('Upgrade to add more records')->send();

        $this->halt();
    }
}
```

In a wizard, throwing `AlfaSix\Alfakit\Actions\Exceptions\Halt` from a step's `beforeValidation()` / `afterValidation()` keeps the wizard on that step and shows the notifications the hook sent.

**Database transactions.** `protected ?bool $hasDatabaseTransactions = true;` on a page runs its actions, form saves included, in a database transaction, so an exception or `halt()` rolls back everything they wrote. `false` turns the panel's `databaseTransactions()` off for the page, and `null` (default) follows the panel. An action's own `databaseTransaction()` wins. Works on every page, custom pages included (their `#[Expose]` methods follow the panel or `#[Expose(transaction: …)]`).

## ViewRecord

Renders the resource `infolist()` when defined, otherwise the form in a disabled state. Add `EditAction::make()` to `getHeaderActions()`.

## ManageRelatedRecords

A full page for one relationship of a record, as an alternative to a relation manager under the form. It behaves like a relation manager: `CreateAction` creates through the relationship, `AttachAction` / `DetachAction` / `AssociateAction` / `DissociateAction` (and their bulk variants) work, every action that changes data is hidden when the user can't update the owner record, and the table only ever contains the owner's related records. Generate one with `php artisan make:alfakit-related-records-page PostResource comments body` (`--attach`, `--associate` add the pivot actions).

```php
use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Resources\Pages\ManageRelatedRecords;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;

class ManagePostComments extends ManageRelatedRecords
{
    protected static string $resource = PostResource::class;

    protected static string $relationship = 'comments';

    protected static ?string $relatedResource = CommentResource::class; // optional: URLs and policies

    public function form(Schema $schema): Schema
    {
        return $schema->components([TextInput::make('body')->required()]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([TextColumn::make('body')])
            ->headerActions([CreateAction::make()])
            ->recordActions([EditAction::make(), DeleteAction::make()]);
    }
}
```

Register it with a `{record}` segment: `'comments' => Pages\ManagePostComments::route('/{record}/comments')`, and link to it from the edit page (a header action with `->url()`, or record sub-navigation). Opening the page needs `view` or `update` on the owner record. Optional static properties: `$relatedRecordTitleAttribute`, `$relatedModelLabel`, `$relatedPluralModelLabel`, `$title`.

## Singular resources

A resource that manages one record (site settings, the current team's profile) uses `ManageSingularRecord` as its only page. It edits the first record of the resource's (tenant-scoped) query and creates it on the first save; the URL never names a record.

```php
use AlfaSix\Alfakit\Resources\Pages\ManageSingularRecord;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Schema;

class SettingsResource extends Resource
{
    protected static ?string $model = Setting::class;

    protected static ?string $navigationLabel = 'Settings';

    public static function form(Schema $schema): Schema { /* … */ }

    public static function getPages(): array
    {
        return ['index' => Pages\ManageSettings::route('/')];
    }
}

class ManageSettings extends ManageSingularRecord
{
    protected static string $resource = SettingsResource::class;

    // Optional: choose the record differently.
    protected function resolveSingularRecord(): Model
    {
        return Setting::query()->firstOrNew(['team_id' => alfakit()->getTenant()?->getKey()]);
    }
}
```

Saving needs `update` on an existing record and `create` on a new one; new records are owned by the current tenant. Generate one with `php artisan make:alfakit-resource Setting --singular`. All `EditRecord` hooks (`mutateFormDataBeforeSave()`, `afterSave()`, relation managers) apply.

## Breadcrumbs, titles and headings

Override `getTitle()`, `getHeading()`, `getSubheading()`, `getBreadcrumbs()` on any page. With the panel's `breadcrumbs(hasNavigationHierarchy: true)` the trail starts with the navigation group and the parent item of the page's navigation item.

## Header and footer widgets

`getHeaderWidgets()` / `getFooterWidgets()` return widget classes (or `Widget::make([...])` instances). `getHeaderWidgetsColumns()` / `getFooterWidgetsColumns()` set their grid: a number of columns (default 2), or a breakpoint map:

```php
public function getHeaderWidgetsColumns(): int|array
{
    return ['md' => 2, 'xl' => 4];
}
```

## Custom resource pages

```bash
php artisan make:alfakit-page Reports --resource=PostResource
```

Then register it in `getPages()`: `'reports' => Pages\Reports::route('/reports')`. Resource pages implement `HasResource`, so prebuilt actions resolve URLs and policies through the resource.
