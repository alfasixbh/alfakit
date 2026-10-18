<?php

declare(strict_types=1);

namespace App\Alfakit\Billing;

use AlfaSix\Alfakit\Billing\Providers\Contracts\BillingProvider;
use App\Alfakit\Tenancy\Billing;

/**
 * Registering a billing provider is what adds the "Billing" entry to the tenant menu and
 * the `/{store}/billing` route. A real provider (Cashier, Spark, Paddle…) redirects that
 * route to a portal; this one renders a page describing the demo plan. The subscription
 * middleware is only applied when `requiresTenantSubscription()` is on, which it is not.
 */
final class DemoBillingProvider implements BillingProvider
{
    public function getRouteAction(): string
    {
        return Billing::class;
    }

    public function getSubscribedMiddleware(): string
    {
        return EnsureStoreIsSubscribed::class;
    }
}
