import { supportLinks, type SupportPageProps } from '@/shared/plugins'
import type { StorefrontShared } from '@/shared/storefront'
import { AlfakitComponent } from '@alfakit/react'
import { Head, Link, usePage } from '@inertiajs/react'
import Layout from './Layout'

/**
 * The helpdesk's customer pages (alfasix/alfakit-helpdesk: portal, ticket, contact form,
 * satisfaction survey) at /support, in the shop's layout of the visitor's last storefront.
 */
export default function Support({ components, meta }: SupportPageProps) {
    const { plugins } = usePage<StorefrontShared>().props
    const links = supportLinks(meta)

    return (
        <Layout>
            <Head title={meta.title}>
                <meta name="robots" content="noindex" />
            </Head>
            <section className="mx-auto w-full max-w-3xl px-4 pt-12 pb-16 sm:px-6">
                <h1 className="text-3xl font-bold sm:text-4xl">
                    {plugins?.copy.support_title ?? meta.title}
                </h1>
                {plugins && (
                    <p className="text-brand-navy/75 mt-4 text-base leading-relaxed">
                        {plugins.copy.support_intro}
                    </p>
                )}
                {links.length > 0 && (
                    <nav
                        aria-label={meta.labels.navigation}
                        className="mt-6 flex flex-wrap gap-2 text-sm"
                    >
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={link.current ? 'page' : undefined}
                                className="border-brand-navy/15 aria-[current=page]:bg-brand-navy rounded-full border px-3 py-1.5 aria-[current=page]:text-white"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                )}
                <div className="mt-8 flex flex-col gap-6">
                    {components.map((component, index) => (
                        <AlfakitComponent
                            key={`${meta.view}-${index}`}
                            component={component}
                            className="border-brand-navy/10 rounded-3xl border bg-white p-6 shadow-xs sm:p-8"
                        />
                    ))}
                </div>
            </section>
        </Layout>
    )
}
