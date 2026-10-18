<script lang="ts">
    import { AlfakitComponent } from '@alfakit/svelte'
    import { inertia, usePage } from '@inertiajs/svelte'
    import {
        choice,
        productUrl,
        stockLabel,
        type ProductPageProps,
        type ProductVariant,
    } from '@/shared/shop'
    import { fill, formatMoney, storefrontLinks, type StorefrontShared } from '@/shared/storefront'
    import Layout from './Layout.svelte'

    /**
     * Product page: gallery, variants, composition, reviews and the "write a review" standalone form.
     */
    let { product, reviews, related, reviewForm, copy }: ProductPageProps = $props()

    const page = usePage<StorefrontShared>()
    const shared = $derived(page.props as unknown as StorefrontShared)
    const links = $derived(storefrontLinks(shared.renderer))

    let imageIndex = $state(0)
    // The default variant of the product shown, still selectable: a writable derived resets
    // when Inertia swaps in another product (e.g. a related one) on the same page component.
    let variant = $derived<ProductVariant | null>(
        product.variants.find((item) => item.default) ?? product.variants[0] ?? null,
    )

    const price = $derived(variant?.price ?? product.price)
    const stock = $derived(variant?.stock ?? product.stock)
    const image = $derived(product.images[imageIndex] ?? product.images[0] ?? null)
    const stockClass = $derived(
        stock <= 0
            ? 'mt-1 text-sm font-medium text-red-700'
            : stock <= 15
              ? 'text-brand-orange mt-1 text-sm font-medium'
              : 'mt-1 text-sm font-medium text-emerald-700',
    )
    const stars = [1, 2, 3, 4, 5]
    const layers = ['top', 'heart', 'base'] as const
</script>

<svelte:head>
    <title>{product.name} · {product.brand ?? ''}</title>
</svelte:head>

