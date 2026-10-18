import { Head, usePage } from '@inertiajs/react'

export interface SeoProps {
    title: string
    description: string
    canonical: string
    image: string
    type: string
    noindex?: boolean
}

/**
 * The page's head tags from the `seo` prop (App\Support\Site\Seo). The root Blade view
 * renders the same tags with the same keys for the first response, so crawlers see them
 * without JavaScript and client-side visits replace them.
 */
export function Seo() {
    const seo = usePage<{ seo?: SeoProps }>().props.seo

    if (!seo) return null

    return (
        <Head title={seo.title}>
            <meta head-key="description" name="description" content={seo.description} />
            <link head-key="canonical" rel="canonical" href={seo.canonical} />
            {seo.noindex && <meta head-key="robots" name="robots" content="noindex" />}
            <meta head-key="og:type" property="og:type" content={seo.type} />
            <meta head-key="og:title" property="og:title" content={seo.title} />
            <meta head-key="og:description" property="og:description" content={seo.description} />
            <meta head-key="og:url" property="og:url" content={seo.canonical} />
            <meta head-key="og:image" property="og:image" content={seo.image} />
            <meta head-key="twitter:title" name="twitter:title" content={seo.title} />
            <meta
                head-key="twitter:description"
                name="twitter:description"
                content={seo.description}
            />
            <meta head-key="twitter:image" name="twitter:image" content={seo.image} />
        </Head>
    )
}
