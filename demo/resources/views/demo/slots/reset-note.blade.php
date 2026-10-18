{{-- Sidebar footer: what this is and where the docs are. --}}
<div class="flex flex-col gap-0.5 px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
    <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span class="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-(--alfakit-secondary)" aria-hidden="true"></span>
        {{ __('demo.footer.note') }}
    </span>
    @php($minutes = 60 - now()->minute)
    <span class="ps-3 tabular-nums" title="{{ __('demo.reset.title') }}" data-slot="reset-countdown">{{ $minutes <= 1 ? __('demo.reset.soon') : __('demo.reset.in', ['minutes' => $minutes]) }}</span>
    <a href="{{ $docs }}" target="_blank" rel="noopener" class="font-medium text-foreground/80 underline-offset-2 hover:underline">{{ __('demo.footer.docs') }}</a>
</div>