<Layout>
    <article class="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6">
        <a
            href={links.home}
            use:inertia
            class="text-brand-navy/60 hover:text-brand-navy inline-flex items-center gap-1 text-sm"
        >
            <span aria-hidden="true" class="rtl:inline-block rtl:rotate-180">←</span>
            {copy.back}
        </a>

        <div class="mt-6 grid gap-10 lg:grid-cols-2">
            <section aria-label={copy.gallery}>
                <div
                    class="bg-brand-cream border-brand-navy/10 aspect-[4/5] overflow-hidden rounded-3xl border bg-white"
                >
                    {#if image}
                        <img
                            src={image}
                            alt={fill(copy.image_of, { name: product.name, index: imageIndex + 1 })}
                            class="h-full w-full object-cover"
                        />
                    {/if}
                </div>
                {#if product.images.length > 1}
                    <ul class="mt-4 flex gap-3">
                        {#each product.images as url, index (url)}
                            <li>
                                <button
                                    type="button"
                                    aria-label={fill(copy.image_of, {
                                        name: product.name,
                                        index: index + 1,
                                    })}
                                    aria-pressed={index === imageIndex}
                                    class={index === imageIndex
                                        ? 'border-brand-orange h-20 w-16 overflow-hidden rounded-xl border-2 bg-white'
                                        : 'border-brand-navy/10 hover:border-brand-navy/40 h-20 w-16 overflow-hidden rounded-xl border bg-white transition-colors'}
                                    onclick={() => (imageIndex = index)}
                                >
                                    <img src={url} alt="" class="h-full w-full object-cover" />
                                </button>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </section>

            <section>
                {#if product.brand}
                    <p class="text-brand-navy/55 text-xs tracking-[0.25em] uppercase">
                        {fill(copy.by, { brand: product.brand })}
                    </p>
                {/if}
                <h1 class="mt-2 text-3xl font-bold sm:text-4xl">{product.name}</h1>
                <p class="text-brand-navy/60 mt-2 text-sm">
                    {product.concentration}{product.size ? ` · ${product.size} ml` : ''} ·
                    <span class="font-mono text-xs">{copy.sku} {product.sku}</span>
                </p>

                {#if reviews.count > 0 && reviews.average !== null}
                    <p class="mt-4 flex items-center gap-2 text-sm">
                        <span
                            class="text-brand-orange flex gap-0.5"
                            role="img"
                            aria-label={fill(copy.reviews.average, { average: reviews.average })}
                        >
                            {#each stars as step (step)}
                                <span
                                    class={step <= Math.round(reviews.average ?? 0)
                                        ? ''
                                        : 'opacity-25'}>★</span
                                >
                            {/each}
                        </span>
                        <span class="text-brand-navy/70"
                            >{choice(copy.reviews.count, reviews.count)}</span
                        >
                    </p>
                {/if}

                <p class="mt-6 flex items-baseline gap-3">
                    <span class="text-3xl font-bold">
                        {formatMoney(price, product.currency, shared.locale)}
                    </span>
                    {#if product.compareAtPrice && product.compareAtPrice > price}
                        <s class="text-brand-navy/45 text-sm"
                            >{fill(copy.compare, {
                                price: formatMoney(
                                    product.compareAtPrice,
                                    product.currency,
                                    shared.locale,
                                ),
                            })}</s
                        >
                    {/if}
                </p>
                <p class={stockClass}>{stockLabel(stock, copy.stock)}</p>
                <p class="text-brand-navy/50 mt-1 text-xs">{copy.currency_note}</p>

                {#if product.variants.length > 0}
                    <fieldset class="mt-6">
                        <legend class="text-sm font-semibold">{copy.sizes}</legend>
                        <p class="text-brand-navy/60 text-xs">{copy.choose_size}</p>
                        <div
                            class="mt-3 flex flex-wrap gap-2"
                            role="radiogroup"
                            aria-label={copy.sizes}
                        >
                            {#each product.variants as item (item.id)}
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={variant?.id === item.id}
                                    class={variant?.id === item.id
                                        ? 'bg-brand-navy rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm'
                                        : 'border-brand-navy/20 hover:border-brand-navy/60 rounded-full border bg-white px-4 py-2 text-sm font-medium transition-colors'}
                                    onclick={() => (variant = item)}
                                >
                                    {item.name}
                                    <span class="ms-2 text-xs opacity-70"
                                        >{formatMoney(
                                            item.price,
                                            product.currency,
                                            shared.locale,
                                        )}</span
                                    >
                                </button>
                            {/each}
                        </div>
                    </fieldset>
                {/if}

                <div class="mt-8 flex flex-wrap gap-3">
                    <a
                        href={`${links.contact}?product=${encodeURIComponent(product.name)}`}
                        use:inertia
                        class="bg-brand-orange hover:bg-brand-orange/90 inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
                        >{copy.enquire}</a
                    >
                    <a
                        href={links.track}
                        use:inertia
                        class="border-brand-navy/20 hover:border-brand-navy/60 inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors"
                        >{copy.track}</a
                    >
                </div>

                {#if product.description}
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -- rich text authored in the admin panel -->
                    <div class="prose prose-sm text-brand-navy/80 mt-8 max-w-none">
                        {@html product.description}
                    </div>
                {/if}

                <section class="border-brand-navy/10 mt-8 rounded-2xl border bg-white p-5">
                    <h2 class="text-base font-semibold">{copy.notes.heading}</h2>
                    <dl class="mt-3 grid gap-3 sm:grid-cols-3">
                        {#each layers as layer (layer)}
                            <div>
                                <dt
                                    class="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase"
                                >
                                    {copy.notes[layer]}
                                </dt>
                                <dd class="mt-1 text-sm">
                                    {product.notes[layer].join(', ') || '—'}
                                </dd>
                            </div>
                        {/each}
                    </dl>
                </section>

                <section class="mt-6">
                    <h2 class="text-base font-semibold">{copy.details.heading}</h2>
                    <dl
                        class="text-brand-navy/80 mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm"
                    >
                        <dt class="text-brand-navy/55">{copy.details.concentration}</dt>
                        <dd>{product.concentration}</dd>
                        <dt class="text-brand-navy/55">{copy.details.audience}</dt>
                        <dd>{product.audience}</dd>
                        {#if product.size}
                            <dt class="text-brand-navy/55">{copy.details.size}</dt>
                            <dd>{product.size} ml</dd>
                        {/if}
                        {#if product.category}
                            <dt class="text-brand-navy/55">{copy.details.category}</dt>
                            <dd>{product.category}</dd>
                        {/if}
                        {#if product.tags.length > 0}
                            <dt class="text-brand-navy/55">{copy.details.tags}</dt>
                            <dd class="flex flex-wrap gap-1.5">
                                {#each product.tags as tag (tag)}
                                    <span
                                        class="border-brand-navy/15 rounded-full border bg-white px-2 py-0.5 text-xs"
                                        >{tag}</span
                                    >
                                {/each}
                            </dd>
                        {/if}
                    </dl>
                </section>
            </section>
        </div>

        <section class="mt-16 grid gap-10 lg:grid-cols-[3fr_2fr]" aria-labelledby="reviews-heading">
            <div>
                <h2 id="reviews-heading" class="text-2xl font-bold">{copy.reviews.heading}</h2>
                <p class="text-brand-navy/60 mt-1 text-sm">
                    {choice(copy.reviews.count, reviews.count)}{reviews.average !== null
                        ? ` · ${fill(copy.reviews.average, { average: reviews.average })}`
                        : ''}
                </p>
                {#if reviews.items.length === 0}
                    <p
                        class="border-brand-navy/20 text-brand-navy/60 mt-6 rounded-2xl border border-dashed p-8 text-center text-sm"
                    >
                        {copy.reviews.empty}
                    </p>
                {:else}
                    <ul class="mt-6 space-y-4">
                        {#each reviews.items as review (review.id)}
                            <li
                                class="border-brand-navy/10 rounded-2xl border bg-white p-5 shadow-xs"
                            >
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                    <span
                                        class="text-brand-orange text-sm"
                                        role="img"
                                        aria-label={fill(copy.reviews.average, {
                                            average: review.rating,
                                        })}
                                    >
                                        {#each stars as step (step)}
                                            <span class={step <= review.rating ? '' : 'opacity-25'}
                                                >★</span
                                            >
                                        {/each}
                                    </span>
                                    <span class="text-brand-navy/55 text-xs">{review.date}</span>
                                </div>
                                {#if review.title}
                                    <h3 class="mt-2 text-base font-semibold">{review.title}</h3>
                                {/if}
                                {#if review.body}
                                    <p class="text-brand-navy/80 mt-1 text-sm leading-relaxed">
                                        {review.body}
                                    </p>
                                {/if}
                                <p
                                    class="text-brand-navy/60 mt-3 flex flex-wrap items-center gap-2 text-xs"
                                >
                                    <span class="text-brand-navy font-medium">{review.author}</span>
                                    {#if review.verified}
                                        <span
                                            class="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700"
                                            >{copy.reviews.verified}</span
                                        >
                                    {/if}
                                </p>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>

            <aside class="border-brand-navy/10 h-fit rounded-3xl border bg-white p-6 shadow-xs">
                <h2 class="text-lg font-bold">{copy.reviews.write}</h2>
                <p class="text-brand-navy/60 mt-1 mb-5 text-sm">{copy.reviews.write_help}</p>
                <AlfakitComponent component={reviewForm} />
            </aside>
        </section>

        {#if related.length > 0}
            <section class="mt-16" aria-labelledby="related-heading">
                <h2 id="related-heading" class="text-2xl font-bold">{copy.related}</h2>
                <ul class="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
                    {#each related as item (item.id)}
                        <li
                            class="group border-brand-navy/10 overflow-hidden rounded-2xl border bg-white shadow-xs transition-shadow hover:shadow-md"
                        >
                            <a href={productUrl(shared.renderer, item.slug)} use:inertia>
                                <div class="bg-brand-cream aspect-[4/5] overflow-hidden">
                                    {#if item.image}
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                            loading="lazy"
                                        />
                                    {/if}
                                </div>
                                <div class="p-4">
                                    {#if item.brand}
                                        <p
                                            class="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase"
                                        >
                                            {fill(copy.by, { brand: item.brand })}
                                        </p>
                                    {/if}
                                    <h3 class="mt-1 text-sm font-semibold">{item.name}</h3>
                                    <p class="mt-2 text-sm font-semibold">
                                        {formatMoney(item.price, item.currency, shared.locale)}
                                    </p>
                                </div>
                            </a>
                        </li>
                    {/each}
                </ul>
            </section>
        {/if}
    </article>
</Layout>
