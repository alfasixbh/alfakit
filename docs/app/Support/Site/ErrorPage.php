<?php

namespace App\Support\Site;

use App\Support\Documentation;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Renders the site's error page (resources/js/pages/site/error.tsx) in place of Laravel's
 * default one, for HTML requests. Raw files (.md, .txt, .xml) keep their plain response.
 */
class ErrorPage
{
    public const STATUSES = [403, 404, 500, 503];

    public static function render(Response $response, Request $request): Response
    {
        $status = $response->getStatusCode();

        if (! in_array($status, self::STATUSES, true)
            || $request->expectsJson()
            || preg_match('/\.(md|txt|xml|json)$/', $request->path()) === 1
            || ($status >= 500 && config('app.debug'))) {
            return $response;
        }

        return Inertia::render('site/error', [
            'status' => $status,
            'demoUrl' => Documentation::demoUrl(),
            'seo' => [...Seo::make(match ($status) {
                404 => 'Page not found - AlfaKit',
                403 => 'Forbidden - AlfaKit',
                503 => 'Back soon - AlfaKit',
                default => 'Something went wrong - AlfaKit',
            }), 'noindex' => true],
        ])->toResponse($request)->setStatusCode($status);
    }
}
