<!DOCTYPE html>
{{-- A live example of the docs in one renderer (DocsController::example), shown in an iframe. --}}
@php
    $renderer = $page['props']['renderer'] ?? 'react';
    $theme = request()->query('theme') === 'dark' ? 'dark' : 'light';
    $entry = ['react' => 'resources/js/examples/react.tsx', 'vue' => 'resources/js/examples/vue.js', 'svelte' => 'resources/js/examples/svelte.js'][$renderer] ?? 'resources/js/examples/react.tsx';
@endphp
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => $theme === 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex">
        <title>Example</title>
        @vite(["resources/css/examples-{$renderer}.css", $entry])
        <x-inertia::head />
    </head>
    <body class="bg-background text-foreground font-sans antialiased">
        <x-inertia::app />
        <script @if (\Illuminate\Support\Facades\Vite::cspNonce()) nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}" @endif>
            // Tell the docs page how tall the example is, so the iframe fits it.
            (function () {
                if (window.parent === window) return;
                var send = function () {
                    var height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
                    window.parent.postMessage({ alfakitExample: location.pathname, height: height }, location.origin);
                };
                new ResizeObserver(send).observe(document.body);
                window.addEventListener('load', send);
            })();
        </script>
    </body>
</html>
