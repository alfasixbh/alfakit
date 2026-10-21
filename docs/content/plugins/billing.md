---
title: Billing
description: Subscription billing for tenants or users with Stripe, Paddle or Laravel Spark.
---

# Billing

`alfasix/alfakit-billing` connects a panel to a subscription billing service. It ships three providers for AlfaKit's [tenant billing](../panels/tenancy) contract, a plans page and the middleware that keeps unsubscribed customers out:

| Provider                | Package                             | Subscribe                  | Manage                 |
| ----------------------- | ----------------------------------- | -------------------------- | ---------------------- |
| `StripeBillingProvider` | `laravel/cashier` (optional)        | Stripe Checkout            | Stripe Billing Portal  |
| `PaddleBillingProvider` | `laravel/cashier-paddle` (optional) | Paddle.js overlay checkout | Paddle customer portal |
| `SparkBillingProvider`  | Laravel Spark (paid, optional)      | Spark's billing portal     | Spark's billing portal |

On a panel with [tenancy](../panels/tenancy) the **tenant** is billed; on a panel without tenancy the **signed-in user** is.

## Installation

```bash
composer require alfasix/alfakit-billing
composer require laravel/cashier   # for the StripeBillingProvider
```

Each provider's package is optional, so install only the one you use; until it is installed, the provider throws a `BillingPackageMissing` exception that says what to install. The service provider is discovered automatically. Set up Laravel Cashier as its documentation describes: publish and run its migrations (for a tenant billable, add the customer columns to the tenant table and point the subscriptions' foreign key at it), add `STRIPE_KEY`, `STRIPE_SECRET` and `STRIPE_WEBHOOK_SECRET` to `.env`, and register the webhook (`php artisan cashier:webhook`) so subscriptions are created and updated in your database.

Add Cashier's `Billable` trait to the model that pays, the tenant or the user:

```php
use Laravel\Cashier\Billable;

class Team extends Model
{
    use Billable;
}
```

For a tenant billable, tell Cashier in a service provider: `Cashier::useCustomerModel(Team::class);`.

## Registering the plugin

```php
use AlfaSix\AlfakitBilling\BillingPlugin;
use AlfaSix\AlfakitBilling\Plan;
use AlfaSix\AlfakitBilling\Providers\StripeBillingProvider;

$panel
    ->tenant(Team::class)
    ->plugin(
        BillingPlugin::make()
            ->provider(
                StripeBillingProvider::make()
                    ->plans([
                        Plan::make('basic')->price('price_basic')->amount(9, 'usd')->monthly()
                            ->features(['3 projects', 'Email support']),
                        Plan::make('pro')->price('price_pro')->label('Pro')->amount(29, 'usd')->monthly()
                            ->features(['Unlimited projects', 'Priority support'])
                            ->highlighted(),
                    ])
                    ->trialDays(14),
            )
            ->requiresSubscription(),
    );
```

This:

- sets the provider as the panel's `tenantBillingProvider()` (and `requiresSubscription()` as `requiresTenantSubscription()`) on tenancy panels, which adds the `/{tenant}/billing` route and a **Billing** entry to the tenant menu (customise it with the `billing` key of `tenantMenuItems()`);
- registers the plans page at `/{tenant}/billing/plans` (`/billing/plans` without tenancy);
- on panels without tenancy, registers `/billing` and adds a **Billing** entry to the user menu. In [starter-kit mode](../getting-started/starter-kits) your app owns the user menu, so the entry isn't shown: link to `route('alfakit.{panel}.billing')` (for example `route('alfakit.admin.billing')`) from your own menu;
- with `requiresSubscription()`, sends customers without an active subscription to the plans page.

### The billing route

`/billing` (or `/{tenant}/billing`) decides where to go:

- subscribed: the provider's billing portal (change plan, payment methods, invoices);
- not subscribed: the plans page;
- `?plan=pro` and not subscribed: the provider's checkout for that plan.

Visits from the panel (Inertia) are answered with a full page redirect, so the hosted checkout and portal open normally.

