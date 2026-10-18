<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script @if (\Illuminate\Support\Facades\Vite::cspNonce()) nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}" @endif>
            (function () {
                try {
                    const appearance = localStorage.getItem('alfakit_appearance') || 'system';
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (appearance === 'dark' || (appearance === 'system' && prefersDark)) {
                        document.documentElement.classList.add('dark');
                    }
                } catch (e) {}
            })();
        </script>
        <style @if (\Illuminate\Support\Facades\Vite::cspNonce()) nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}" @endif>
            html { background-color: #ffffff; }
            html.dark { background-color: #0b1a2e; }
        </style>

        <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
        <link rel="icon" href="/icons/favicon.ico" sizes="any">
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
        <link rel="manifest" href="/icons/site.webmanifest">
        <meta name="theme-color" content="#073B78">
        <link rel="preload" href="/fonts/inter-400.ttf" as="font" type="font/ttf" crossorigin>
        <link rel="preload" href="/fonts/montserrat-700.ttf" as="font" type="font/ttf" crossorigin>

        @php
            $seo = $page['props']['seo'] ?? [];
            $seoTitle = $seo['title'] ?? config('app.name', 'AlfaKit');
            $seoDescription = $seo['description'] ?? \App\Support\Site\Seo::DEFAULT_DESCRIPTION;
            $seoImage = $seo['image'] ?? url(\App\Support\Site\Seo::DEFAULT_IMAGE);
            $seoCanonical = $seo['canonical'] ?? url()->current();
        @endphp
        {{-- Per-page tags for crawlers; resources/js/components/site/seo.tsx renders the same keys (data-inertia) on client visits. --}}
        <meta name="description" content="{{ $seoDescription }}" data-inertia="description">
        <link rel="canonical" href="{{ $seoCanonical }}" data-inertia="canonical">
        @if (! empty($seo['noindex']))
            <meta name="robots" content="noindex" data-inertia="robots">
        @endif
        <meta property="og:site_name" content="AlfaKit">
        <meta property="og:type" content="{{ $seo['type'] ?? 'website' }}" data-inertia="og:type">
        <meta property="og:title" content="{{ $seoTitle }}" data-inertia="og:title">
        <meta property="og:description" content="{{ $seoDescription }}" data-inertia="og:description">
        <meta property="og:url" content="{{ $seoCanonical }}" data-inertia="og:url">
        <meta property="og:image" content="{{ $seoImage }}" data-inertia="og:image">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{{ $seoTitle }}" data-inertia="twitter:title">
        <meta name="twitter:description" content="{{ $seoDescription }}" data-inertia="twitter:description">
        <meta name="twitter:image" content="{{ $seoImage }}" data-inertia="twitter:image">
        @if (! empty($seo['jsonLd']))
            <script type="application/ld+json">{!! json_encode($seo['jsonLd'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) !!}</script>
        @endif
        <link rel="alternate" type="application/rss+xml" href="{{ url('/blog/rss.xml') }}" title="AlfaKit blog">
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <link rel="alternate" type="text/plain" href="/llms.txt" title="AlfaKit documentation for AI agents">

        <x-inertia::head>
            <title>{{ $seoTitle }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
