---
title: Build a customer portal in 10 minutes
description: A customer-facing panel with the portal() preset, a branded sign-in, invitation-only registration and records scoped to the signed-in customer.
---

# Build a customer portal in 10 minutes

A customer portal is a panel for the people you serve, not for your staff: they sign in, see their own orders, invoices or tickets, and update their profile. AlfaKit gives it three building blocks:

- `->portal()`: a preset with simple, customer-facing chrome;
- `->invitationOnlyRegistration()`: only people you invite can create an account;
- `->scopeToUser()`: every resource shows the signed-in customer's own records, and new records belong to them.

The React playground has a working example at `/portal` (sign in as `customer@example.com` / `password`).

## 1. The panel (2 minutes)

```bash
php artisan make:alfakit-panel portal
```

```php
// app/Providers/Alfakit/PortalPanelProvider.php
use AlfaSix\Alfakit\Pages\Dashboard;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;

class PortalPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->id('portal')
            ->path('portal')
            ->portal()
            ->brandName('Acme')
            ->brandLogo('/images/acme.svg')
            ->colors(['primary' => '#ea580c'])
            ->invitationOnlyRegistration()
            ->scopeToUser('customer_id')
            ->discoverResources(in: app_path('Alfakit/Portal/Resources'), for: 'App\\Alfakit\\Portal\\Resources')
            ->pages([Dashboard::class])
            ->middleware(['web']);
    }
}
```

`portal()` turns on the top navigation, a branded sign-in page with password reset, and a full profile page (with [two-step verification](multi-factor-authentication) if you add it), and turns off what customers don't need: global search, the command palette, the keyboard shortcuts overlay, recent records, breadcrumbs and the "Developed by" footer credit. Content is centred at `6xl`. Every option can be changed after `portal()`, for example `->portal()->globalSearch()`.

Keep customers out of your admin panel, and staff out of the portal if you want, with [`CanAccessPanel`](authentication#controlling-who-can-access-a-panel):

```php
public function canAccessPanel(Panel $panel): bool
{
    return match ($panel->getId()) {
        'admin' => $this->is_staff,
        'portal' => $this->customer_id !== null,
        default => false,
    };
}
```

## 2. Only their own records (3 minutes)

`scopeToUser()` scopes every resource of the panel to the signed-in user. Give it the column (or relationship) of your models that points at the owner:

```php
$panel->scopeToUser('user_id');                     // orders.user_id = the user's id
$panel->scopeToUser('customer');                    // a BelongsTo (or any) relationship of the model
$panel->scopeToUser('customer_id', fn (User $user) => $user->customer_id); // the owner is the user's customer
```

What is scoped: the list (and its search, filters and exports), record pages (another customer's record is a 404) and global search, because they all go through `Resource::getEloquentQuery()`; relation managers only open on a record the customer can see. New records created on create pages and with `CreateAction` get the owner filled in. A user without an owner key (the closure returns `null`) sees nothing.

Per resource:

```php
namespace App\Alfakit\Portal\Resources;

use AlfaSix\Alfakit\Resources\Resource;

class InvoiceResource extends Resource
{
    // A different column than the panel's, or `false` to opt out of the panel's scope.
    protected static string|false|null $userOwnership = 'billing_contact_id';
}
```

```php
// Or from code, e.g. in a service provider:
InvoiceResource::scopeToUser('billing_contact_id');
```

To reuse a staff resource in the portal, register it again with its own scope (a [configurable resource](../resources/overview#configurable-resources)):

```php
$panel->resources([
    OrderResource::make('mine')->slug('orders')->scopeToUser('customer_id'),
]);
```

Scoping limits which records are visible. Keep using [policies](../resources/authorization) for what customers may do with them; for a read-only resource, allow only viewing:

```php
public static function can(string $action, ?Model $record = null): bool
{
    return in_array($action, ['viewAny', 'view'], true) && parent::can($action, $record);
}
```

## 3. Invitation-only registration (2 minutes)

With `invitationOnlyRegistration()` the registration page only opens from a signed invitation link for one email address; the sign-in page doesn't link to it. Send invitations from your admin panel:

```php
use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Facades\Alfakit;
use AlfaSix\Alfakit\Forms\Components\TextInput;

Action::make('inviteCustomer')
    ->form([TextInput::make('email')->email()->required()])
    ->action(fn (array $data) => Alfakit::getPanel('portal')->inviteToRegister($data['email']));
```

`inviteToRegister($email)` emails the link (the `RegistrationInvitation` notification, translated) and returns it; `getRegistrationInvitationUrl($email, $expiresAt)` only returns it. Links expire after `invitationOnlyRegistration(expiresAfterDays: 7)` days. The invited address is read-only on the form and checked again on submit, so a link can't register another address. Nothing is stored in the database: the signature is the invitation.

The [app auth kit](../standalone/auth-kit) has the same option for your app's own registration.

## 4. A dashboard for the customer (3 minutes)

Widgets that query through the resource are scoped too:

```php
namespace App\Alfakit\Portal\Widgets;

use AlfaSix\Alfakit\Widgets\StatsOverviewWidget;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget\Stat;
use App\Alfakit\Resources\OrderResource;
use Illuminate\Support\Number;

class OrderStats extends StatsOverviewWidget
{
    protected function getStats(): array
    {
        $orders = OrderResource::getEloquentQuery();

        return [
            Stat::make(__('Open orders'), (clone $orders)->whereIn('status', ['processing', 'shipped'])->count()),
            Stat::make(__('Total spent'), Number::currency($orders->sum('total') / 100, 'USD')),
        ];
    }
}
```

Register it with `->widgets([OrderStats::class])`. Add languages with `->locales([...])`, themes with `->theme()`, and the customer's second factor with `->multiFactorAuthentication([...])` as on any panel.

## Portal or standalone pages?

A portal is a panel: navigation, resources, CRUD pages and its own sign-in in one place. When customers only need a page or two inside your existing app (an orders table on the account page, a support form), use [standalone components](../standalone/component-kit) and the [app auth kit](../standalone/auth-kit) in your own layout instead.
