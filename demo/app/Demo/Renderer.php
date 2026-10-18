<?php

declare(strict_types=1);

namespace App\Demo;

use Illuminate\Http\Request;

/**
 * The three renderers of the demo and how a URL maps between them: the first path segment
 * is the renderer (`/react/admin/manama/products` ↔ `/vue/admin/manama/products`).
 */
final class Renderer
{
    public const ALL = ['react', 'vue', 'svelte'];

    public const DEFAULT = 'react';

    public const SSR_PORT = 13720;

    /**
     * Public pages of the plugins served once for the whole app (the helpdesk portal at
     * /support, forms at /forms/{slug}): they render with the visitor's last storefront.
     */
    public const SHARED_PREFIXES = ['support', 'forms'];

    public const SESSION_KEY = 'demo.renderer';

    public static function current(?Request $request = null): string
    {
        $request ??= request();
        $segment = $request->segment(1);

        if (in_array($segment, self::ALL, true)) {
            return $segment;
        }

        if (in_array($segment, self::SHARED_PREFIXES, true) && $request->hasSession()) {
            $remembered = $request->session()->get(self::SESSION_KEY);

            return in_array($remembered, self::ALL, true) ? $remembered : self::DEFAULT;
        }

        return self::DEFAULT;
    }

    /**
     * The same page under another renderer, keeping tenant prefixes and the query string.
     */
    public static function url(string $renderer, ?Request $request = null): string
    {
        $request ??= request();
        $segments = $request->segments();

        // Shared plugin pages keep their URL; the switch goes through the session.
        if (in_array($segments[0] ?? null, self::SHARED_PREFIXES, true)) {
            $query = (string) $request->server->get('QUERY_STRING', '');

            return '/demo/renderer/'.$renderer.'?'.http_build_query(['back' => '/'.implode('/', $segments).($query !== '' ? '?'.$query : '')]);
        }

        if (in_array($segments[0] ?? null, self::ALL, true)) {
            $segments[0] = $renderer;
        } else {
            array_unshift($segments, $renderer);
        }

        // The raw query string keeps the parameter order the visitor sees.
        $query = (string) $request->server->get('QUERY_STRING', '');

        return '/'.implode('/', $segments).($query !== '' ? '?'.$query : '');
    }

    /**
     * @return array<int, array{id: string, label: string, url: string, active: bool}>
     */
    public static function links(?Request $request = null): array
    {
        $current = self::current($request);

        return array_map(fn (string $renderer): array => [
            'id' => $renderer,
            'label' => __('demo.switcher.'.$renderer),
            'url' => self::url($renderer, $request),
            'active' => $renderer === $current,
        ], self::ALL);
    }
}