### Plugin options

| Method                                                  | Description                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `provider(AbstractBillingProvider $provider)`           | The billing provider.                                                            |
| `requiresSubscription(bool\|Closure $condition = true)` | Send billables without an active subscription to the plans page. Off by default. |
| `checkoutPage(string $page)`                            | Use your own plans page, a subclass of `AlfaSix\AlfakitBilling\Pages\Checkout`.  |
| `userMenuItem(bool\|Closure $condition = true)`         | The **Billing** user menu entry on panels without tenancy (on by default).       |

`BillingPlugin::get($panel)` returns the registered plugin.

Pages and resources can opt out of the subscription requirement on tenancy panels by overriding `isTenantSubscriptionRequired()` (see [tenancy](../panels/tenancy)). On panels without tenancy the login, profile and other account pages, the billing route and the plans page always stay reachable.

## Plans

```php
Plan::make('pro')
    ->price('price_123')                    // or ['price_base', 'price_seats']
    ->label('Pro')                          // default: the id as a headline
    ->description('For growing teams')
    ->amount(29, 'usd')->monthly()          // "$29.00 per month", in the panel's locale
    ->priceLabel('From €29 / seat')         // replaces amount + interval
    ->features(['Unlimited projects', 'Priority support'])
    ->trialDays(30)                         // overrides the provider's trialDays(); null = no trial
    ->highlighted()                         // "Most popular" badge and primary button
    ->hidden(fn () => ! auth()->user()->isBeta());
```

| Method                                          | Description                                                                                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `price(string\|array $prices)`                  | The provider's price ids (Stripe `price_…`, Paddle `pri_…`). Several prices become several subscription items. `prices()` is an alias. |
| `label()`, `description()`                      | Title and description of the plan card.                                                                                                |
| `amount(int\|float $amount, ?string $currency)` | Displayed amount, formatted with `Number::currency()` in the app locale.                                                               |
| `interval(string)`, `monthly()`, `yearly()`     | `day`, `week`, `month` or `year`, shown after the amount.                                                                              |
| `priceLabel(string\|Closure)`                   | Free text instead of the formatted amount.                                                                                             |
| `features(array\|Closure)`                      | Bullet list on the plan card.                                                                                                          |
| `trialDays(?int)`                               | Trial for this plan (Stripe only).                                                                                                     |
| `highlighted(bool)`                             | Emphasise the plan.                                                                                                                    |
| `visible()`, `hidden()`                         | Show or hide the plan (closures allowed). Hidden plans can't be checked out.                                                           |

The plans page is built from AlfaKit's `Section`, `Text`, `UnorderedList` and `Callout` components, so it renders in React, Vue and Svelte without extra frontend code.

## Provider options

Every provider has:

