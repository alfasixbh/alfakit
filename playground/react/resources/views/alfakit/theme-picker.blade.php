{{-- Playground only: rendered into the top bar through Panel::slot(Slot::TOPBAR_END, …). --}}
<label class="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
    <span>{{ __('playground.theme.label') }}</span>
    <select
        class="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        onchange="window.location.href = '/demo/theme/' + this.value"
        aria-label="{{ __('playground.theme.label') }}"
    >
        @foreach ($themes as $theme)
            <option value="{{ $theme->getName() }}" @selected($theme->getName() === $current)>{{ $theme->getLabel() }}</option>
        @endforeach
    </select>
</label>
