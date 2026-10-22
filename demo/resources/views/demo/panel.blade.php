{{--
    Root view for the three admin panels (config alfakit.inertia.root_view). It is the package's
    `alfakit::app` view plus the demo's shared head tags (description, icons, social card).
--}}
@php
    $alfakitPanel = alfakit()->getCurrentOrDefaultPanel();
    $alfakitLocale = $alfakitPanel->getCurrentLocale();
@endphp
<!DOCTYPE html>
<html
    lang="{{ $alfakitLocale->getTag() }}"
    dir="{{ $alfakitLocale->getDirection()->value }}"
    @foreach ($alfakitPanel->getHtmlThemeAttributes() as $attribute => $value) {{ $attribute }}="{{ $value }}" @endforeach
    style="{{ $alfakitPanel->getHtmlThemeStyle() }}"
    @class(['dark' => ($alfakitAppearance ?? 'system') === 'dark'])
>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        @include('demo.partials.meta', ['title' => __('demo.meta.panel_title'), 'pwa' => $alfakitPanel->hasPwa()])

        {{-- `pwa()`: the panel's own manifest, theme colours and iOS icon. --}}
        {{ $alfakitPanel->renderPwaHeadTags() }}

        {{-- Apply the stored or system colour scheme before paint to avoid flashes. --}}
        <script @if (\Illuminate\Support\Facades\Vite::cspNonce()) nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}" @endif>
            (function () {
                const appearance = @json($alfakitAppearance ?? 'system');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                if (appearance === 'dark' || (appearance === 'system' && prefersDark)) {
                    document.documentElement.classList.add('dark');
                }
            })();
        </script>

        <style @if (\Illuminate\Support\Facades\Vite::cspNonce()) nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}" @endif>
            html { background-color: oklch(1 0 0); }
            html.dark { background-color: oklch(0.145 0 0); }
        </style>

        @foreach ($alfakitPanel->getFontUrls() as $fontUrl)
            @if ($loop->first)
                <link rel="preconnect" href="{{ parse_url($fontUrl, PHP_URL_SCHEME).'://'.parse_url($fontUrl, PHP_URL_HOST) }}" crossorigin>
            @endif
            <link rel="stylesheet" href="{{ $fontUrl }}">
        @endforeach

        {{-- Plugin stylesheets and scripts (Assets::register()), before the app's own CSS so it can override them. --}}
        {!! \AlfaSix\Alfakit\Support\Assets\Assets::renderTags($alfakitPanel->getId(), \Illuminate\Support\Facades\Vite::cspNonce()) !!}

        @if (collect($alfakitPanel->getViteEntries())->contains(fn (string $entry): bool => str_contains($entry, '/react/')))
            @viteReactRefresh
        @endif
        @vite($alfakitPanel->getViteEntries())

        <x-inertia::head>
            <title>{{ $alfakitPanel->getBrandName() }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
