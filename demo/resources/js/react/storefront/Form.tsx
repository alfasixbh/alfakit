import type { FormPageProps } from '@/shared/plugins'
import { AlfakitComponent } from '@alfakit/react'
import { Head } from '@inertiajs/react'
import Layout from './Layout'

/** A published form of alfasix/alfakit-forms at /forms/{slug}, in the shop's layout. */
export default function Form({ form, meta }: FormPageProps) {
    return (
        <Layout>
            <Head title={meta.title}>
                {meta.description ? <meta name="description" content={meta.description} /> : null}
                {meta.preview ? <meta name="robots" content="noindex" /> : null}
            </Head>
            <section className="mx-auto w-full max-w-3xl px-4 pt-12 pb-16 sm:px-6">
                <AlfakitComponent
                    component={form}
                    className="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs sm:p-8"
                />
            </section>
        </Layout>
    )
}
