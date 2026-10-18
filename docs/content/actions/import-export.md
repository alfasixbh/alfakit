---
title: Import & export
description: CSV imports with column mapping and validation, CSV/XLSX exports of the table, both chunked on the queue.
---

# Import & export

`ImportAction` reads a CSV file, lets the user map its columns to your importer's columns (guessed from the header row), validates every row and saves the valid ones in chunks on the queue. Rows that fail can be downloaded as a CSV. `ExportAction` and `ExportBulkAction` write the table's records, with its filters, search and sort, to CSV and XLSX files in chunks on the queue. The user gets a database notification with the result and signed download links.

## Setup

Both actions store their runs in three tables (`imports`, `exports`, `failed_import_rows`). Publish the migration and run it:

```bash
php artisan alfakit:install --import-export
# or: php artisan vendor:publish --tag=alfakit-import-export-migrations
php artisan migrate
```

The completion notifications are [database notifications](../notifications/overview), so the panel needs `->databaseNotifications()` and a `notifications` table (`php artisan make:notifications-table`).

The rows are processed by queued jobs. Run a worker (`php artisan queue:work`). With the `sync` queue driver the jobs run during the request, and the result appears as a toast right away.

Options in `config/alfakit.php`:

```php
'import_export' => [
    'queue_connection' => env('ALFAKIT_IMPORT_EXPORT_QUEUE_CONNECTION'), // null: the default connection
    'queue' => env('ALFAKIT_IMPORT_EXPORT_QUEUE'),
    'export_disk' => env('ALFAKIT_EXPORT_DISK', 'local'), // keep it private
    'export_directory' => 'alfakit-exports',
    'download_link_lifetime' => 60 * 24 * 7, // minutes
    'max_import_rows' => null,
    'max_export_rows' => null,
],
```

## Importing

Generate an importer. `--generate` reads the model's table and guesses the columns, their casts and their rules:

```bash
php artisan make:alfakit-importer Product --generate
# alias: php artisan alfakit:make-importer Product --generate
```

```php
use AlfaSix\Alfakit\Actions\Imports\ImportColumn;
use AlfaSix\Alfakit\Actions\Imports\Importer;
use App\Models\Product;
use Illuminate\Database\Eloquent\Model;

class ProductImporter extends Importer
{
    protected static ?string $model = Product::class;

    public static function getColumns(): array
    {
        return [
            ImportColumn::make('name')
                ->requiredMapping()
                ->rules(['required', 'max:255']),
            ImportColumn::make('sku')
                ->label('SKU')
                ->requiredMapping()
                ->rules(['required', 'max:32'])
                ->example('SKU-001'),
            ImportColumn::make('price')
                ->numeric(decimalPlaces: 2)
                ->rules(['numeric', 'min:0']),
            ImportColumn::make('category')
                ->relationship(resolveUsing: 'name'),
        ];
    }

    public function resolveRecord(): ?Model
    {
        // Update the product with this SKU, or create a new one.
        return $this->newQuery()->firstOrNew(['sku' => $this->data['sku']]);
    }
}
```

Add the action to a table's header (or a page header):

```php
use AlfaSix\Alfakit\Actions\ImportAction;

$table->headerActions([
    ImportAction::make()->importer(ProductImporter::class),
]);
```

The modal asks for a CSV file. Once it is uploaded, a select per importer column appears, preselected with the matching header. Headers match when they equal the column name, its label or one of its `guess()` values, ignoring case, spaces, dashes and underscores. The modal also links to an example CSV built from `exampleHeader()` and `example()`.

### Columns

