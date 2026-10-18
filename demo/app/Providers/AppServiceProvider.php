<?php

declare(strict_types=1);

namespace App\Providers;

use AlfaSix\AlfakitWebhooks\Models\WebhookEndpoint;
use App\Policies\WebhookEndpointPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Public demo: webhooks are read-only (see the policy).
        Gate::policy(WebhookEndpoint::class, WebhookEndpointPolicy::class);

        // Public demo: keep uploads and imports from being abused.
        RateLimiter::for('demo-uploads', fn (Request $request): array => [
            Limit::perMinute(20)->by('minute:'.($request->user()?->getAuthIdentifier() ?? $request->ip())),
            Limit::perHour(100)->by('hour:'.$request->ip()),
        ]);
        RateLimiter::for('demo-imports', fn (Request $request): Limit => Limit::perHour(5)->by($request->user()?->getAuthIdentifier() ?? $request->ip()));
    }
}
