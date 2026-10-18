<script lang="ts">
    import { AlfakitComponent } from '@alfakit/svelte'
    import { router, usePage } from '@inertiajs/svelte'
    import type { TrackPageProps } from '@/shared/shop'
    import { storefrontLinks, type StorefrontShared } from '@/shared/storefront'
    import Layout from './Layout.svelte'

    /**
     * Order tracking: e-mail + order number look-up, then the customer's orders (a standalone
     * Table) and the selected order's timeline (a standalone Infolist).
     */
    let { lookup, orders, timeline, sample, copy }: TrackPageProps = $props()

    const page = usePage<StorefrontShared>()
    const shared = $derived(page.props as unknown as StorefrontShared)
    const links = $derived(storefrontLinks(shared.renderer))

    // Follow the look-up the server answered (after a search or the sample link) while
    // staying editable: a writable derived resets whenever `lookup` changes.
    let email = $derived(lookup.email)
    let number = $derived(lookup.number)

    function submit(event: SubmitEvent): void {
        event.preventDefault()
        router.get(
            links.track,
            { email: email.trim(), number: number.trim() },
            { preserveScroll: true },
        )
    }

    function useSample(): void {
        if (!sample) return
        email = sample.email
        number = sample.number
        router.get(
            links.track,
            { email: sample.email, number: sample.number },
            { preserveScroll: true },
        )
    }
</script>

<svelte:head>
    <title>{copy.heading} · {shared.storefront.brand}</title>
</svelte:head>

<Layout>
    <section class="mx-auto w-full max-w-6xl px-4 pt-12 pb-16 sm:px-6">
        <h1 class="text-3xl font-bold sm:text-4xl">{copy.heading}</h1>
        <p class="text-brand-navy/75 mt-4 max-w-2xl text-base leading-relaxed">{copy.intro}</p>

        <form
            class="border-brand-navy/10 mt-8 grid gap-4 rounded-3xl border bg-white p-6 shadow-xs sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onsubmit={submit}
        >
            <label class="block text-sm font-medium">
                {copy.fields.email}
                <input
                    bind:value={email}
                    type="email"
                    name="email"
                    required
                    autocomplete="email"
                    class="border-brand-navy/20 focus:border-brand-navy focus:ring-brand-navy/20 mt-1.5 block h-10 w-full rounded-lg border bg-white px-3 text-sm font-normal outline-none focus:ring-2"
                />
            </label>
            <label class="block text-sm font-medium">
                {copy.fields.number}
                <input
                    bind:value={number}
                    type="text"
                    name="number"
                    required
                    placeholder="MA-MAN-00260"
                    class="border-brand-navy/20 focus:border-brand-navy focus:ring-brand-navy/20 mt-1.5 block h-10 w-full rounded-lg border bg-white px-3 font-mono text-sm font-normal outline-none focus:ring-2"
                />
            </label>
            <button
                type="submit"
                class="bg-brand-navy hover:bg-brand-navy/90 inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-white shadow-sm transition-colors"
            >
                {copy.fields.submit}
            </button>
        </form>

        {#if lookup.state === 'not_found'}
            <div
                role="alert"
                class="border-brand-orange/40 bg-brand-orange/10 mt-6 rounded-2xl border p-5"
            >
                <h2 class="text-base font-semibold">{copy.not_found.heading}</h2>
                <p class="text-brand-navy/75 mt-1 text-sm">{copy.not_found.body}</p>
            </div>
        {/if}

        {#if sample}
            <div
                class="border-brand-navy/15 mt-6 flex flex-col gap-3 rounded-2xl border border-dashed bg-white/60 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
                <div>
                    <h2 class="text-base font-semibold">{copy.sample.heading}</h2>
                    <p class="text-brand-navy/70 mt-1 text-sm">
                        {copy.sample.body}
                        <span class="font-mono text-xs">{sample.email} · {sample.number}</span>
                    </p>
                </div>
                <button
                    type="button"
                    class="border-brand-navy/20 hover:border-brand-navy/60 inline-flex h-9 shrink-0 items-center justify-center rounded-full border bg-white px-4 text-sm font-semibold transition-colors"
                    onclick={useSample}
                >
                    {copy.sample.use}
                </button>
            </div>
        {/if}

        {#if orders && timeline}
            <div class="mt-10 space-y-8">
                <div class="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs">
                    <AlfakitComponent component={orders} />
                </div>
                <div class="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs">
                    <AlfakitComponent component={timeline} />
                </div>
                <p class="text-brand-navy/55 text-xs">{copy.components_note}</p>
            </div>
        {/if}
    </section>
</Layout>