| Method                                                  | Effect                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label()`, `helperText()`                               | Text in the mapping form                                                                                                                                                                                                                                                                                            |
| `requiredMapping()`                                     | The user must map a CSV column before importing                                                                                                                                                                                                                                                                     |
| `rules([...])`                                          | Laravel rules for each row's (cast) value                                                                                                                                                                                                                                                                           |
| `validationAttribute('e-mail address')`                 | Name of the column in validation messages ("The e-mail address field is required."); defaults to the label                                                                                                                                                                                                          |
| `guess(['e-mail', 'mail'])`                             | Extra headers that map automatically                                                                                                                                                                                                                                                                                |
| `example('…')`, `examples([...])`, `exampleHeader('…')` | Content of the example CSV                                                                                                                                                                                                                                                                                          |
| `numeric(decimalPlaces: 2)`, `integer()`, `boolean()`   | Cast the text (`boolean()` reads yes/no, true/false, on/off, 1/0); values that can't be cast stay text, so a rule rejects them                                                                                                                                                                                      |
| `array(',')`, `multiple(',')`                           | Split into a list (combine with `integer()` etc. to cast each item)                                                                                                                                                                                                                                                 |
| `enum(Status::class)`                                   | Only accept values of a backed enum (each item of a `multiple()` column); blank cells pass (add `required` to refuse them), int-backed values are cast to integers, and the enum's values are the default examples                                                                                                  |
| `nestedRecursiveRules([...])`                           | Laravel rules for each item of an `array()` / `multiple()` column (`tags.*`), e.g. `['integer', 'exists:tags,id']`                                                                                                                                                                                                  |
| `castStateUsing(fn ($state, $originalState) => …)`      | Your own cast                                                                                                                                                                                                                                                                                                       |
| `ignoreBlankState()`                                    | Don't overwrite the attribute when the cell is empty                                                                                                                                                                                                                                                                |
| `relationship(?string $name, $resolveUsing)`            | Fill a `BelongsTo` or `BelongsToMany`: match the value against the related key, an attribute (`'email'`), several attributes or a closure returning the model; limited to the tenant. A `BelongsToMany` cell holds several values with `multiple(',')` and is synced after the save; an unknown value fails the row |
| `fillRecordUsing(fn (Model $record, $state) => …)`      | Write the value yourself                                                                                                                                                                                                                                                                                            |
| `sensitive()`                                           | Keep the value out of the failed rows (stored in the database and offered for download), e.g. for passwords                                                                                                                                                                                                         |

Every value is trimmed and empty cells become `null` before casting.

### The importer

Each row runs through the importer in a database transaction: the CSV row is remapped to `$this->data` (keyed by column name, `$this->originalData` keeps the raw row), cast, validated, then `resolveRecord()` returns the record to fill (a new model by default; `null` skips the row: nothing is written and the row is not listed as failed), the columns fill it and it is saved (BelongsToMany columns are synced right after). Define any of these methods to hook in: `beforeValidate`, `afterValidate`, `beforeFill`, `afterFill`, `beforeSave`, `beforeCreate`, `beforeUpdate`, `afterCreate`, `afterUpdate`, `afterSave`. A trait can add to a hook with a method named after the hook and the trait, as on pages: `afterSaveSyncsSearchIndex()` in `trait SyncsSearchIndex` runs after the importer's own `afterSave()`.

Throw `AlfaSix\Alfakit\Actions\Imports\Exceptions\RowImportFailedException` to fail a row with your own message. Other properties: `$this->record`, `$this->import` (the `Import` model), `$this->options`, `$this->columnMap`.

Extra fields in the modal come from `getOptionsFormComponents()` and arrive in `$this->options`:

```php
public static function getOptionsFormComponents(): array
{
    return [Toggle::make('updateExisting')->label('Update existing products')];
}

public function resolveRecord(): ?Model
{
    if ($this->options['updateExisting'] ?? false) {
        return $this->newQuery()->firstOrNew(['sku' => $this->data['sku']]);
    }

    return new Product;
}
```

Override `getCompletedNotificationTitle(Import $import)` and `getCompletedNotificationBody(Import $import)` to change the notification text, `modifyCompletedNotification(Notification $notification, Import $import)` to change anything else (icon, actions), `getValidationMessages()` for custom messages, and `getJobConnection()` / `getJobQueue()` to choose the queue.

```php
public static function modifyCompletedNotification(Notification $notification, Import $import): Notification
{
    return $notification->icon('package-check');
}

