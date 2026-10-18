import { fill, formatMoney, type HomeProps, type StorefrontShared } from '@/shared/storefront'
import { Head, usePage } from '@inertiajs/react'
import Layout from './Layout'

export default function Home({ store, featured, copy }: HomeProps) {
    const { locale, storefront } = usePage<StorefrontShared>().props

    return (
        <Layout>
            <Head title={storefront.brand} />

            <section className="relative mx-auto w-full max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20">
                <img
                    src="/brand/alfakit-mascot-color.svg"
                    alt={storefront.strip.mascot_alt}
                    className="pointer-events-none absolute end-6 top-10 hidden h-56 w-56 drop-shadow-xl lg:block xl:h-64 xl:w-64"
                />
                <p className="text-brand-orange text-xs font-semibold tracking-[0.25em] uppercase">
                    {copy.hero.eyebrow}
                </p>
                <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-bold sm:text-5xl">
                    {copy.hero.title}
                </h1>
                <p className="text-brand-navy/75 mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">
                    {copy.hero.body}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                    <a
                        href={storefront.adminUrl}
                        className="bg-brand-navy hover:bg-brand-navy/90 inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
                    >
                        {copy.hero.cta}
                    </a>
                    <a
                        href={storefront.docsUrl}
                        target="_blank"
                        rel="noopener"
                        className="border-brand-navy/20 text-brand-navy hover:border-brand-navy/50 inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors"
                    >
                        {copy.hero.secondary}
                    </a>
                </div>
                {store && (
                    <p className="text-brand-navy/60 mt-6 text-sm">
                        {store.name}
                        {store.tagline ? ` · ${store.tagline}` : ''}
                    </p>
                )}
            </section>

            <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
                <h2 className="text-2xl font-bold">{copy.featured}</h2>
                {featured.length === 0 ? (
                    <p className="border-brand-navy/20 text-brand-navy/60 mt-6 rounded-2xl border border-dashed p-8 text-center text-sm">
                        {copy.empty}
                    </p>
                ) : (
                    <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {featured.map((product) => (
                            <li
                                key={product.id}
                                className="group border-brand-navy/10 overflow-hidden rounded-2xl border bg-white shadow-xs transition-shadow hover:shadow-md"
                            >
                                <div className="bg-brand-cream aspect-[4/5] overflow-hidden">
                                    {product.image && (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                            loading="lazy"
                                        />
                                    )}
                                </div>
                                <div className="p-4">
                                    {product.brand && (
                                        <p className="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                                            {fill(copy.by, { brand: product.brand })}
                                        </p>
                                    )}
                                    <h3 className="mt-1 text-base font-semibold">{product.name}</h3>
                                    <p className="text-brand-navy/60 mt-0.5 text-xs">
                                        {product.concentration}
                                        {product.size ? ` · ${product.size} ml` : ''}
                                    </p>
                                    <p className="mt-3 flex items-baseline gap-2 text-sm font-semibold">
                                        {formatMoney(product.price, product.currency, locale)}
                                        {product.compareAtPrice && (
                                            <s className="text-brand-navy/45 text-xs font-normal">
                                                {formatMoney(
                                                    product.compareAtPrice,
                                                    product.currency,
                                                    locale,
                                                )}
                                            </s>
                                        )}
                                    </p>
                                    <p className="text-brand-navy/55 mt-2 line-clamp-2 text-[11px] leading-relaxed">
                                        {fill(copy.notes, {
                                            top: product.notes.top,
                                            heart: product.notes.heart,
                                            base: product.notes.base,
                                        })}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </Layout>
    )
}
