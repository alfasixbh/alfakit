import type { TrackPageProps } from '@/shared/shop'
import { storefrontLinks, type StorefrontShared } from '@/shared/storefront'
import { AlfakitComponent } from '@alfakit/react'
import { Head, router, usePage } from '@inertiajs/react'
import { useState, type FormEvent } from 'react'
import Layout from './Layout'

/**
 * Order tracking: e-mail + order number look-up, then the customer's orders (a standalone
 * Table) and the selected order's timeline (a standalone Infolist).
 */
export default function Track({ lookup, orders, timeline, sample, copy }: TrackPageProps) {
    const { renderer, storefront } = usePage<StorefrontShared>().props
    const links = storefrontLinks(renderer)
    const [email, setEmail] = useState(lookup.email)
    const [number, setNumber] = useState(lookup.number)

    const submit = (event: FormEvent) => {
        event.preventDefault()
        router.get(
            links.track,
            { email: email.trim(), number: number.trim() },
            { preserveScroll: true },
        )
    }

    const useSample = () => {
        if (!sample) return
        setEmail(sample.email)
        setNumber(sample.number)
        router.get(
            links.track,
            { email: sample.email, number: sample.number },
            { preserveScroll: true },
        )
    }

    return (
        <Layout>
            <Head title={`${copy.heading} · ${storefront.brand}`} />

            <section className="mx-auto w-full max-w-6xl px-4 pt-12 pb-16 sm:px-6">
                <h1 className="text-3xl font-bold sm:text-4xl">{copy.heading}</h1>
                <p className="text-brand-navy/75 mt-4 max-w-2xl text-base leading-relaxed">
                    {copy.intro}
                </p>

                <form
                    onSubmit={submit}
                    className="border-brand-navy/10 mt-8 grid gap-4 rounded-3xl border bg-white p-6 shadow-xs sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                >
                    <label className="block text-sm font-medium">
                        {copy.fields.email}
                        <input
                            type="email"
                            name="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="border-brand-navy/20 focus:border-brand-navy focus:ring-brand-navy/20 mt-1.5 block h-10 w-full rounded-lg border bg-white px-3 text-sm font-normal outline-none focus:ring-2"
                        />
                    </label>
                    <label className="block text-sm font-medium">
                        {copy.fields.number}
                        <input
                            type="text"
                            name="number"
                            required
                            placeholder="MA-MAN-00260"
                            value={number}
                            onChange={(event) => setNumber(event.target.value)}
                            className="border-brand-navy/20 focus:border-brand-navy focus:ring-brand-navy/20 mt-1.5 block h-10 w-full rounded-lg border bg-white px-3 font-mono text-sm font-normal outline-none focus:ring-2"
                        />
                    </label>
                    <button
                        type="submit"
                        className="bg-brand-navy hover:bg-brand-navy/90 inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-white shadow-sm transition-colors"
                    >
                        {copy.fields.submit}
                    </button>
                </form>

                {lookup.state === 'not_found' && (
                    <div
                        role="alert"
                        className="border-brand-orange/40 bg-brand-orange/10 mt-6 rounded-2xl border p-5"
                    >
                        <h2 className="text-base font-semibold">{copy.not_found.heading}</h2>
                        <p className="text-brand-navy/75 mt-1 text-sm">{copy.not_found.body}</p>
                    </div>
                )}

                {sample && (
                    <div className="border-brand-navy/15 mt-6 flex flex-col gap-3 rounded-2xl border border-dashed bg-white/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-base font-semibold">{copy.sample.heading}</h2>
                            <p className="text-brand-navy/70 mt-1 text-sm">
                                {copy.sample.body}{' '}
                                <span className="font-mono text-xs">
                                    {sample.email} · {sample.number}
                                </span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={useSample}
                            className="border-brand-navy/20 hover:border-brand-navy/60 inline-flex h-9 shrink-0 items-center justify-center rounded-full border bg-white px-4 text-sm font-semibold transition-colors"
                        >
                            {copy.sample.use}
                        </button>
                    </div>
                )}

                {orders && timeline && (
                    <div className="mt-10 space-y-8">
                        <div className="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs">
                            <AlfakitComponent component={orders} />
                        </div>
                        <div className="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs">
                            <AlfakitComponent component={timeline} />
                        </div>
                        <p className="text-brand-navy/55 text-xs">{copy.components_note}</p>
                    </div>
                )}
            </section>
        </Layout>
    )
}