// Serve the failed rows yourself (another format, extra columns); null keeps the built-in CSV.
public static function getFailedRowsDownloader(): ?callable
{
    return fn (Import $import) => response()->streamDownload(fn () => print(...), 'failed.csv');
}
```

Each chunk job asks the importer for its settings:

| Method               | Default             | Effect                                                                                                          |
| -------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `getJobMiddleware()` | `[]`                | Job middleware (`new WithoutOverlapping(...)`)                                                                  |
| `getJobRetryUntil()` | `null` (no retries) | Retry a failed chunk until then; rows that already ran run again, so find existing records in `resolveRecord()` |
| `getJobBackoff()`    | `null`              | Seconds before a retry, or one delay per attempt                                                                |
| `getJobTags()`       | `["import{id}"]`    | Tags shown by Horizon                                                                                           |
| `getJobBatchName()`  | `null`              | Dispatch the chunks as one named job batch (needs Laravel's `job_batches` table)                                |

### Action options

```php
ImportAction::make()
    ->importer(ProductImporter::class)
    ->maxRows(10_000)          // refuse bigger files (validation error on the file)
    ->maxFileSize(5120)        // kilobytes; default alfakit.uploads.max_size_kb
    ->chunkSize(250)           // rows per job; default 100
    ->csvDelimiter(';')        // detected from the header row when not set
    ->headerOffset(2)          // rows above the header row to skip
    ->fileRules([File::types(['csv'])->max(1024)]) // extra rules for the uploaded file
    ->options(['source' => 'admin'])
    ->job(MyImportCsv::class); // extends AlfaSix\Alfakit\Actions\Imports\Jobs\ImportCsv
```

Files must be UTF-8 (Windows-1252 text is converted) and may start with a byte order mark. The action needs the `create` ability on the importer's model.

## Exporting

```bash
php artisan make:alfakit-exporter Product --generate
# alias: php artisan alfakit:make-exporter Product --generate
```

```php
use AlfaSix\Alfakit\Actions\Exports\ExportColumn;
use AlfaSix\Alfakit\Actions\Exports\Exporter;

class ProductExporter extends Exporter
{
    protected static ?string $model = Product::class;

    public static function getColumns(): array
    {
        return [
            ExportColumn::make('id')->label('ID'),
            ExportColumn::make('name'),
            ExportColumn::make('category.name'),
            ExportColumn::make('tags.name')->label('Tags'), // a list, joined with ", "
            ExportColumn::make('reviews_count')->counts('reviews'),
            ExportColumn::make('price')->formatStateUsing(fn (int $state): string => number_format($state / 100, 2)),
            ExportColumn::make('internal_notes')->enabledByDefault(false),
        ];
    }
}
```

```php
use AlfaSix\Alfakit\Actions\ExportAction;
use AlfaSix\Alfakit\Actions\ExportBulkAction;

$table
    ->headerActions([ExportAction::make()->exporter(ProductExporter::class)])
    ->bulkActions([ExportBulkAction::make()->exporter(ProductExporter::class)]);
```

`ExportAction` exports every record the table shows: its query (including the resource's tenant scope) with the current filters, search and sort. On a page header it uses the page's table; without a table it exports all records of the exporter's model in the current tenant. `ExportBulkAction` exports the selected records ("select all" exports every filtered record). The modal lists the columns to tick; those with `enabledByDefault(false)` start unticked.

### Columns

| Method                                                                          | Effect                                                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `label()`                                                                       | Header in the file                                                                                      |
| `state(fn (Model $record) => …)`                                                | Compute the value                                                                                       |
| `formatStateUsing(fn ($state) => …)`                                            | Format the value (each item of a list)                                                                  |
| `counts('relationship')`                                                        | Number of related records (`withCount`)                                                                 |
| `counts(['reviews' => fn (Builder $query) => $query->where('approved', true)])` | A scoped count                                                                                          |
| `exists('relationship')`                                                        | Whether related records exist (`withExists`), as a boolean                                              |
| `avg('reviews', 'rating')`, `sum()`, `min()`, `max()`                           | Aggregate of a related column (`withAvg`, …); the column may be a `DB::raw()` expression                |
| `hidden(fn () => ! auth()->user()->isAdmin())`, `visible()`                     | Leave the column out entirely: not offered in the modal and never written, even if the request names it |
| `prefix()`, `suffix()`, `limit()`, `words()`                                    | Text helpers                                                                                            |
| `listAsJson()`, `listSeparator(' / ')`                                          | How lists (to-many relationships, array casts) are written                                              |
| `enabledByDefault(false)`                                                       | Unticked in the modal                                                                                   |

Users can rename the header of each ticked column in the modal (**Column labels**); an empty label keeps the column's own.

Relationships of the selected columns are eager loaded. Dates are written as `Y-m-d H:i:s` in the panel's timezone; enums as their value.

### Action options

```php
ExportAction::make()
    ->exporter(ProductExporter::class)
    ->formats([ExportFormat::Csv])        // default: CSV and XLSX
    ->columnMapping(false)                // no column selection: export the default columns
    ->columnMappingColumns(3)             // grid columns of the column selection
    ->enableVisibleTableColumnsByDefault() // tick only the columns the table shows right now
    ->fileName(fn (Export $export): string => "products-{$export->getKey()}")
    ->fileDisk('s3-private')
    ->chunkSize(500)
    ->maxRows(50_000)                     // refuse bigger exports with a notification
    ->modifyQueryUsing(fn (Builder $query) => $query->where('is_active', true)) // ExportAction only
    ->job(MyExportCsv::class);            // extends AlfaSix\Alfakit\Actions\Exports\Jobs\ExportCsv
