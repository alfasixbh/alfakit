{{-- Dashboard feature tour (Slot::PAGE_HEADER_BEFORE, scoped to the Dashboard; dismissed per session). --}}
<section
    data-slot="tour-banner"
    data-surface
    aria-label="{{ __('showcase.tour.aria') }}"
    class="relative mb-6 overflow-hidden rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs"
>
    <div class="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex min-w-0 flex-1 items-start gap-4">
            <img src="/brand/alfakit-head-color.svg" alt="" class="hidden h-12 w-12 shrink-0 sm:block" />
            <div class="min-w-0">
                <p class="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{{ __('showcase.tour.eyebrow') }}</p>
                <h2 class="mt-1 text-base font-semibold">{{ __('showcase.tour.heading') }}</h2>
                <p class="mt-1 text-sm text-muted-foreground">{{ __('showcase.tour.body') }}</p>
            </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <a href="{{ $showcaseUrl }}" class="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90">
                {{ __('showcase.tour.showcase') }}
            </a>
            <a href="{{ $themingUrl }}" class="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent">
                {{ __('showcase.tour.theming') }}
            </a>
            <span class="hidden text-xs text-muted-foreground 2xl:inline">{{ __('showcase.tour.switcher') }}</span>
            <a
                href="{{ $dismissUrl }}"
                class="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="{{ __('showcase.tour.dismiss') }}"
                title="{{ __('showcase.tour.dismiss') }}"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </a>
        </div>
    </div>
</section>
