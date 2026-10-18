<script lang="ts">
    import { usePage } from '@inertiajs/svelte'
    import { fill, formatMoney, type HomeProps, type StorefrontShared } from '@/shared/storefront'
    import Layout from './Layout.svelte'

    let { store, featured, copy }: HomeProps = $props()

    const page = usePage<StorefrontShared>()
    const shared = $derived(page.props as unknown as StorefrontShared)
</script>

<svelte:head>
    <title>{shared.storefront.brand}</title>
</svelte:head>

<Layout>
    <section class="relative mx-auto w-full max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20">
        <img
            src="/brand/alfakit-mascot-color.svg"
            alt={shared.storefront.strip.mascot_alt}
            class="pointer-events-none absolute end-6 top-10 hidden h-56 w-56 drop-shadow-xl lg:block xl:h-64 xl:w-64"
        />
        <p class="text-brand-orange text-xs font-semibold tracking-[0.25em] uppercase">
            {copy.hero.eyebrow}
        </p>
        <h1 class="mt-4 max-w-3xl text-4xl leading-[1.05] font-bold sm:text-5xl">
            {copy.hero.title}
        </h1>
        <p class="text-brand-navy/75 mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">
            {copy.hero.body}
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
            <a
                href={shared.storefront.adminUrl}
                class="bg-brand-navy hover:bg-brand-navy/90 inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
            >
                {copy.hero.cta}
            </a>
            <a
                href={shared.storefront.docsUrl}
                target="_blank"
                rel="noopener"
                class="border-brand-navy/20 text-brand-navy hover:border-brand-navy/50 inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors"
            >
                {copy.hero.secondary}
            </a>
        </div>
        {#if store}
            <p class="text-brand-navy/60 mt-6 text-sm">
                {store.name}{store.tagline ? ` · ${store.tagline}` : ''}
            </p>
        {/if}
    </section>

    <section class="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <h2 class="text-2xl font-bold">{copy.featured}</h2>
        {#if featured.length === 0}
            <p
                class="border-brand-navy/20 text-brand-navy/60 mt-6 rounded-2xl border border-dashed p-8 text-center text-sm"
            >
                {copy.empty}
            </p>
        {:else}
            <ul class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {#each featured as product (product.id)}
                    <li
                        class="group border-brand-navy/10 overflow-hidden rounded-2xl border bg-white shadow-xs transition-shadow hover:shadow-md"
                    >
                        <div class="bg-brand-cream aspect-[4/5] overflow-hidden">
                            {#if product.image}
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                    loading="lazy"
                                />
                            {/if}
                        </div>
                        <div class="p-4">
                            {#if product.brand}
                                <p
                                    class="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase"
                                >
                                    {fill(copy.by, { brand: product.brand })}
                                </p>
                            {/if}
                            <h3 class="mt-1 text-base font-semibold">{product.name}</h3>
                            <p class="text-brand-navy/60 mt-0.5 text-xs">
                                {product.concentration}{product.size ? ` · ${product.size} ml` : ''}
                            </p>
                            <p class="mt-3 flex items-baseline gap-2 text-sm font-semibold">
                                {formatMoney(product.price, product.currency, shared.locale)}
                                {#if product.compareAtPrice}
                                    <s class="text-brand-navy/45 text-xs font-normal"
                                        >{formatMoney(
                                            product.compareAtPrice,
                                            product.currency,
                                            shared.locale,
                                        )}</s
                                    >
                                {/if}
                            </p>
                            <p
                                class="text-brand-navy/55 mt-2 line-clamp-2 text-[11px] leading-relaxed"
                            >
                                {fill(copy.notes, {
                                    top: product.notes.top,
                                    heart: product.notes.heart,
                                    base: product.notes.base,
                                })}
                            </p>
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </section>
</Layout>
