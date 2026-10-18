import { storefrontHeaderLinks, storefrontPluginLinks } from '@/shared/plugins'
import { RENDERER_LABELS, fill, storefrontLinks, type StorefrontShared } from '@/shared/storefront'
import { AlfakitAnalytics, AlfakitComponent, HelpdeskChat } from '@alfakit/react'
import { Link, usePage } from '@inertiajs/react'
import type { ReactNode } from 'react'

/**
 * Storefront shell: brand header with the renderer switcher and the language menu, content,
 * the "Built with AlfaKit" strip and a footer with the newsletter form (a standalone Form).
 * The Vue and Svelte layouts render the same markup.
 */
export default function Layout({ children }: { children: ReactNode }) {
    const { renderer, storefront, newsletter, plugins } = usePage<StorefrontShared>().props
    const links = storefrontLinks(renderer)
    const pluginLinks = storefrontPluginLinks(plugins)
    const headerLinks = storefrontHeaderLinks(plugins)
    const rendererLabel = RENDERER_LABELS[renderer] ?? renderer
    const activeLocale = storefront.locales.find((locale) => locale.active)

    return (
        <div data-storefront className="flex min-h-dvh flex-col">
            {plugins?.announcement && (
                <p
                    data-slot="storefront-announcement"
                    className="bg-brand-orange px-4 py-2 text-center text-xs font-medium text-white"
                >
                    {plugins.announcement}
                </p>
            )}
            <header className="border-brand-navy/10 bg-brand-cream/80 sticky top-0 z-20 border-b backdrop-blur">
                <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-6">
                    <Link href={links.home} className="flex items-center gap-3">
                        <img src="/brand/alfakit-head-color.svg" alt="" className="h-9 w-9" />
                        <span className="flex flex-col leading-tight">
                            <span className="font-heading text-lg font-bold tracking-tight">
                                {storefront.brand}
                            </span>
                            <span className="text-brand-navy/60 text-[11px] tracking-[0.2em] uppercase">
                                {storefront.demo}
                            </span>
                        </span>
                    </Link>
                    <nav
                        aria-label={storefront.brand}
                        className="hidden items-center gap-5 text-sm font-medium whitespace-nowrap md:flex"
                    >
                        <Link href={links.home} className="hover:text-brand-orange">
                            {storefront.nav.home}
                        </Link>
                        <Link href={links.contact} className="hover:text-brand-orange">
                            {storefront.nav.contact}
                        </Link>
                        <Link href={links.track} className="hover:text-brand-orange">
                            {storefront.nav.track}
                        </Link>
                        {headerLinks.map((link) => (
                            <a
                                key={link.key}
                                href={link.href}
                                aria-current={link.current ? 'page' : undefined}
                                className="hover:text-brand-orange aria-[current=page]:text-brand-orange"
                            >
                                {link.label}
                            </a>
                        ))}
                        {plugins?.newCheckout && (
                            <span className="border-brand-orange/40 bg-brand-orange/10 rounded-full border px-2 py-0.5 text-[11px] font-semibold">
                                {plugins.copy.new_checkout}
                            </span>
                        )}
                    </nav>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <nav
                            aria-label={storefront.switcherLabel}
                            className="border-brand-navy/15 inline-flex items-center rounded-full border bg-white/70 p-0.5 text-xs font-medium"
                        >
                            {storefront.renderers.map((link) => (
                                <a
                                    key={link.id}
                                    href={link.url}
                                    aria-current={link.active ? 'page' : undefined}
                                    className={
                                        link.active
                                            ? 'bg-brand-navy rounded-full px-3 py-1 text-white shadow-sm'
                                            : 'text-brand-navy/70 hover:text-brand-navy rounded-full px-3 py-1 transition-colors'
                                    }
                                >
                                    {link.label}
                                </a>
                            ))}
                        </nav>
                        <details data-slot="storefront-locale" className="group relative">
                            <summary
                                aria-label={storefront.localeLabel}
                                className="border-brand-navy/15 text-brand-navy inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border bg-white/70 px-3 py-1 text-xs font-medium transition-colors hover:bg-white [&::-webkit-details-marker]:hidden"
                            >
                                <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-3.5 w-3.5"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                </svg>
                                <span>{activeLocale?.label}</span>
                                <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-3 w-3 transition-transform group-open:rotate-180"
                                >
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </summary>
                            <nav
                                aria-label={storefront.localeLabel}
                                className="border-brand-navy/10 absolute end-0 z-30 mt-2 max-h-[70vh] w-52 overflow-y-auto rounded-2xl border bg-white p-1 shadow-lg"
                            >
                                {storefront.locales.map((locale) => (
                                    <a
                                        key={locale.code}
                                        href={locale.url}
                                        lang={locale.lang}
                                        dir={locale.dir}
                                        hrefLang={locale.lang}
                                        aria-current={locale.active ? 'true' : undefined}
                                        className={
                                            locale.active
                                                ? 'bg-brand-orange block rounded-xl px-3 py-1.5 text-start text-sm font-medium text-white'
                                                : 'text-brand-navy/80 hover:bg-brand-cream hover:text-brand-navy block rounded-xl px-3 py-1.5 text-start text-sm transition-colors'
                                        }
                                    >
                                        {locale.label}
                                    </a>
                                ))}
                            </nav>
                        </details>
                        <a
                            href={storefront.adminUrl}
                            className="bg-brand-navy hover:bg-brand-navy/90 hidden rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors sm:inline-flex"
                        >
                            {storefront.nav.admin}
                        </a>
                    </div>
                </div>
                <nav
                    aria-label={storefront.brand}
                    data-slot="storefront-mobile-nav"
                    className="border-brand-navy/10 flex gap-4 overflow-x-auto border-t px-4 py-2 text-sm font-medium whitespace-nowrap md:hidden"
                >
                    <Link href={links.home}>{storefront.nav.home}</Link>
                    <Link href={links.contact}>{storefront.nav.contact}</Link>
                    <Link href={links.track}>{storefront.nav.track}</Link>
                    {pluginLinks.map((link) => (
                        <a
                            key={link.key}
                            href={link.href}
                            aria-current={link.current ? 'page' : undefined}
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>
            </header>

            <main className="flex-1">{children}</main>

            <section
                data-slot="storefront-strip"
                aria-labelledby="storefront-strip-title"
                className="bg-brand-navy text-white"
            >
                <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-center md:gap-12">
                    <img
                        src="/brand/alfakit-mascot-color.svg"
                        alt={storefront.strip.mascot_alt}
                        className="h-32 w-32 shrink-0 drop-shadow-lg md:h-40 md:w-40"
                    />
                    <div className="min-w-0 flex-1 text-center md:text-start">
                        <p className="text-brand-orange text-xs font-semibold tracking-[0.25em] uppercase">
                            {storefront.strip.eyebrow}
                        </p>
                        <h2
                            id="storefront-strip-title"
                            className="mt-2 text-2xl font-bold text-white sm:text-3xl"
                        >
                            {storefront.strip.title}
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
                            {storefront.strip.body}
                        </p>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                            <span className="text-xs text-white/60">{storefront.strip.cta}</span>
                            {storefront.renderers.map((link) => (
                                <a
                                    key={link.id}
                                    href={link.url}
                                    aria-current={link.active ? 'page' : undefined}
                                    className={
                                        link.active
                                            ? 'bg-brand-orange rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-sm'
                                            : 'rounded-full border border-white/25 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:border-white/60'
                                    }
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                        <p className="mt-3 text-xs text-white/50">
                            {fill(storefront.strip.hint, { renderer: rendererLabel })}
                        </p>
                    </div>
                </div>
            </section>

            <footer className="border-brand-navy/10 border-t">
                <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 md:items-start">
                    <div>
                        <h2 className="text-lg font-bold">{storefront.newsletter.heading}</h2>
                        <p className="text-brand-navy/70 mt-1 text-sm">
                            {storefront.newsletter.body}
                        </p>
                    </div>
                    {newsletter && (
                        <AlfakitComponent
                            component={newsletter}
                            className="max-w-md md:ms-auto md:w-full"
                        />
                    )}
                </div>
                {pluginLinks.length > 0 && (
                    <nav
                        aria-label={storefront.brand}
                        data-slot="storefront-footer-links"
                        className="mx-auto flex w-full max-w-6xl flex-wrap gap-x-5 gap-y-2 px-4 pb-6 text-sm font-medium sm:px-6"
                    >
                        {pluginLinks.map((link) => (
                            <a key={link.key} href={link.href} className="hover:text-brand-orange">
                                {link.label}
                            </a>
                        ))}
                    </nav>
                )}
                <div className="text-brand-navy/60 mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-2 px-4 pb-6 text-xs sm:flex-row sm:items-center sm:px-6">
                    <p className="flex flex-wrap items-center gap-2">
                        <span className="border-brand-orange/40 bg-brand-orange/10 text-brand-navy rounded-full border px-2 py-0.5 font-semibold">
                            {storefront.footer.beta}
                        </span>
                        {storefront.footer.built}
                    </p>
                    <p>{fill(storefront.footer.renderer, { renderer: rendererLabel })}</p>
                </div>
                {storefront.credit && (
                    <div
                        className="border-brand-navy/10 border-t"
                        dangerouslySetInnerHTML={{ __html: storefront.credit }}
                    />
                )}
            </footer>

            {/* alfasix/alfakit-analytics (cookieless) and the helpdesk live chat (a feature flag). */}
            {plugins?.analyticsKey && (
                <AlfakitAnalytics siteKey={plugins.analyticsKey} trackLocalhost />
            )}
            {plugins?.chat && (
                <HelpdeskChat endpoint="/support/chat" position="start" label={plugins.copy.chat} />
            )}
        </div>
    )
}