```

On the exporter, `getFormats()`, `getFileName(Export $export)`, `getCsvDelimiter()`, `modifyQuery(Builder $query)` (for each chunk's query, e.g. extra eager loads), `getOptionsFormComponents()`, `getCompletedNotificationTitle(Export $export)`, `getCompletedNotificationBody(Export $export)`, `modifyCompletedNotification(Notification $notification, Export $export)`, `getJobConnection()` / `getJobQueue()` and the job settings of the importer (`getJobMiddleware()`, `getJobRetryUntil()`, `getJobBackoff()`, `getJobTags()` (default `["export{id}"]`), `getJobBatchName()`) can be overridden. The action needs the `viewAny` ability on the exporter's model. XLSX files need the PHP `zip` extension; without it only CSV is written.

### Custom downloads

`getDownloader(ExportFormat $format)` returns a callable that serves a format's file itself (it receives the `Export` and the format and returns a response), or null for the built-in download. The signed link and the owner check run first.

```php
public static function getDownloader(ExportFormat $format): ?callable
{
    return $format === ExportFormat::Csv ? app(ZippedCsvDownloader::class) : null;
}
```

### Styling XLSX files

AlfaKit writes XLSX files with its own small writer; styles are `AlfaSix\Alfakit\Actions\Exports\Writers\XlsxStyle` objects with OpenSpout-like setters (`setFontBold()`, `setFontItalic()`, `setFontUnderline()`, `setFontSize()`, `setFontName()`, `setFontColor('#1D4ED8')`, `setBackgroundColor()`, `setCellAlignment('center')`, `setShouldWrapText()`, `setFormat('#,##0.00')`).

```php
public function getXlsxCellStyle(): ?XlsxStyle
{
    return (new XlsxStyle)->setFontSize(12)->setFontName('Consolas');
}

public function getXlsxHeaderCellStyle(): ?XlsxStyle   // bold by default
{
    return (new XlsxStyle)->setFontBold()->setBackgroundColor('#F3F4F6');
}

// One style per column: return cells with their own style.
public function makeXlsxRow(array $values, ?XlsxStyle $style = null): XlsxRow
{
    $cells = [];

    foreach (array_keys($this->columnMap) as $index => $column) {
        $cells[] = XlsxCell::fromValue($values[$index], $column === 'price' ? (new XlsxStyle)->setFormat('#,##0.00') : null);
    }

    return XlsxRow::fromCells($cells, $style);
}

public function configureXlsxWriterBeforeClose(XlsxWriter $writer): XlsxWriter
{
    return $writer->setSheetName('Products')->freezeRows(1)->setColumnWidth(40, 2);
}
```

`configureXlsxWriterAfterOpen(XlsxWriter $writer)` runs before the header row (add a title row with `$writer->addRow([...])`), and `makeXlsxHeaderRow(array $values, ?XlsxStyle $style)` builds the header row.

## Security

- The CSV goes through the regular [upload endpoint](../advanced/security#uploads): its type is detected on the server, only `.csv`, `.txt` and `.tsv` are accepted, and only the uploader can use it. It is deleted once its rows are read.
- Only headers of the uploaded file can be mapped. Every row is validated with the column rules on the server.
- Imports and exports remember the user, panel and tenant they started in; the queued jobs restore that tenant. New records are associated with the tenant, `relationship()` columns only find related records of the tenant, and an existing record outside the tenant (or one the user may not `update` according to its policy) fails the row instead of being changed.
- Exports collect the record keys from the table's authorised, tenant-scoped query when the user starts them; the jobs only read those records.
- Download links (export files, failed rows, example CSV) are signed and expire after `download_link_lifetime` minutes, run the panel's auth middleware, and are only served to the user who started the run.
- Text cells starting with `=`, `+`, `-`, `@`, tab or carriage return get a leading `'` in CSV files (exports, failed rows and example CSVs) so spreadsheet apps don't run them as formulas. This is always on: Filament's opt-in `ExportColumn::preventFormulaInjection()`, `Importer::preventFormulaInjection()` and `protected static bool $shouldPreventFormulaInjection` are accepted for compatibility and change nothing.

