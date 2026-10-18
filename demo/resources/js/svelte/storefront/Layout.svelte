<script lang="ts">
    import { AlfakitAnalytics, AlfakitComponent, HelpdeskChat } from '@alfakit/svelte'
    import { inertia, usePage } from '@inertiajs/svelte'
    import type { Snippet } from 'svelte'
    import { storefrontHeaderLinks, storefrontPluginLinks } from '@/shared/plugins'
    import {
        RENDERER_LABELS,
        fill,
        storefrontLinks,
        type StorefrontShared,
    } from '@/shared/storefront'

    /**
     * Storefront shell: brand header with the renderer switcher and the language menu, content,
     * the "Built with AlfaKit" strip and a footer with the newsletter form (a standalone Form).
     * The React and Vue layouts render the same markup.
     */
    let { children }: { children: Snippet } = $props()

    const page = usePage<StorefrontShared>()
    const shared = $derived(page.props as unknown as StorefrontShared)
    const renderer = $derived(shared.renderer)
    const storefront = $derived(shared.storefront)
    const activeLocale = $derived(storefront.locales.find((locale) => locale.active))
    const newsletter = $derived(shared.newsletter)
    const links = $derived(storefrontLinks(renderer))
    const rendererLabel = $derived(RENDERER_LABELS[renderer] ?? renderer)
    const plugins = $derived(shared.plugins)
    const pluginLinks = $derived(storefrontPluginLinks(plugins))
    const headerLinks = $derived(storefrontHeaderLinks(plugins))
</script>

