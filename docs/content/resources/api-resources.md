---
title: API resources
description: Full resource pages (list, create, edit, view, delete, global search) over a REST API or any other data source, without an Eloquent model.
---

# API resources

An `ApiResource` gives records that don't live in your database the same pages as any resource: a list with search, sorting, filters and pagination, create and edit forms with validation, a view page, delete and bulk delete actions, global search, breadcrumbs and record sub-navigation. The records come from a **data source**: a REST API, a SaaS SDK, a JSON file, an in-memory array.

```bash
php artisan make:alfakit-api-resource Supplier --url=https://erp.example.com/api
```

This writes `SupplierResource`, its four pages and `SupplierResource/SupplierDataSource.php` (an `HttpDataSource` with `--url`, a plain `DataSource` without it). `--panel=` picks the panel, `--force` overwrites.

## The resource

```php
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Resources\ApiResource;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table;

class SupplierResource extends ApiResource
{
    protected static ?string $dataSource = SupplierDataSource::class;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->required(),
            TextInput::make('email')->email()->required(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([TextColumn::make('name')->searchable()->sortable()])
            ->filters([SelectFilter::make('status')->options(['active' => 'Active', 'archived' => 'Archived'])])
            ->recordActions([ViewAction::make(), EditAction::make(), DeleteAction::make()])
            ->bulkActions([DeleteBulkAction::make()]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListSuppliers::route('/'),        // extends ListApiRecords
            'create' => Pages\CreateSupplier::route('/create'), // extends CreateApiRecord
            'view' => Pages\ViewSupplier::route('/{record}'),   // extends ViewApiRecord
            'edit' => Pages\EditSupplier::route('/{record}/edit'), // extends EditApiRecord
        ];
    }
}
```

Everything you know from resources applies: `form()`, `infolist()`, `table()`, navigation properties, labels, `getRecordSubNavigation()`, clusters, `getTabs()` on the list page, header actions. The differences:

- Pages extend `ListApiRecords`, `CreateApiRecord`, `EditApiRecord` and `ViewApiRecord` (in `AlfaSix\Alfakit\Resources\Pages`). The Eloquent pages would ask for a query; `getEloquentQuery()` throws on an `ApiResource` to say so.
- Labels and the slug come from the class name (`SupplierResource` → "supplier", "suppliers", `/suppliers`), as they would from a model called `Supplier`; translate them in the `models` group or override `getModelLabel()` / `getPluralModelLabel()`.
- Saving doesn't use a database transaction or relationship fields: the data source stores the record.

## Records

Data sources deal in plain arrays. Forms, tables, infolists and actions receive each record as an `AlfaSix\Alfakit\Resources\Api\ApiRecord`: an Eloquent model that is never stored in a database, so everything built for models works unchanged (forms fill from it, columns and entries read it, actions get it as `$record`, record URLs use its key, policies receive it). Read it as a model or an array: `$record->name`, `$record['name']`, `$record->toArray()`.

- `$record->save()` sends the changed attributes to the data source's `update()` (or everything to `create()` for a new record) and takes the attributes it returns. `$record->delete()` calls `delete()`. `$record->refresh()` / `fresh()` call `find()`.
- The key comes from `DataSource::getRecordKey()` (the `id` attribute by default; set `$keyName`, or override it for composite keys). URLs, actions and selections use it.
- It runs no queries: relationships, scopes and query builder methods are not available. Closures typed `Model $record` work; so do untyped ones.
- Extend `ApiRecord` for accessors or casts, and point the resource's `$model` at the subclass (`protected static ?string $model = SupplierRecord::class;`). A policy registered for that class then applies.

## Data sources

Extend `AlfaSix\Alfakit\Resources\Api\DataSource` and implement what your pages need:

```php
use AlfaSix\Alfakit\Resources\Api\DataSource;
use AlfaSix\Alfakit\Resources\Api\RecordsQuery;

class SupplierDataSource extends DataSource
{
    public function records(RecordsQuery $query): iterable { /* … */ }      // list pages
    public function find(string $key): ?array { /* … */ }                  // record pages, actions
    public function create(array $data): array { /* … */ }                 // create page
    public function update(string $key, array $data): array { /* … */ }    // edit page, $record->save()
    public function delete(string $key): void { /* … */ }                  // delete actions
    public function search(string $search, int $limit): iterable { /* … */ } // optional: global search
}
```

