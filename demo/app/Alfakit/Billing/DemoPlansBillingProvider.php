<?php

declare(strict_types=1);

namespace App\Alfakit\Billing;

use AlfaSix\Alfakit\Panel;
use AlfaSix\AlfakitBilling\Plan;
use AlfaSix\AlfakitBilling\Providers\StripeBillingProvider;
use App\Alfakit\Tenancy\Billing;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * alfasix/alfakit-billing's Stripe provider in "showroom" mode for the public demo: the plans
 * page (`/{store}/billing/plans`) lists real plan cards, but nothing ever reaches Stripe.
 * The billing route keeps the demo's own Billing page (App\Alfakit\Tenancy\Billing), which
 * explains that checkout is switched off when a plan is picked. No Cashier, no keys, no
 * subscription required.
 */
final class DemoPlansBillingProvider extends StripeBillingProvider
{
    public function isInstalled(): bool
    {
        return true;
    }

    public function getRouteAction(): string
    {
        return Billing::class;
    }

    public function getSubscribedMiddleware(): string
    {
        return EnsureStoreIsSubscribed::class;
    }

    protected function checkSubscription(Model $billable): bool
    {
        return false;
    }

    public function redirectToPortal(Model $billable, Panel $panel, Request $request): Response
    {
        return redirect()->to((string) $this->getBillingUrl($panel));
    }

    public function checkout(Model $billable, Plan $plan, Panel $panel, Request $request): Response
    {
        return redirect()->to((string) $this->getBillingUrl($panel, ['plan' => $plan->getId()]));
    }
}