## Testing

**Importers on single rows.** `Importer::test()` runs one row at a time, without a file, queue or `Import` record (Filament's helper):

```php
ProductImporter::test()
    ->import(['name' => 'Mug', 'sku' => 'M-1', 'price' => '9.5'])
    ->assertImported()
    ->assertHasNoErrors();

ProductImporter::test()->import(['name' => '', 'price' => 'x'])
    ->assertHasErrors(['name' => ['required'], 'price' => ['numeric']]);

ProductImporter::test(options: ['updateExisting' => true])->import([...])->assertSkipped(); // resolveRecord() returned null
ProductImporter::test()->import([...])->assertHasRowFailure('This SKU is discontinued.');   // RowImportFailedException
```

Rows are keyed by CSV header. Without `columnMap:` each column reads the header of its own name; an explicit map (`['name' => 'Product name']`) replaces that. `import:` takes your own `Import`; `getRecord()` returns the imported record. `assertHasErrors()` / `assertHasNoErrors()` take nothing, a list of fields, or fields with rule names without parameters.

**Exporters on single records.** `Exporter::test()->export($record)` returns the row as written, in column-map order:

```php
expect(ProductExporter::test(['name' => 'Name', 'sku' => 'SKU'])->export($product))->toBe(['Mug', 'M-1']);
```

Without a column map the columns enabled by default are exported; `headers()` returns the header row.

**Faking the actions.** `ImportAction::fake()`, `ExportAction::fake()` and `ExportBulkAction::fake()` record the runs the actions start instead of running their jobs (the `Import` / `Export` row is still created):

```php
$imports = ImportAction::fake();

// ... run the action (a PageTester `callTableAction('import', data: [...])`, or a raw request) ...

$imports->assertDispatched(ProductImporter::class, fn (Import $import, array $columnMap, array $options): bool => $columnMap['sku'] === 'SKU')
    ->assertDispatchedTimes(ProductImporter::class)
    ->assertNotDispatched(OrderImporter::class);

$exports = ExportAction::fake();
// ...
$exports->assertDispatched(ProductExporter::class, function (Export $export, Builder $query, array $columnMap, array $options, array $formats, ?array $records): bool {
    return $records === [$product->getKey()];
});
```

`assertNothingDispatched()` checks that no run started (e.g. after a validation error). For exports, `$query` is a fresh query over the exporter's model and `$records` are the keys of the exported records in export order: AlfaKit resolves the selection when every export starts, bulk or not.

**End to end.** Use the `sync` queue (`config(['queue.default' => 'sync'])`) to run the jobs inline, upload the file through `/{panel}/_alfakit/uploads`, then post the action with the mapping:

```php
$key = $this->post('/admin/_alfakit/uploads', ['file' => UploadedFile::fake()->createWithContent('products.csv', "Name,SKU\nMug,M-1\n")])->json('key');

$this->post('/admin/_alfakit/actions', [
    'token' => $token, // from the list page's props
    'component' => 'table',
    'action' => 'import',
    'data' => ['file' => [$key], 'columnMap' => ['name' => 'Name', 'sku' => 'SKU']],
], ['X-Inertia' => 'true']);

expect(Import::query()->sole()->successful_rows)->toBe(1);
```

The models are `AlfaSix\Alfakit\Actions\Imports\Models\Import`, `…\Imports\Models\FailedImportRow` and `AlfaSix\Alfakit\Actions\Exports\Models\Export`.
