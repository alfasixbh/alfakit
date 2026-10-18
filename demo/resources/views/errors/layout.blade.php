{{--
    Branded error page for the public demo (403, 404, 419, 429, 500, 503). Self-contained: no Vite
    assets, so it renders even when the build is missing or the app is in maintenance mode.
--}}
@php
    $renderer = \App\Demo\Renderer::current();
    $locale = app()->getLocale();
    $rtl = in_array($locale, ['ar', 'fa', 'he', 'ur'], true);
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', $locale) }}" dir="{{ $rtl ? 'rtl' : 'ltr' }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex">
        <title>{{ __("demo.errors.{$code}.title") }} · {{ __('demo.meta.site') }}</title>
        <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
        <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
        <link rel="stylesheet" href="https://fonts.bunny.net/css?family=inter:400,500|montserrat:700&display=swap">
        <style @if (\Illuminate\Support\Facades\Vite::cspNonce()) nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}" @endif>
            :root { --bg: #FFF4E4; --fg: #073B78; --muted: rgba(7, 59, 120, .68); --accent: #F47A22; --card: #ffffff; --line: rgba(7, 59, 120, .12); }
            @media (prefers-color-scheme: dark) {
                :root { --bg: #04213f; --fg: #FFF4E4; --muted: rgba(255, 244, 228, .7); --card: #062d55; --line: rgba(255, 244, 228, .14); }
            }
            * { box-sizing: border-box; }
            body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px 16px; background: var(--bg); color: var(--fg); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
            main { width: 100%; max-width: 30rem; text-align: center; }
            img { width: 88px; height: 88px; }
            .code { margin: 24px 0 0; font: 700 .75rem/1 Montserrat, Inter, sans-serif; letter-spacing: .25em; text-transform: uppercase; color: var(--accent); }
            h1 { margin: 12px 0 0; font: 700 1.75rem/1.2 Montserrat, Inter, sans-serif; }
            p.body { margin: 12px 0 0; color: var(--muted); line-height: 1.6; }
            nav { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
            a { display: inline-flex; align-items: center; height: 40px; padding: 0 18px; border-radius: 999px; font-size: .875rem; font-weight: 500; text-decoration: none; }
            a.primary { background: var(--fg); color: var(--bg); }
            a.secondary { border: 1px solid var(--line); background: var(--card); color: var(--fg); }
            a:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
        </style>
    </head>
    <body>
        <main>
            <img src="/brand/alfakit-mascot-color.svg" alt="">
            <p class="code">{{ $code }}</p>
            <h1>{{ __("demo.errors.{$code}.title") }}</h1>
            <p class="body">{{ __("demo.errors.{$code}.body") }}</p>
            <nav>
                <a class="primary" href="/{{ $renderer }}/admin">{{ __('demo.errors.open_admin') }}</a>
                <a class="secondary" href="/{{ $renderer }}">{{ __('demo.errors.back_home') }}</a>
            </nav>
        </main>
    </body>
</html>
