<script lang="ts">
    import { AlfakitComponent } from '@alfakit/svelte'
    import { usePage } from '@inertiajs/svelte'
    import type { ContactPageProps } from '@/shared/shop'
    import type { StorefrontShared } from '@/shared/storefront'
    import Layout from './Layout.svelte'

    /**
     * Contact page: the boutique's details beside a guest standalone Form (validated, rate limited).
     */
    let { form, store, copy }: ContactPageProps = $props()

    const page = usePage<StorefrontShared>()
    const shared = $derived(page.props as unknown as StorefrontShared)
</script>

<svelte:head>
    <title>{copy.heading} · {shared.storefront.brand}</title>
</svelte:head>

<Layout>
    <section class="mx-auto w-full max-w-6xl px-4 pt-12 pb-16 sm:px-6">
        <h1 class="text-3xl font-bold sm:text-4xl">{copy.heading}</h1>
        <p class="text-brand-navy/75 mt-4 max-w-2xl text-base leading-relaxed">{copy.intro}</p>

        <div class="mt-10 grid gap-8 lg:grid-cols-[2fr_3fr]">
            <aside class="border-brand-navy/10 h-fit rounded-3xl border bg-white p-6 shadow-xs">
                <h2 class="text-lg font-bold">{store?.name ?? copy.details.heading}</h2>
                <dl class="text-brand-navy/80 mt-4 space-y-3 text-sm">
                    {#if store?.email}
                        <div>
                            <dt class="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                                {copy.details.email}
                            </dt>
                            <dd class="mt-0.5">
                                <a href={`mailto:${store.email}`} class="hover:text-brand-orange"
                                    >{store.email}</a
                                >
                            </dd>
                        </div>
                    {/if}
                    {#if store?.phone}
                        <div>
                            <dt class="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                                {copy.details.phone}
                            </dt>
                            <dd class="mt-0.5" dir="ltr">{store.phone}</dd>
                        </div>
                    {/if}
                    <div>
                        <dt class="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                            {copy.details.hours}
                        </dt>
                        <dd class="mt-0.5">{copy.details.hours_value}</dd>
                    </div>
                    <div>
                        <dt class="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                            {copy.details.heading}
                        </dt>
                        <dd class="mt-0.5">
                            {copy.details.address}{store?.country ? `, ${store.country}` : ''}
                        </dd>
                    </div>
                </dl>
            </aside>

            <section class="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs sm:p-8">
                <h2 class="text-lg font-bold">{copy.form_heading}</h2>
                <p class="text-brand-navy/60 mt-1 mb-6 text-sm">{copy.form_help}</p>
                <AlfakitComponent component={form} />
            </section>
        </div>
    </section>
</Layout>