| Method                                      | Description                                                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `plans(array\|Closure $plans)`              | The `Plan`s on the plans page.                                                                             |
| `type(string\|Closure $type)`               | The subscription type (Cashier's name), `default` by default.                                              |
| `trialDays(int\|Closure\|null $days)`       | Free trial for new subscriptions; closures receive `?Plan $plan`.                                          |
| `allowGenericTrial(bool $condition = true)` | Count a generic trial (`trial_ends_at` on the billable) as subscribed. On by default.                      |
| `successUrl(string\|Closure)`               | Where the checkout returns after paying. Default: the panel (tenant) home.                                 |
| `cancelUrl(string\|Closure)`                | Where a cancelled checkout returns. Default: the plans page.                                               |
| `returnUrl(string\|Closure)`                | The billing portal's return link. Default: the panel (tenant) home.                                        |
| `billable(Closure $callback)`               | Choose the billable: `fn (Panel $panel, ?Model $tenant, $user) => $tenant?->owner`.                        |
| `subscribedUsing(Closure $callback)`        | Replace the subscription check: `fn (Model $billable): bool => $billable->subscribedToPrice('price_pro')`. |

URL closures receive `$panel`, `$plan` and `$tenant`.

### Stripe

```php
StripeBillingProvider::make()
    ->plans([...])
    ->trialDays(14)
    ->allowPromotionCodes()
    ->checkoutOptions(['tax_id_collection' => ['enabled' => true]])
    ->customerOptions(fn (Model $billable) => ['metadata' => ['team' => $billable->getKey()]])
    ->portalOptions(['locale' => 'auto']);
```

- Subscribed means `$billable->subscribed($type)`, or a generic trial.
- Checkout calls `$billable->newSubscription($type, $plan->getPrices())->trialDays(...)->checkout([...])` and redirects to the Stripe Checkout session.
- The portal calls `$billable->billingPortalUrl($returnUrl, $portalOptions)`, creating the Stripe customer first if needed.

### Paddle

```php
use AlfaSix\AlfakitBilling\Providers\PaddleBillingProvider;

PaddleBillingProvider::make()->plans([Plan::make('pro')->price('pri_01h...')]);
```

Requires `composer require laravel/cashier-paddle` and the `Laravel\Paddle\Billable` trait on the billable. Cashier Paddle requires Guzzle 7. Laravel 13 supports Guzzle 7 and 8, so if Composer refuses, run `composer require laravel/cashier-paddle -W` to switch Guzzle to 7. Until the package is installed, every billing request through Paddle throws a `BillingPackageMissing` exception explaining how to install it.

- Subscribed means `$billable->subscribed($type)`.
- Checkout renders a small page that loads Paddle.js (`@paddleJS`) and opens the overlay with `$billable->subscribe($prices, $type)->returnTo($successUrl)->options()`. Trials are configured on the Paddle price, so `trialDays()` does not apply.
- The portal opens a Paddle customer portal session (`POST /customers/{id}/portal-sessions` through `Laravel\Paddle\Cashier::api()`); billables that are not yet Paddle customers go to the plans page.

### Spark

```php
use AlfaSix\AlfakitBilling\Providers\SparkBillingProvider;

SparkBillingProvider::make()
    ->path('/billing')        // Spark's `path` config
    ->billableType('team');   // the key in config/spark.php `billables`
```

Laravel Spark is a paid package ([spark.laravel.com](https://spark.laravel.com)); without it the provider throws a `BillingPackageMissing` exception. Spark has its own plan picker, so plans configured on the provider are not used and the plans page redirects to the billing route:

- Subscribed means `$billable->subscribed($type)` (Spark's `Billable` trait).
- The billing route redirects to Spark's portal: `/billing` for the `user` billable type, `/billing/{type}/{id}` for others. The type defaults to the model name in kebab case (`Team` → `team`).

## Without the plugin

The providers also work as a plain tenant billing provider:

```php
$panel->tenantBillingProvider(StripeBillingProvider::make())->requiresTenantSubscription();
```

Without the plugin there is no plans page (unsubscribed tenants are sent to the billing route, which opens the portal) and no user billing.

## What needs real keys

The package's tests run without network access: Stripe requests go to a fake HTTP client (`Stripe\ApiRequestor::setHttpClient()`), and Paddle and Spark are replaced by small stand-ins. In an application:

- **Stripe**: `STRIPE_KEY` / `STRIPE_SECRET` (test or live) for Checkout and the Billing Portal, real price ids in `Plan::price()`, a Billing Portal configuration saved in the Stripe dashboard, and `STRIPE_WEBHOOK_SECRET` plus the Cashier webhook so subscriptions reach your database (the subscription check reads the local `subscriptions` table).
- **Paddle**: `PADDLE_CLIENT_SIDE_TOKEN`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET` and `PADDLE_SANDBOX` for Cashier Paddle, `pri_…` price ids, and the Paddle webhook.
- **Spark**: a Spark licence and its own Stripe or Paddle keys; AlfaKit only links to Spark's portal.

## Translations

Strings live in the `alfakit-billing::billing` namespace. Publish them to change or translate:

```bash
php artisan vendor:publish --tag=alfakit-billing-translations
```
