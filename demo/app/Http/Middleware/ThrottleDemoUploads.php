<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Symfony\Component\HttpFoundation\Response;

/**
 * Public demo: every AlfaKit upload endpoint (panels and standalone forms) goes through the
 * `demo-uploads` limiter defined in AppServiceProvider. The size cap is `alfakit.uploads.max_size_kb`.
 */
final class ThrottleDemoUploads
{
    public function __construct(private readonly ThrottleRequests $throttle) {}

    public function handle(Request $request, Closure $next): Response
    {
        $route = $request->route();
        $name = $route?->getName();

        if ($request->isMethod('POST') && is_string($name) && str_ends_with($name, '.uploads.store')) {
            return $this->throttle->handle($request, $next, 'demo-uploads');
        }

        return $next($request);
    }
}
