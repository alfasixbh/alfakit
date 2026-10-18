import type { StandaloneComponentSchema } from '@alfakit/core'

/**
 * Props of the storefront pages beyond the home page (App\Http\Controllers\StorefrontPagesController)
 * and of the storefront chrome added to the shared `storefront` prop.
 */
export interface LocaleLink {
    code: string
    /** BCP 47 tag for the `lang` attribute (pt-BR, zh-CN). */
    lang: string
    dir: 'ltr' | 'rtl'
    /** The language's own name (Deutsch, 日本語), the same in every locale. */
    label: string
    url: string
    active: boolean
}

export interface StripCopy {
    eyebrow: string
    title: string
    body: string
    cta: string
    hint: string
    mascot_alt: string
}

export interface NewsletterCopy {
    heading: string
    body: string
    label: string
    placeholder: string
    submit: string
}

export interface ProductVariant {
    id: number
    name: string
    size: number | null
    price: number
    stock: number
    default: boolean
}

export interface ProductDetail {
    id: number
    name: string
    slug: string
    sku: string
    brand: string | null
    category: string | null
    concentration: string
    audience: string
    size: number | null
    price: number
    compareAtPrice: number | null
    currency: string
    stock: number
    description: string | null
    images: string[]
    notes: { top: string[]; heart: string[]; base: string[] }
    tags: string[]
    variants: ProductVariant[]
}

export interface ReviewItem {
    id: number
    rating: number
    title: string | null
    body: string | null
    author: string
    verified: boolean
    date: string | null
}

export interface RelatedProduct {
    id: number
    name: string
    slug: string
    brand: string | null
    price: number
    currency: string
    image: string | null
}

export interface ProductCopy {
    back: string
    by: string
    sku: string
    gallery: string
    image_of: string
    sizes: string
    choose_size: string
    stock: { in: string; low: string; out: string }
    notes: { heading: string; top: string; heart: string; base: string }
    details: {
        heading: string
        concentration: string
        audience: string
        size: string
        category: string
        tags: string
    }
    enquire: string
    track: string
    reviews: {
        heading: string
        count: string
        average: string
        empty: string
        verified: string
        guest: string
        write: string
        write_help: string
    }
    related: string
    compare: string
    currency_note: string
}

export interface ProductPageProps {
    product: ProductDetail
    reviews: { count: number; average: number | null; items: ReviewItem[] }
    related: RelatedProduct[]
    reviewForm: StandaloneComponentSchema
    copy: ProductCopy
}

export interface ContactCopy {
    heading: string
    intro: string
    form_heading: string
    form_help: string
    details: {
        heading: string
        email: string
        phone: string
        hours: string
        hours_value: string
        address: string
    }
}

export interface ContactPageProps {
    form: StandaloneComponentSchema
    store: {
        name: string
        email: string | null
        phone: string | null
        city: string | null
        country: string
    } | null
    copy: ContactCopy
}

export interface TrackCopy {
    heading: string
    intro: string
    fields: { email: string; number: string; submit: string }
    sample: { heading: string; body: string; use: string }
    not_found: { heading: string; body: string }
    components_note: string
}

export interface TrackPageProps {
    lookup: { email: string; number: string; state: 'idle' | 'found' | 'not_found' }
    orders: StandaloneComponentSchema | null
    timeline: StandaloneComponentSchema | null
    sample: { email: string; number: string } | null
    copy: TrackCopy
}

/** Laravel `trans_choice` syntax, reduced to what the shop uses: `{0} …|{1} …|[2,*] …`. */
export function choice(
    text: string,
    count: number,
    replacements: Record<string, string | number> = {},
): string {
    const parts = text.split('|')
    let picked = parts[parts.length - 1] ?? text

    for (const part of parts) {
        const exact = /^\{(\d+)\}\s*(.*)$/.exec(part)
        if (exact && Number(exact[1]) === count) {
            picked = exact[2] ?? ''
            break
        }
        const range = /^\[(\d+),(\d+|\*)\]\s*(.*)$/.exec(part)
        if (range) {
            const from = Number(range[1])
            const to = range[2] === '*' ? Number.POSITIVE_INFINITY : Number(range[2])
            if (count >= from && count <= to) {
                picked = range[3] ?? ''
                break
            }
        }
    }

    return Object.entries({ count, ...replacements }).reduce(
        (result, [key, value]) => result.replaceAll(`:${key}`, String(value)),
        picked,
    )
}

export function stockLabel(stock: number, copy: ProductCopy['stock'], low = 15): string {
    if (stock <= 0) return copy.out
    if (stock <= low) return copy.low.replaceAll(':count', String(stock))

    return copy.in
}

export function productUrl(renderer: string, slug: string): string {
    return `/${renderer}/products/${slug}`
}