`records()` receives a `RecordsQuery` with the table's state: `search`, `columnSearches`, `sortColumn`, `sortDirection`, `filters` (each filter's state; `$query->filter('status')` returns its value, `$query->filter('created', 'from')` another key of its state), `page`, `perPage` (`null` when the table shows all), `tab` (the active list tab key), `tenant` and `owner`, plus `offset()`. It can return:

- **The rows** (an array or collection of arrays, objects or models): the table then searches, sorts and pages them in memory, like [`records()`](../tables/records#custom-data) on any table. Fine for a few hundred records.
- **A `LengthAwarePaginator` (or `Paginator`) of rows** when the source pages itself: the table shows it as is. Apply the search, sort and filters in the source.

```php
public function records(RecordsQuery $query): iterable
{
    $response = $this->client->suppliers()->list([
        'q' => $query->search,
        'order' => $query->sortColumn,
        'desc' => $query->isDescending(),
        'status' => $query->filter('status'),
        'offset' => $query->offset(),
        'limit' => $query->perPage,
    ]);

    return new LengthAwarePaginator($response->items, $response->total, $query->perPage ?? 10, $query->page);
}
```

Every value in the query comes from the request: pass it on as a parameter, never into a URL path or a raw query unescaped. Filters' `query()` closures don't run (there is no query): read their state from `$query->filters`.

The methods you don't implement throw a `LogicException`; leave the matching page or action out (no `create` page, no `DeleteAction`) when the source can't do it.

`getRecordTitle(array $record)` can return a title for breadcrumbs, headings and global search; otherwise the resource's `$recordTitleAttribute` is used, then the key.

### REST APIs: `HttpDataSource`

For a typical JSON API, extend `HttpDataSource` and describe the endpoint:

```php
use AlfaSix\Alfakit\Resources\Api\HttpDataSource;
use Illuminate\Http\Client\PendingRequest;

class SupplierDataSource extends HttpDataSource
{
    protected string $endpoint = '/suppliers';

    protected ?string $recordsKey = 'data';      // rows in a list response (null: the body is the list)
    protected ?string $totalKey = 'meta.total';  // total count (null, or missing: the response is the whole list)
    protected ?string $recordKey = 'data';       // record in a single-record response (null: the body)
    protected string $updateMethod = 'patch';    // or 'put'

    protected function getBaseUrl(): string
    {
        return config('services.erp.url');
    }

    protected function request(): PendingRequest
    {
        return parent::request()                  // base URL, JSON, 10 s timeout
            ->withToken(config('services.erp.token'))
            ->withHeaders(['X-Account' => (string) $this->getTenant()?->getKey()]);
    }

    protected function mapRecord(array $row): array      // API row → form/table fields
    {
        return [...$row, 'name' => $row['company_name']];
    }

    protected function mapPayload(array $data): array    // form data → request body
    {
        return [...$data, 'company_name' => $data['name']];
    }
}
```

| Call                  | Request                                                                         |
| --------------------- | ------------------------------------------------------------------------------- |
| `records()`           | `GET {endpoint}?search=…&sort=…&direction=…&page=…&per_page=…&{filter}={value}` |
| `find($key)`          | `GET {endpoint}/{key}`; a 404 means "no record"                                 |
| `create($data)`       | `POST {endpoint}`                                                               |
| `update($key, $data)` | `PATCH {endpoint}/{key}` (`$updateMethod`)                                      |
| `delete($key)`        | `DELETE {endpoint}/{key}`; a 404 counts as deleted                              |

Rename the list parameters with `$parameters` (`['search' => 'q', 'perPage' => 'limit', 'direction' => null]`), or override `listParameters(RecordsQuery $query)`. Keys are URL-encoded into the path. Global search is not enabled by default; add it with `search()`:

```php
public function search(string $search, int $limit): iterable
{
    return $this->records(new RecordsQuery(search: $search, perPage: $limit));
}
```

Calling `records()` like this only narrows the results when `records()` applies `$query->search` itself, as `HttpDataSource` does. A `records()` that returns all its rows for the table to search in memory returns them all here too, so every search would list every record: filter them in `search()` instead:

```php
public function search(string $search, int $limit): iterable
{
    return collect($this->records(new RecordsQuery))
        ->filter(fn (array $row): bool => str_contains(mb_strtolower($row['name']), mb_strtolower($search)))
        ->take($limit);
}
```

## Validation and errors

Form validation (`required()`, `rules()`, …) runs before the data source is called, as on any page. After that:

- An `Illuminate\Http\Client\RequestException` with a **422** response becomes field errors. The default reads `{"message": "…", "errors": {"field": ["…"]}}` (Laravel, Rails); rename API fields with `protected array $errorFields = ['company_name' => 'name'];` or override `validationErrors(Response $response)`. A 422 without field errors shows a generic error notification.
- A `ValidationException` thrown by your data source works the same way: `throw ValidationException::withMessages(['name' => 'Already taken.'])`.
- Any **other failure** (5xx, 401, timeouts, connection errors) becomes a `DataSourceException`: the user sees an error notification ("The data source answered with an error (500)", or "could not be reached") instead of an error page, and the underlying exception is reported to your logs. A failing list shows an empty table; a failing record page returns to the list; a failing save or delete keeps the form or modal open. The API's response body is never shown.
- Throw `new DataSourceException('Suppliers are locked during the stock count.')` yourself for a message of your own. It extends `Halt`, so in an action it stops without closing the modal.

## Authorisation

There is no policy to find, so override the `can*()` methods on the resource. Every check (pages, built-in actions, per-record checks of bulk actions, sub-navigation links) goes through them:

```php
public static function canViewAny(): bool { return auth()->user()->can('suppliers.view'); }
public static function canCreate(): bool { ... }
public static function canEdit(Model $record): bool { return $record['status'] !== 'archived'; }
public static function canView(Model $record): bool { ... }
public static function canDelete(Model $record): bool { ... }
public static function canDeleteAny(): bool { ... }
```

Or point `$policy` at a policy class: its methods receive the user and the `ApiRecord` (`before()` is honoured). Without either, everything is allowed, unless the panel uses `strictAuthorization()`, which denies anything not explicitly allowed.

## Tenancy

The data source sees the current tenant in every call: `$this->getTenant()` (and `$query->tenant` in `records()`). There is no query to scope, so **scope every call yourself** (a tenant header, a tenant-specific base URL or token, a filter parameter). `find()` must not return another tenant's record: keys posted by the browser are resolved through it.

## Caching

Set `protected ?int $cacheSeconds = 60;` (or call `cacheFor(60)`) to cache `records()`, `find()` and `search()` results in Laravel's cache, keyed by the data source, tenant, owner record and arguments. Every write through Alfakit flushes that data source's cache; call `flushCache()` after changing records elsewhere.

## Relation-like sections

`ApiRelationManager` shows records from a data source on the edit and view pages of any resource (an `ApiResource` or an Eloquent one): a supplier's purchase orders from the ERP, a customer's tickets from the help desk. The data source receives the page's record as `getOwnerRecord()` (and `$query->owner`); scope to it, `find()` included.

```php
use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Resources\RelationManagers\ApiRelationManager;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Table;

class PurchaseOrdersRelationManager extends ApiRelationManager
{
    protected static string $dataSource = PurchaseOrderDataSource::class;

    protected static ?string $recordTitleAttribute = 'number';

    public function form(Schema $schema): Schema { /* … */ }

    public function table(Table $table): Table
    {
        return $table
            ->columns([/* … */])
            ->headerActions([CreateAction::make()])
            ->recordActions([EditAction::make(), DeleteAction::make()]);
    }
}
```

List it in the resource's `getRelations()`. Create, edit and view actions open `form()` in a modal and save through the data source. Like other relation managers it is read-only on view pages and when the user may not edit the owner record. The title and labels come from the class name (`PurchaseOrdersRelationManager` → "Purchase orders"); set `$title`, `$modelLabel` and `$pluralModelLabel` to change them, and `$recordClass` for your own `ApiRecord` subclass.

## Example

The demo's **Catalog › Suppliers** is an `ApiResource` over a fake JSON API the demo serves at `/demo-api/suppliers` (bearer token, the store in an `X-Store` header, its own validation including unique names per store). Try creating a supplier named "Grasse Absolutes" to see the API's validation error land on the field.

## Realtime

With [`realtime()`](../panels/realtime), View and Edit pages of API resources show who else is on the record. Joining is authorised with the resource's `canView()` / `canEdit()` (or `$policy`) on the record the data source returns for the channel's key, in the channel's tenant. Changes made in the API aren't pushed, so live tables over an API resource use their fallback polling.

## Not supported

- `ManageRecords`-style simple (modal-only) API resources, singular API resources and nested API resources.
- Relationship fields (`Select::relationship()`, `Repeater::relationship()`), `unique()` / `exists()` rules against the API (validate in the API and return 422), import/export actions, soft deletes (restore / force delete) and table reordering.
- Cursor pagination: return a `LengthAwarePaginator` or `Paginator`.
