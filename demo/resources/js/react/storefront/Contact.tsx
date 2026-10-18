import type { ContactPageProps } from '@/shared/shop'
import type { StorefrontShared } from '@/shared/storefront'
import { AlfakitComponent } from '@alfakit/react'
import { Head, usePage } from '@inertiajs/react'
import Layout from './Layout'

/**
 * Contact page: the boutique's details beside a guest standalone Form (validated, rate limited).
 */
export default function Contact({ form, store, copy }: ContactPageProps) {
    const { storefront } = usePage<StorefrontShared>().props

    return (
        <Layout>
            <Head title={`${copy.heading} · ${storefront.brand}`} />

            <section className="mx-auto w-full max-w-6xl px-4 pt-12 pb-16 sm:px-6">
                <h1 className="text-3xl font-bold sm:text-4xl">{copy.heading}</h1>
                <p className="text-brand-navy/75 mt-4 max-w-2xl text-base leading-relaxed">
                    {copy.intro}
                </p>

                <div className="mt-10 grid gap-8 lg:grid-cols-[2fr_3fr]">
                    <aside className="border-brand-navy/10 h-fit rounded-3xl border bg-white p-6 shadow-xs">
                        <h2 className="text-lg font-bold">{store?.name ?? copy.details.heading}</h2>
                        <dl className="text-brand-navy/80 mt-4 space-y-3 text-sm">
                            {store?.email && (
                                <div>
                                    <dt className="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                                        {copy.details.email}
                                    </dt>
                                    <dd className="mt-0.5">
                                        <a
                                            href={`mailto:${store.email}`}
                                            className="hover:text-brand-orange"
                                        >
                                            {store.email}
                                        </a>
                                    </dd>
                                </div>
                            )}
                            {store?.phone && (
                                <div>
                                    <dt className="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                                        {copy.details.phone}
                                    </dt>
                                    <dd className="mt-0.5" dir="ltr">
                                        {store.phone}
                                    </dd>
                                </div>
                            )}
                            <div>
                                <dt className="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                                    {copy.details.hours}
                                </dt>
                                <dd className="mt-0.5">{copy.details.hours_value}</dd>
                            </div>
                            <div>
                                <dt className="text-brand-navy/55 text-[11px] tracking-[0.2em] uppercase">
                                    {copy.details.heading}
                                </dt>
                                <dd className="mt-0.5">
                                    {copy.details.address}
                                    {store?.country ? `, ${store.country}` : ''}
                                </dd>
                            </div>
                        </dl>
                    </aside>

                    <section className="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs sm:p-8">
                        <h2 className="text-lg font-bold">{copy.form_heading}</h2>
                        <p className="text-brand-navy/60 mt-1 mb-6 text-sm">{copy.form_help}</p>
                        <AlfakitComponent component={form} />
                    </section>
                </div>
            </section>
        </Layout>
    )
}
