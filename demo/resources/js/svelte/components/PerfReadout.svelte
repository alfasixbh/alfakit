<script lang="ts">
    import { Icon, useFormatter, useHydrated, useT } from '@alfakit/svelte'
    import {
        PERF_DEFAULTS,
        formatBytes,
        formatMs,
        measureInternalRequests,
        measurePage,
        observeRequests,
        type InternalRequest,
        type PerfReadoutComponent,
        type Transfer,
    } from '@/shared/showcase'

    /**
     * Performance showcase: what the browser actually transferred for this page and for the
     * internal requests (`/_alfakit/*`), read from the Resource Timing API and the
     * `Server-Timing` header. Browser-only; the server renders the frame.
     */
    let { component }: { component: PerfReadoutComponent } = $props()

    const settings = $derived(component.props ?? PERF_DEFAULTS)
    const t = useT()
    const format = useFormatter()
    const hydrated = useHydrated()
    let page = $state<Transfer | null>(null)
    let requests = $state<InternalRequest[]>([])

    function refresh(): void {
        page = measurePage()
        requests = measureInternalRequests()
    }

    $effect(() => {
        if (!hydrated.current) return

        refresh()

        return observeRequests(refresh)
    })

    const unknown = $derived(t('showcase.performance.readout.unknown'))
    const number = (value: number, options?: Intl.NumberFormatOptions) =>
        format.current.number(value, options)
</script>

<section
    data-surface
    data-slot="perf-readout"
    class="bg-card text-card-foreground flex h-full flex-col gap-4 rounded-xl border p-5 shadow-sm"
    aria-live="polite"
>
    <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
            <h3 class="text-base leading-none font-semibold">
                {t('showcase.performance.readout.heading')}
            </h3>
            <p class="text-muted-foreground mt-1.5 text-sm">
                {t('showcase.performance.readout.body')}
            </p>
        </div>
        <button
            type="button"
            class="hover:bg-accent inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors"
            onclick={refresh}
        >
            <Icon name="refresh-cw" class="size-3.5" />
            {t('showcase.performance.readout.refresh')}
        </button>
    </header>

    <dl class="grid gap-3 sm:grid-cols-3">
        <div class="bg-muted/40 rounded-lg border p-3">
            <dt class="text-muted-foreground text-xs">{t('showcase.performance.readout.page')}</dt>
            <dd class="mt-1 text-xl font-semibold tabular-nums">
                {formatBytes(page?.size ?? null, number, unknown)}
            </dd>
            <dd class="text-muted-foreground text-xs">
                {t('showcase.performance.readout.rows', { rows: number(settings.rows) })} ·
                {t('showcase.performance.readout.items', { items: number(settings.items) })}
            </dd>
        </div>
        <div class="bg-muted/40 rounded-lg border p-3">
            <dt class="text-muted-foreground text-xs">{t('showcase.performance.readout.time')}</dt>
            <dd class="mt-1 text-xl font-semibold tabular-nums">
                {formatMs(page?.duration ?? null, number, unknown)}
            </dd>
            <dd class="text-muted-foreground text-xs">
                {t('showcase.performance.readout.server')}: {formatMs(
                    page?.server ?? null,
                    number,
                    unknown,
                )}
            </dd>
        </div>
        <div class="bg-muted/40 rounded-lg border p-3">
            <dt class="text-muted-foreground text-xs">
                {t('showcase.performance.readout.requests')}
            </dt>
            <dd class="mt-1 text-xl font-semibold tabular-nums">{number(requests.length)}</dd>
            <dd class="text-muted-foreground text-xs">
                <a
                    href={settings.docsUrl}
                    target="_blank"
                    rel="noopener"
                    class="text-primary underline-offset-4 hover:underline"
                    >{t('showcase.performance.readout.docs')}</a
                >
            </dd>
        </div>
    </dl>

    {#if requests.length === 0}
        <p class="text-muted-foreground text-sm">{t('showcase.performance.readout.none')}</p>
    {:else}
        <table class="w-full text-sm">
            <thead class="text-muted-foreground text-xs">
                <tr>
                    <th scope="col" class="py-1 text-start font-medium">
                        {t('showcase.performance.readout.requests')}
                    </th>
                    <th scope="col" class="py-1 text-end font-medium">
                        {t('showcase.performance.readout.size')}
                    </th>
                    <th scope="col" class="py-1 text-end font-medium">
                        {t('showcase.performance.readout.time')}
                    </th>
                    <th scope="col" class="py-1 text-end font-medium">
                        {t('showcase.performance.readout.server')}
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each requests as request (request.id)}
                    <tr class="border-t">
                        <td class="py-1.5 font-mono text-xs">{request.kind}</td>
                        <td class="py-1.5 text-end tabular-nums"
                            >{formatBytes(request.size, number, unknown)}</td
                        >
                        <td class="py-1.5 text-end tabular-nums"
                            >{formatMs(request.duration, number, unknown)}</td
                        >
                        <td class="py-1.5 text-end tabular-nums"
                            >{formatMs(request.server, number, unknown)}</td
                        >
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</section>
