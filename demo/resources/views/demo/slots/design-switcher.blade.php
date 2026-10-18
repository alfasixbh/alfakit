{{-- Theme picker and mobile preset toggle (session flags read by App\Demo\DemoPanel). --}}
<div class="hidden items-center gap-2 xl:flex">
    <label class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span class="sr-only">{{ __('demo.design.theme') }}</span>
        <select
            class="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
            onchange="window.location.href = '/demo/theme/' + this.value + '?back=' + encodeURIComponent(window.location.pathname + window.location.search)"
            aria-label="{{ __('demo.design.theme') }}"
        >
            @foreach ($themes as $option)
                <option value="{{ $option->getName() }}" @selected($option->getName() === $theme)>{{ $option->getLabel() }}</option>
            @endforeach
        </select>
    </label>
    <a
        href="/demo/mobile/{{ $mobile ? 'off' : 'on' }}?back={{ urlencode(request()->getRequestUri()) }}"
        role="switch"
        aria-checked="{{ $mobile ? 'true' : 'false' }}"
        aria-label="{{ __('demo.design.mobile_preset') }}"
        title="{{ $mobile ? __('demo.design.mobile_on') : __('demo.design.mobile_off') }}"
        class="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
        <span class="{{ $mobile ? 'bg-primary' : 'bg-muted-foreground/40' }} relative inline-block h-3.5 w-6 rounded-full transition-colors">
            <span class="{{ $mobile ? 'translate-x-2.5 rtl:-translate-x-2.5' : 'translate-x-0' }} absolute start-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-background shadow-sm transition-transform"></span>
        </span>
        <span class="whitespace-nowrap">{{ __('demo.design.mobile_preset') }}</span>
    </a>
</div>
