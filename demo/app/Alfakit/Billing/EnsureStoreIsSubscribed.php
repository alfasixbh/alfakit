<?php

declare(strict_types=1);

namespace App\Alfakit\Billing;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The middleware a billing provider hands to `requiresTenantSubscription()`: it would send
 * unsubscribed tenants to the billing page. The demo plan is free, so every store passes.
 */
final class EnsureStoreIsSubscribed
{
    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }
}
