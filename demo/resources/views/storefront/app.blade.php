@php
    $renderer = \App\Demo\Renderer::current();
    $extension = $renderer === 'react' ? 'tsx' : 'ts';
    $locale = app()->getLocale();
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', $locale) }}" dir="{{ in_array($locale, ['ar', 'fa', 'he', 'ur'], true) ? 'rtl' : 'ltr' }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        @include('demo.partials.meta', ['title' => __('demo.storefront.title')])
        <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
        <link rel="stylesheet" href="https://fonts.bunny.net/css?family=inter:400,500,600|montserrat:600,700&display=swap">

        <style @if (\Illuminate\Support\Facades\Vite::cspNonce()) nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}" @endif>
            html { background-color: #FFF4E4; }
        </style>

        @vite(["resources/css/{$renderer}.css", "resources/js/{$renderer}/app.{$extension}"])

        <x-inertia::head>
            <title>{{ __('demo.storefront.title') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
