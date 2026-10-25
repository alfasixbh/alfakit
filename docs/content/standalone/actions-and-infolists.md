---
title: Actions and infolists outside panels
description: Buttons with modals next to a detail view, and headless components that mix a form, a table, content and widgets.
---

# Actions and infolists outside panels

## Infolists

```bash
php artisan make:alfakit-infolist OrderDetails --model=Order
```

An infolist extends `AlfaSix\Alfakit\Standalone\Infolist`, reads the record you bind, and can carry [actions](../actions/overview):

```php
namespace App\Alfakit\Standalone;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Infolists\Components\RepeatableEntry;
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Models\Order;

class OrderDetails extends \AlfaSix\Alfakit\Standalone\Infolist
{
    public function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Order')->schema([
                TextEntry::make('number'),
                TextEntry::make('status')->badge(),
                TextEntry::make('total')->money('USD', inMinorUnits: true),
                TextEntry::make('placed_at')->dateTime(),
            ])->columns(2),
            RepeatableEntry::make('lines')->schema([
                TextEntry::make('product.name'),
                TextEntry::make('quantity'),
            ]),
        ]);
    }

    public function actions(): array
    {
        return [
            Action::make('reorder')->icon('repeat')->action(fn (Order $record) => $record->reorder()),
            Action::make('cancel')
                ->color('danger')
                ->requiresConfirmation()
                ->visible(fn (Order $record): bool => $record->isCancellable())
                ->action(fn (Order $record) => $record->cancel()),
        ];
    }
}
```

```php
// Controller
'details' => OrderDetails::make(['record' => $order]),
```

Render each prop with `<AlfakitComponent component={details} />` as in the [overview](overview#five-minute-example). The examples on this page use your own models: an `Order` with a `lines` relationship (each line `belongsTo` a `product`), `reorder()`, `isCancellable()` and `cancel()` (see [Tables](tables)); a `Team` with `members()` and `subscribe()`; a `Plan::options()` list; a `billing.invoices` route; and a `TeamStats` widget (`php artisan make:alfakit-widget TeamStats --type=stats`).

`actions()` renders above the content, next to the heading when you set one (`->heading('Order #123')->subheading('Placed yesterday')`). Actions receive the bound record as `$record`.

## Actions on their own

Any component may define `actions()`. A component with only actions is a toolbar: the buttons post to the action endpoint, open modals (forms, confirmations, wizards, nested modal actions) and redirect back with a notification.

```php
namespace App\Alfakit\Standalone;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\Select;
use App\Models\Plan;
use App\Models\Team;

class BillingActions extends \AlfaSix\Alfakit\Standalone\Component
{
    public Team $team;

    public function actions(): array
    {
        return [
            Action::make('upgrade')
                ->form([Select::make('plan')->options(Plan::options())->required()])
                ->action(fn (array $data) => $this->team->subscribe($data['plan'])),
            Action::make('invoices')->url(route('billing.invoices'))->color('gray'),
        ];
    }
}
```

## Headless components

```bash
php artisan make:alfakit-component AccountOverview --model=Team
```

`AlfaSix\Alfakit\Standalone\Component` is the base of every standalone type and a headless [custom page](../pages/custom-pages): combine `form()`, `table()`, `infolist()`, `content()` (sections, text, callouts, HTML, custom views), `actions()`, `widgets()` and `footerWidgets()` in one payload. Blocks render in this order: header widgets, form, infolist, table, content, footer widgets.

```php
namespace App\Alfakit\Standalone;

use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Widgets\TeamStats;
use App\Models\Team;

class AccountOverview extends \AlfaSix\Alfakit\Standalone\Component
{
    public Team $team;

    public function widgets(): array
    {
        return [TeamStats::class];
    }

    public function infolist(Schema $schema): Schema
    {
        return $schema->record($this->team)->components([TextEntry::make('name'), TextEntry::make('plan')]);
    }

    public function table(Table $table): Table
    {
        return $table->query($this->team->members()->getQuery())->columns([TextColumn::make('name'), TextColumn::make('role')]);
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([Callout::make('Invite teammates')->description('Share the link below.')]);
    }
}
```

Render the blocks yourself when the default vertical stack is not what the page needs: see [Customizing](customizing).

## Lifecycle hooks

| Hook                                | Purpose                                                                |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `make(array $parameters = [])`      | Build the payload for a page response                                  |
| `mount(mixed ...$parameters)`       | Receives the named parameters after the public properties are assigned |
| `authorize(): bool`                 | Instance check after mount; 403 on the page and on internal requests   |
| `canAccess(): bool` (static)        | Class-level check, as on pages                                         |
| `requiresAuthentication()` (static) | `false` by default; `true` requires a user on the standalone guard     |
| `fill(array $data)`                 | Pre-fill the form state                                                |
| `record(?Model $record)`            | Bind a record for the form, infolist and actions                       |
| `tenant(?Model $tenant)`            | Restore this tenant on every internal request                          |
| `heading(?string)`, `subheading()`  | Optional title above the content                                       |
| `toPayload()`                       | The array the renderer receives (also `toArray()`, `jsonSerialize()`)  |
