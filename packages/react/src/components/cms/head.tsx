import { cmsDesignLinks, cmsHeadTags, type CmsSeoSchema, type CmsSiteDesign } from '@alfakit/core'
import { Head } from '@inertiajs/react'

/**
 * The page's `<title>`, meta, canonical, `hreflang` and JSON-LD tags, plus the site
 * design's favicon and fonts, through Inertia's `<Head>` (server-rendered with SSR,
 * updated on every visit).
 */
export function CmsHead({
  seo,
  design,
}: {
  seo: CmsSeoSchema | null | undefined
  design?: CmsSiteDesign | null
}) {
  const tags = cmsHeadTags(seo)

  return (
    <Head title={tags.title}>
      {tags.meta.map((tag) =>
        tag.property ? (
          <meta
            key={`p:${tag.property}`}
            head-key={`cms:${tag.property}`}
            property={tag.property}
            content={tag.content}
          />
        ) : (
          <meta
            key={`n:${tag.name}`}
            head-key={`cms:${tag.name}`}
            name={tag.name}
            content={tag.content}
          />
        ),
      )}
      {tags.links.map((link) => (
        <link
          key={`${link.rel}:${link.hreflang ?? ''}:${link.href}`}
          head-key={`cms:${link.rel}:${link.hreflang ?? ''}`}
          rel={link.rel}
          href={link.href}
          hrefLang={link.hreflang}
        />
      ))}
      {cmsDesignLinks(design).map((link) => (
        <link
          key={`design:${link.rel}`}
          head-key={`cms:design:${link.rel}`}
          rel={link.rel}
          href={link.href}
        />
      ))}
      {/* Encoded on the server with `<` escaped, so it can't close the element. */}
      {tags.jsonLd && (
        <script head-key="cms:jsonld" type="application/ld+json">
          {tags.jsonLd}
        </script>
      )}
    </Head>
  )
}
