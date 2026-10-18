<script lang="ts">
    import type { WholesalePageProps } from '@/shared/plugins'
    import type { StorefrontShared } from '@/shared/storefront'
    import { AlfakitComponent } from '@alfakit/svelte'
    import { usePage } from '@inertiajs/svelte'
    import Layout from './Layout.svelte'

    /** The wholesale enquiry form, built in the panel with alfasix/alfakit-forms. */
    let { form, copy }: WholesalePageProps = $props()
    const page = usePage<StorefrontShared>()
    const brand = $derived((page.props as unknown as StorefrontShared).storefront.brand)
</script>

<svelte:head>
    <title>{copy.wholesale_title} · {brand}</title>
</svelte:head>

<Layout>
    <section class="mx-auto w-full max-w-3xl px-4 pt-12 pb-16 sm:px-6">
        <h1 class="text-3xl font-bold sm:text-4xl">{copy.wholesale_title}</h1>
        <p class="text-brand-navy/75 mt-4 text-base leading-relaxed">{copy.wholesale_intro}</p>
        <div class="border-brand-navy/10 mt-8 rounded-3xl border bg-white p-6 shadow-xs sm:p-8">
            {#if form}
                <AlfakitComponent component={form} />
            {:else}
                <p class="text-brand-navy/70 text-sm">{copy.wholesale_unavailable}</p>
            {/if}
        </div>
    </section>
</Layout>