<div data-storefront class="flex min-h-dvh flex-col">
    {#if plugins?.announcement}
        <p
            data-slot="storefront-announcement"
            class="bg-brand-orange px-4 py-2 text-center text-xs font-medium text-white"
        >
            {plugins.announcement}
        </p>
    {/if}
    <header class="border-brand-navy/10 bg-brand-cream/80 sticky top-0 z-20 border-b backdrop-blur">
        <div
            class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-6"
        >
            <a href={links.home} use:inertia class="flex items-center gap-3">
                <img src="/brand/alfakit-head-color.svg" alt="" class="h-9 w-9" />
                <span class="flex flex-col leading-tight">
                    <span class="font-heading text-lg font-bold tracking-tight"
                        >{storefront.brand}</span
                    >
                    <span class="text-brand-navy/60 text-[11px] tracking-[0.2em] uppercase"
                        >{storefront.demo}</span
                    >
                </span>
            </a>
            <nav
                aria-label={storefront.brand}
                class="hidden items-center gap-5 text-sm font-medium whitespace-nowrap md:flex"
            >
                <a href={links.home} use:inertia class="hover:text-brand-orange"
                    >{storefront.nav.home}</a
                >
                <a href={links.contact} use:inertia class="hover:text-brand-orange"
                    >{storefront.nav.contact}</a
                >
                <a href={links.track} use:inertia class="hover:text-brand-orange"
                    >{storefront.nav.track}</a
                >
                {#each headerLinks as link (link.key)}
                    <a
                        href={link.href}
                        aria-current={link.current ? 'page' : undefined}
                        class="hover:text-brand-orange aria-[current=page]:text-brand-orange"
                        >{link.label}</a
                    >
                {/each}
                {#if plugins?.newCheckout}
                    <span
                        class="border-brand-orange/40 bg-brand-orange/10 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                        >{plugins.copy.new_checkout}</span
                    >
                {/if}
            </nav>
            <div class="flex items-center gap-2 sm:gap-3">
                <nav
                    aria-label={storefront.switcherLabel}
                    class="border-brand-navy/15 inline-flex items-center rounded-full border bg-white/70 p-0.5 text-xs font-medium"
                >
                    {#each storefront.renderers as link (link.id)}
                        <a
                            href={link.url}
                            aria-current={link.active ? 'page' : undefined}
                            class={link.active
                                ? 'bg-brand-navy rounded-full px-3 py-1 text-white shadow-sm'
                                : 'text-brand-navy/70 hover:text-brand-navy rounded-full px-3 py-1 transition-colors'}
                            >{link.label}</a
                        >
                    {/each}
                </nav>
                <details data-slot="storefront-locale" class="group relative">
                    <summary
                        aria-label={storefront.localeLabel}
                        class="border-brand-navy/15 text-brand-navy inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border bg-white/70 px-3 py-1 text-xs font-medium transition-colors hover:bg-white [&::-webkit-details-marker]:hidden"
                    >
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="h-3.5 w-3.5"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path
                                d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                            />
                        </svg>
                        <span>{activeLocale?.label}</span>
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="h-3 w-3 transition-transform group-open:rotate-180"
                        >
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </summary>
                    <nav
                        aria-label={storefront.localeLabel}
                        class="border-brand-navy/10 absolute end-0 z-30 mt-2 max-h-[70vh] w-52 overflow-y-auto rounded-2xl border bg-white p-1 shadow-lg"
                    >
                        {#each storefront.locales as locale (locale.code)}
                            <a
                                href={locale.url}
                                lang={locale.lang}
                                dir={locale.dir}
                                hreflang={locale.lang}
                                aria-current={locale.active ? 'true' : undefined}
                                class={locale.active
                                    ? 'bg-brand-orange block rounded-xl px-3 py-1.5 text-start text-sm font-medium text-white'
                                    : 'text-brand-navy/80 hover:bg-brand-cream hover:text-brand-navy block rounded-xl px-3 py-1.5 text-start text-sm transition-colors'}
                                >{locale.label}</a
                            >
                        {/each}
                    </nav>
                </details>
                <a
                    href={storefront.adminUrl}
                    class="bg-brand-navy hover:bg-brand-navy/90 hidden rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors sm:inline-flex"
                    >{storefront.nav.admin}</a
                >
            </div>
        </div>
        <nav
            aria-label={storefront.brand}
            data-slot="storefront-mobile-nav"
            class="border-brand-navy/10 flex gap-4 overflow-x-auto border-t px-4 py-2 text-sm font-medium whitespace-nowrap md:hidden"
        >
            <a href={links.home} use:inertia>{storefront.nav.home}</a>
            <a href={links.contact} use:inertia>{storefront.nav.contact}</a>
            <a href={links.track} use:inertia>{storefront.nav.track}</a>
            {#each pluginLinks as link (link.key)}
                <a href={link.href} aria-current={link.current ? 'page' : undefined}>{link.label}</a
                >
            {/each}
        </nav>
    </header>

    <main class="flex-1">{@render children()}</main>

    <section
        data-slot="storefront-strip"
        aria-labelledby="storefront-strip-title"
        class="bg-brand-navy text-white"
    >
        <div
            class="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-center md:gap-12"
        >
            <img
                src="/brand/alfakit-mascot-color.svg"
                alt={storefront.strip.mascot_alt}
                class="h-32 w-32 shrink-0 drop-shadow-lg md:h-40 md:w-40"
            />
            <div class="min-w-0 flex-1 text-center md:text-start">
                <p class="text-brand-orange text-xs font-semibold tracking-[0.25em] uppercase">
                    {storefront.strip.eyebrow}
                </p>
                <h2
                    id="storefront-strip-title"
                    class="mt-2 text-2xl font-bold text-white sm:text-3xl"
                >
                    {storefront.strip.title}
                </h2>
                <p class="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
                    {storefront.strip.body}
                </p>
                <div class="mt-6 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    <span class="text-xs text-white/60">{storefront.strip.cta}</span>
                    {#each storefront.renderers as link (link.id)}
                        <a
                            href={link.url}
                            aria-current={link.active ? 'page' : undefined}
                            class={link.active
                                ? 'bg-brand-orange rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-sm'
                                : 'rounded-full border border-white/25 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:border-white/60'}
                            >{link.label}</a
                        >
                    {/each}
                </div>
                <p class="mt-3 text-xs text-white/50">
                    {fill(storefront.strip.hint, { renderer: rendererLabel })}
                </p>
            </div>
        </div>
    </section>

    <footer class="border-brand-navy/10 border-t">
        <div
            class="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 md:items-start"
        >
            <div>
                <h2 class="text-lg font-bold">{storefront.newsletter.heading}</h2>
                <p class="text-brand-navy/70 mt-1 text-sm">{storefront.newsletter.body}</p>
            </div>
            {#if newsletter}
                <AlfakitComponent component={newsletter} class="max-w-md md:ms-auto md:w-full" />
            {/if}
        </div>
        {#if pluginLinks.length > 0}
            <nav
                aria-label={storefront.brand}
                data-slot="storefront-footer-links"
                class="mx-auto flex w-full max-w-6xl flex-wrap gap-x-5 gap-y-2 px-4 pb-6 text-sm font-medium sm:px-6"
            >
                {#each pluginLinks as link (link.key)}
                    <a href={link.href} class="hover:text-brand-orange">{link.label}</a>
                {/each}
            </nav>
        {/if}
        <div
            class="text-brand-navy/60 mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-2 px-4 pb-6 text-xs sm:flex-row sm:items-center sm:px-6"
        >
            <p class="flex flex-wrap items-center gap-2">
                <span
                    class="border-brand-orange/40 bg-brand-orange/10 text-brand-navy rounded-full border px-2 py-0.5 font-semibold"
                    >{storefront.footer.beta}</span
                >
                {storefront.footer.built}
            </p>
            <p>{fill(storefront.footer.renderer, { renderer: rendererLabel })}</p>
        </div>
        {#if storefront.credit}
            <div class="border-brand-navy/10 border-t">{@html storefront.credit}</div>
        {/if}
    </footer>

    <!-- alfasix/alfakit-analytics (cookieless) and the helpdesk live chat (a feature flag). -->
    {#if plugins?.analyticsKey}
        <AlfakitAnalytics siteKey={plugins.analyticsKey} trackLocalhost />
    {/if}
    {#if plugins?.chat}
        <HelpdeskChat endpoint="/support/chat" position="start" label={plugins.copy.chat} />
    {/if}
</div>
