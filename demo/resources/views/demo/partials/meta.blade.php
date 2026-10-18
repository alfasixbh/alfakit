{{-- Shared head tags for the panels and the storefront: description, icons and the social card. --}}
@php
    $demoTitle = $title ?? __('demo.meta.title');
    $demoDescription = __('demo.meta.description');
    $demoImage = url('/brand/alfakit-social-card.png');
@endphp
<meta name="description" content="{{ $demoDescription }}">
@unless ($pwa ?? false)
<meta name="theme-color" content="#073B78">
@endunless
<meta property="og:type" content="website">
<meta property="og:site_name" content="{{ __('demo.meta.site') }}">
<meta property="og:title" content="{{ $demoTitle }}">
<meta property="og:description" content="{{ $demoDescription }}">
<meta property="og:image" content="{{ $demoImage }}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="{{ url()->current() }}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ $demoTitle }}">
<meta name="twitter:description" content="{{ $demoDescription }}">
<meta name="twitter:image" content="{{ $demoImage }}">
<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/icons/favicon.ico" sizes="any">
{{-- Panels with `pwa()` render their own manifest, theme colours and apple-touch-icon. --}}
@unless ($pwa ?? false)
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/icons/site.webmanifest">
@endunless
