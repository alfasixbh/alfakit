<?php

declare(strict_types=1);

use App\Demo\Renderer;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ThrottleDemoUploads;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        // The fake supplier API behind the Suppliers ApiResource: stateless, no CSRF.
        then: fn () => Route::middleware('api')->group(__DIR__.'/../routes/demo-api.php'),
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // A signed-in visitor opening a login page lands in that renderer's panel, not on '/'.
        $middleware->redirectUsersTo(fn (Request $request): string => '/'.Renderer::current($request).'/admin');

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            ThrottleDemoUploads::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
