{{-- Renderer switcher: the same page under /react, /vue and /svelte. Rendered in Slot::TOPBAR_END and the storefront header. --}}
<nav aria-label="{{ __('demo.switcher.label') }}" data-slot="renderer-switcher" class="inline-flex shrink-0 items-center rounded-full border border-border bg-muted/60 p-0.5 text-xs font-medium shadow-xs">
    @foreach ($links as $link)
        <a
            href="{{ $link['url'] }}"
            {{-- Tables update the query string without re-rendering this slot, so the link is rebuilt from the current address on click. --}}
            onclick="this.href = '/{{ $link['id'] }}' + window.location.pathname.replace(/^\/(react|vue|svelte)(?=\/|$)/, '') + window.location.search"
            @if ($link['active']) aria-current="page" @endif
            title="{{ $link['active'] ? __('demo.switcher.current', ['renderer' => $link['label']]) : $link['label'] }}"
            class="{{ $link['active']
                ? 'inline-flex min-w-7 justify-center rounded-full bg-background px-2 py-1 text-foreground shadow-sm ring-1 ring-border sm:px-3'
                : 'inline-flex min-w-7 justify-center rounded-full px-2 py-1 text-muted-foreground transition-colors hover:text-foreground sm:px-3' }}"
        >{{-- Phones: the initial (R / V / S), so the breadcrumbs keep room; the full name stays the accessible name. --}}<span class="hidden sm:inline">{{ $link['label'] }}</span><span class="sm:hidden" aria-hidden="true">{{ mb_substr($link['label'], 0, 1) }}</span><span class="sr-only sm:hidden">{{ $link['label'] }}</span></a>
    @endforeach
</nav>
