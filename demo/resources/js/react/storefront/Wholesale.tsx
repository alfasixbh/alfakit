import type { WholesalePageProps } from '@/shared/plugins'
import type { StorefrontShared } from '@/shared/storefront'
import { AlfakitComponent } from '@alfakit/react'
import { Head, usePage } from '@inertiajs/react'
import Layout from './Layout'

/** The wholesale enquiry form, built in the panel with alfasix/alfakit-forms. */
export default function Wholesale({ form, copy }: WholesalePageProps) {
    const { storefront } = usePage<StorefrontShared>().props

    return (
        <Layout>
            <Head title={`${copy.wholesale_title} · ${storefront.brand}`} />
            <section className="mx-auto w-full max-w-3xl px-4 pt-12 pb-16 sm:px-6">
                <h1 className="text-3xl font-bold sm:text-4xl">{copy.wholesale_title}</h1>
                <p className="text-brand-navy/75 mt-4 text-base leading-relaxed">
                    {copy.wholesale_intro}
                </p>
                <div className="border-brand-navy/10 mt-8 rounded-3xl border bg-white p-6 shadow-xs sm:p-8">
                    {form ? (
                        <AlfakitComponent component={form} />
                    ) : (
                        <p className="text-brand-navy/70 text-sm">{copy.wholesale_unavailable}</p>
                    )}
                </div>
            </section>
        </Layout>
    )
}
