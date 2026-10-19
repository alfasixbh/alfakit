---
title: Tables outside panels
description: 'Standalone tables: parameters, query string state, search, sort, filters, record and bulk actions, inline edits.'
---

# Tables outside panels

```bash
php artisan make:alfakit-table OrdersTable --model=Order
```

A standalone table extends `AlfaSix\Alfakit\Standalone\Table` and defines `table(Table $table)` exactly like a [resource table](../tables/overview): columns, filters, grouping, summaries, record and bulk actions, inline edits (`ToggleColumn`, `SelectColumn`, `TextInputColumn`), reordering, column toggles, pagination modes, `deferLoading()` and `poll()`.

```php
namespace App\Alfakit\Standalone;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\BulkAction;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Enums\OrderStatus;
use App\Jobs\Export;
use App\Models\Customer;
use App\Models\Order;
use Illuminate\Database\Eloquent\Collection;

class OrdersTable extends \AlfaSix\Alfakit\Standalone\Table
{
    public Customer $customer;

    public function table(Table $table): Table
    {
        return $table
            ->query($this->customer->orders()->getQuery())
            ->columns([
                TextColumn::make('number')->searchable()->sortable(),
                TextColumn::make('total')->money('USD', inMinorUnits: true)->sortable(),
                TextColumn::make('status')->badge(),
                TextColumn::make('created_at')->since()->sortable(),
            ])
            ->filters([SelectFilter::make('status')->options(OrderStatus::class)])
            ->recordActions([
                Action::make('cancel')
                    ->requiresConfirmation()
                    ->visible(fn (Order $record): bool => $record->isCancellable())
                    ->action(fn (Order $record) => $record->cancel()),
            ])
            ->bulkActions([
                BulkAction::make('export')->action(fn (Collection $records) => Export::dispatch($records)),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
```

## Parameters

`make()` takes named parameters. Each one is assigned to a **public property of the same name** and passed to `mount()`; models are stored in the context token by route key and resolved again (through the property's type) on every internal request:

```php
Route::get('/account/orders', fn (Request $request) => Inertia::render('Account/Orders', [
    'orders' => OrdersTable::make(['customer' => $request->user()->customer]),
]));
```

Because the property is typed `Customer`, a token can only ever resolve a `Customer`. Enums and scalars are passed as they are. `record` and `tenant` are reserved: `record` binds a record (see [Forms](forms)), `tenant` sets the tenant for every internal request of the component (`->tenant($team)`).

Need more than property assignment? Override `mount()`:

```php
public function mount(mixed ...$parameters): void
{
    $this->customer = $parameters['customer'];
    $this->currency = $this->customer->currency;
}
```

## State in the URL

Sort, search, filters, grouping and pagination live in the **host page's query string** (`/account/orders?sort=total&direction=desc&search=inv`), as on a panel page. The renderer navigates to the new URL with an Inertia partial reload of the prop that holds the table, so your controller just builds the same `make()` call again; nothing else changes. Use `->queryStringIdentifier('orders')` when a page shows several tables.

Everything that posts (actions, inline edits, reordering) sends the query string along, so a bulk action with "select all" sees the same records the user sees.

## Actions

Record actions, bulk actions and header actions work as in panels, including modals with forms, confirmation, `rateLimit()`, `requiresPasswordConfirmation()` and `authorizeIndividualRecords()`. Records are always found through the table's own query, so a user cannot act on a record the table would not list. After an action the page reloads in place and the notification shows as a toast.

## Several components on one page

Pass as many payloads as you like; each `<AlfakitComponent>` has its own token, modals and action runner, and a page can mix a form and a table freely:

```php
return Inertia::render('Account/Orders', [
    'orders' => OrdersTable::make(['customer' => $customer]),
    'address' => AddressForm::make(['record' => $customer->address]),
]);
```
