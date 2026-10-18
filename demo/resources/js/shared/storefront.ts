import type { StandaloneComponentSchema } from '@alfakit/core'
import type { StorefrontPluginsShared } from './plugins'
import type { LocaleLink, NewsletterCopy, StripCopy } from './shop'

/**
 * Props shared by the storefront pages of the three renderers. The PHP side is
 * App\Http\Middleware\HandleInertiaRequests (shared) and App\Http\Controllers\StorefrontController.
 */
export interface RendererLink {
    id: string
    label: string
    url: string
    active: boolean
}

export interface StorefrontShared {
    // Inertia's PageProps constraint needs an index signature.
    [key: string]: unknown
    renderer: 'react' | 'vue' | 'svelte'
    locale: string
    storefront: {
        brand: string
        tagline: string
        /** "AlfaKit demo", translated */
        demo: string
        /** accessible name of the renderer switcher */
        switcherLabel: string
        nav: { home: string; contact: string; track: string; admin: string }
        footer: { beta: string; built: string; renderer: string }
        renderers: RendererLink[]
        adminUrl: string
        docsUrl: string
        /** The footer credit: "Developed by Alfa Six" (`Credit::html()`), or "Powered by AlfaKit · Alfa Six" on plugin pages (`Credit::poweredBy()`). */
        credit?: string
        locales: LocaleLink[]
        localeLabel: string
        strip: StripCopy
        newsletter: NewsletterCopy
    }
    /** The footer newsletter form (App\Alfakit\Standalone\NewsletterForm); null outside the storefront. */
    newsletter: StandaloneComponentSchema | null
    /** First-party plugins on the storefront (App\Demo\StorefrontPlugins); null on panel pages. */
    plugins: StorefrontPluginsShared | null
}

export interface FeaturedProduct {
    id: number
    name: string
    slug: string
    brand: string | null
    concentration: string
    size: number | null
    price: number
    compareAtPrice: number | null
    currency: string
    image: string | null
    notes: { top: string; heart: string; base: string }
}

export interface HomeProps {
    store: { name: string; slug: string; tagline: string | null; city: string | null } | null
    featured: FeaturedProduct[]
    copy: {
        hero: { eyebrow: string; title: string; body: string; cta: string; secondary: string }
        featured: string
        from: string
        notes: string
        by: string
        empty: string
    }
}

export const RENDERER_LABELS: Record<string, string> = {
    react: 'React',
    vue: 'Vue',
    svelte: 'Svelte',
}

export function formatMoney(amount: number, currency: string, locale: string): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount)
}

/** Replace `:name` placeholders the way Laravel's `__()` does. */
export function fill(text: string, replacements: Record<string, string | number>): string {
    return Object.entries(replacements).reduce(
        (result, [key, value]) => result.replaceAll(`:${key}`, String(value)),
        text,
    )
}

export function storefrontLinks(renderer: string): {
    home: string
    contact: string
    track: string
} {
    return { home: `/${renderer}`, contact: `/${renderer}/contact`, track: `/${renderer}/track` }
}
