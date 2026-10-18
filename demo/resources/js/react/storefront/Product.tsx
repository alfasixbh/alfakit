import {
    choice,
    productUrl,
    stockLabel,
    type ProductPageProps,
    type ProductVariant,
} from '@/shared/shop'
import { fill, formatMoney, storefrontLinks, type StorefrontShared } from '@/shared/storefront'
import { AlfakitComponent } from '@alfakit/react'
import { Head, Link, usePage } from '@inertiajs/react'
import { useState } from 'react'
import Layout from './Layout'

/**
 * Product page: gallery, variants, composition, reviews and the "write a review" standalone form.
 */
export default function Product({ product, reviews, related, reviewForm, copy }: ProductPageProps) {
    const { renderer, locale } = usePage<StorefrontShared>().props
    const links = storefrontLinks(renderer)
    const [imageIndex, setImageIndex] = useState(0)
    const [variant, setVariant] = useState<ProductVariant | null>(
        product.variants.find((item) => item.default) ?? product.variants[0] ?? null,
    )

    const price = variant?.price ?? product.price
    const stock = variant?.stock ?? product.stock
    const image = product.images[imageIndex] ?? product.images[0] ?? null
    const stars = [1, 2, 3, 4, 5]

    return (
        <Layout>
            <Head title={`${product.name} · ${product.brand ?? ''}`} />

            <article className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6">
                <Link
                    href={links.home}
                    className="text-brand-navy/60 hover:text-brand-navy inline-flex items-center gap-1 text-sm"
                >
                    <span aria-hidden="true" className="rtl:inline-block rtl:rotate-180">
                        ←
                    </span>
                    {copy.back}
                </Link>

                <div className="mt-6 grid gap-10 lg:grid-cols-2">
                    <section aria-label={copy.gallery}>
                        <div className="bg-brand-cream border-brand-navy/10 aspect-[4/5] overflow-hidden rounded-3xl border bg-white">
                            {image && (
                                <img
                                    src={image}
                                    alt={fill(copy.image_of, {
                                        name: product.name,
                                        index: imageIndex + 1,
                                    })}
                                    className="h-full w-full object-cover"
                                />
                            )}
                        </div>
                        {product.images.length > 1 && (
                            <ul className="mt-4 flex gap-3">
                                {product.images.map((url, index) => (
                                    <li key={url}>
                                        <button
                                            type="button"
                                            onClick={() => setImageIndex(index)}
                                            aria-label={fill(copy.image_of, {
                                                name: product.name,
                                                index: index + 1,
                                            })}
                                            aria-pressed={index === imageIndex}
                                            className={
                                                index === imageIndex
                                                    ? 'border-brand-orange h-20 w-16 overflow-hidden rounded-xl border-2 bg-white'
                                                    : 'border-brand-navy/10 hover:border-brand-navy/40 h-20 w-16 overflow-hidden rounded-xl border bg-white transition-colors'
                                            }
                                        >
                                            <img
                                                src={url}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section>
                        {product.brand && (
                            <p className="text-brand-navy/55 text-xs tracking-[0.25em] uppercase">
                                {fill(copy.by, { brand: product.brand })}
                            </p>
                        )}
                        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{product.name}</h1>
                        <p className="text-brand-navy/60 mt-2 text-sm">
                            {product.concentration}
                            {product.size ? ` · ${product.size} ml` : ''}
                            {' · '}
                            <span className="font-mono text-xs">
                                {copy.sku} {product.sku}
                            </span>
                        </p>

                        {reviews.count > 0 && reviews.average !== null && (
                            <p className="mt-4 flex items-center gap-2 text-sm">
                                <span
                                    className="text-brand-orange flex gap-0.5"
                                    role="img"
                                    aria-label={fill(copy.reviews.average, {
                                        average: reviews.average,
                                    })}
                                >
                                    {stars.map((step) => (
                                        <span
                                            key={step}
                                            className={
                                                step <= Math.round(reviews.average ?? 0)
                                                    ? ''
                                                    : 'opacity-25'
                                            }
                                        >
                                            ★
                                        </span>
                                    ))}
                                </span>
                                <span className="text-brand-navy/70">
                                    {choice(copy.reviews.count, reviews.count)}
                                </span>
                            </p>
                        )}

                        <p className="mt-6 flex items-baseline gap-3">
                            <span className="text-3xl font-bold">
                                {formatMoney(price, product.currency, locale)}
                            </span>
                            {product.compareAtPrice && product.compareAtPrice > price && (
                                <s className="text-brand-navy/45 text-sm">
                                    {fill(copy.compare, {
                                        price: formatMoney(
                                            product.compareAtPrice,
                                            product.currency,
                                            locale,
                                        ),
                                    })}
                                </s>
                            )}
                        </p>
                        <p
                            className={
                                stock <= 0
                                    ? 'mt-1 text-sm font-medium text-red-700'
                                    : stock <= 15
                                      ? 'text-brand-orange mt-1 text-sm font-medium'
                                      : 'mt-1 text-sm font-medium text-emerald-700'
                            }
                        >
                            {stockLabel(stock, copy.stock)}
                        </p>
                        <p className="text-brand-navy/50 mt-1 text-xs">{copy.currency_note}</p>

                        {product.variants.length > 0 && (
                            <fieldset className="mt-6">
                                <legend className="text-sm font-semibold">{copy.sizes}</legend>
                                <p className="text-brand-navy/60 text-xs">{copy.choose_size}</p>
                                <div
                                    className="mt-3 flex flex-wrap gap-2"
                                    role="radiogroup"
                                    aria-label={copy.sizes}
                                >
                                    {product.variants.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={variant?.id === item.id}
                                            onClick={() => setVariant(item)}
                                            className={
                                                variant?.id === item.id
                                                    ? 'bg-brand-navy rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm'
                                                    : 'border-brand-navy/20 hover:border-brand-navy/60 rounded-full border bg-white px-4 py-2 text-sm font-medium transition-colors'
                                            }
                                        >
                                            {item.name}
                                            <span className="ms-2 text-xs opacity-70">
                                                {formatMoney(item.price, product.currency, locale)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                        )}

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href={`${links.contact}?product=${encodeURIComponent(product.name)}`}
                                className="bg-brand-orange hover:bg-brand-orange/90 inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
                            >
                                {copy.enquire}
                            </Link>
                            <Link
                                href={links.track}
                                className="border-brand-navy/20 hover:border-brand-navy/60 inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors"
                            >
                                {copy.track}
                            </Link>
                        </div>

                        {product.description && (
                            <div
                                className="prose prose-sm text-brand-navy/80 mt-8 max-w-none"
                                dangerouslySetInnerHTML={{ __html: product.description }}
                            />
                        )}

                        <section className="border-brand-navy/10 mt-8 rounded-2xl border bg-white p-5">
                            <h2 className="text-base font-semibold">{copy.notes.heading}</h2>
                            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                                {(['top', 'heart', 'base'] as const).map((layer) => (
                                    <div key={layer}>
                                        <dt className="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                                            {copy.notes[layer]}
                                        </dt>
                                        <dd className="mt-1 text-sm">
                                            {product.notes[layer].join(', ') || '—'}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>

                        <section className="mt-6">
                            <h2 className="text-base font-semibold">{copy.details.heading}</h2>
                            <dl className="text-brand-navy/80 mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                                <dt className="text-brand-navy/55">{copy.details.concentration}</dt>
                                <dd>{product.concentration}</dd>
                                <dt className="text-brand-navy/55">{copy.details.audience}</dt>
                                <dd>{product.audience}</dd>
                                {product.size && (
                                    <>
                                        <dt className="text-brand-navy/55">{copy.details.size}</dt>
                                        <dd>{product.size} ml</dd>
                                    </>
                                )}
                                {product.category && (
                                    <>
                                        <dt className="text-brand-navy/55">
                                            {copy.details.category}
                                        </dt>
                                        <dd>{product.category}</dd>
                                    </>
                                )}
                                {product.tags.length > 0 && (
                                    <>
                                        <dt className="text-brand-navy/55">{copy.details.tags}</dt>
                                        <dd className="flex flex-wrap gap-1.5">
                                            {product.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="border-brand-navy/15 rounded-full border bg-white px-2 py-0.5 text-xs"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </dd>
                                    </>
                                )}
                            </dl>
                        </section>
                    </section>
                </div>

                <section
                    className="mt-16 grid gap-10 lg:grid-cols-[3fr_2fr]"
                    aria-labelledby="reviews-heading"
                >
                    <div>
                        <h2 id="reviews-heading" className="text-2xl font-bold">
                            {copy.reviews.heading}
                        </h2>
                        <p className="text-brand-navy/60 mt-1 text-sm">
                            {choice(copy.reviews.count, reviews.count)}
                            {reviews.average !== null
                                ? ` · ${fill(copy.reviews.average, { average: reviews.average })}`
                                : ''}
                        </p>
                        {reviews.items.length === 0 ? (
                            <p className="border-brand-navy/20 text-brand-navy/60 mt-6 rounded-2xl border border-dashed p-8 text-center text-sm">
                                {copy.reviews.empty}
                            </p>
                        ) : (
                            <ul className="mt-6 space-y-4">
                                {reviews.items.map((review) => (
                                    <li
                                        key={review.id}
                                        className="border-brand-navy/10 rounded-2xl border bg-white p-5 shadow-xs"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span
                                                className="text-brand-orange text-sm"
                                                role="img"
                                                aria-label={fill(copy.reviews.average, {
                                                    average: review.rating,
                                                })}
                                            >
                                                {stars.map((step) => (
                                                    <span
                                                        key={step}
                                                        className={
                                                            step <= review.rating
                                                                ? ''
                                                                : 'opacity-25'
                                                        }
                                                    >
                                                        ★
                                                    </span>
                                                ))}
                                            </span>
                                            <span className="text-brand-navy/55 text-xs">
                                                {review.date}
                                            </span>
                                        </div>
                                        {review.title && (
                                            <h3 className="mt-2 text-base font-semibold">
                                                {review.title}
                                            </h3>
                                        )}
                                        {review.body && (
                                            <p className="text-brand-navy/80 mt-1 text-sm leading-relaxed">
                                                {review.body}
                                            </p>
                                        )}
                                        <p className="text-brand-navy/60 mt-3 flex flex-wrap items-center gap-2 text-xs">
                                            <span className="text-brand-navy font-medium">
                                                {review.author}
                                            </span>
                                            {review.verified && (
                                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                                                    {copy.reviews.verified}
                                                </span>
                                            )}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <aside className="border-brand-navy/10 h-fit rounded-3xl border bg-white p-6 shadow-xs">
                        <h2 className="text-lg font-bold">{copy.reviews.write}</h2>
                        <p className="text-brand-navy/60 mt-1 mb-5 text-sm">
                            {copy.reviews.write_help}
                        </p>
                        <AlfakitComponent component={reviewForm} />
                    </aside>
                </section>

                {related.length > 0 && (
                    <section className="mt-16" aria-labelledby="related-heading">
                        <h2 id="related-heading" className="text-2xl font-bold">
                            {copy.related}
                        </h2>
                        <ul className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
                            {related.map((item) => (
                                <li
                                    key={item.id}
                                    className="group border-brand-navy/10 overflow-hidden rounded-2xl border bg-white shadow-xs transition-shadow hover:shadow-md"
                                >
                                    <Link href={productUrl(renderer, item.slug)}>
                                        <div className="bg-brand-cream aspect-[4/5] overflow-hidden">
                                            {item.image && (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                                    loading="lazy"
                                                />
                                            )}
                                        </div>
                                        <div className="p-4">
                                            {item.brand && (
                                                <p className="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                                                    {fill(copy.by, { brand: item.brand })}
                                                </p>
                                            )}
                                            <h3 className="mt-1 text-sm font-semibold">
                                                {item.name}
                                            </h3>
                                            <p className="mt-2 text-sm font-semibold">
                                                {formatMoney(item.price, item.currency, locale)}
                                            </p>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </article>
        </Layout>
    )
}
