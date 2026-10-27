import { Translator } from './i18n'
import type {
  CmsAspectRatio,
  CmsBlockSchema,
  CmsPayload,
  CmsSeoSchema,
  CmsSiteDesign,
} from './schema/cms'

/**
 * The framework-agnostic half of the CMS renderers (alfasix/alfakit-cms): registry keys,
 * the Tailwind classes block layouts pick from (spelled out so Tailwind generates them),
 * the head tags of a page and the translator of its strings.
 */

/** The Inertia page component public CMS pages render (`CmsPlugin::inertiaComponent()`). */
export const CMS_PAGE_COMPONENT = 'Alfakit/CmsPage'

/** Registry keys: `cms:block:{type}` replaces or adds a block renderer. */
export const CMS_BLOCK_PREFIX = 'cms:block:'

/** Renders the form block's payload (`CmsPlugin::formUsing()`); nothing is shown without one. */
export const CMS_FORM_KEY = 'cms:form'

/** Replace the default page header or footer of `CmsPage`. */
export const CMS_HEADER_KEY = 'cms:header'
export const CMS_FOOTER_KEY = 'cms:footer'

/** The built-in block types every renderer draws. */
export const CMS_BUILT_IN_BLOCKS = [
  'hero',
  'rich-text',
  'image',
  'gallery',
  'call-to-action',
  'features',
  'faq',
  'testimonials',
  'embed',
  'columns',
  'form',
  'section',
] as const

export function cmsBlockKey(type: string): string {
  return `${CMS_BLOCK_PREFIX}${type}`
}

/** Blocks that look like rendered blocks (`{ type, id, data }`), others dropped. */
export function cmsBlocks(blocks: unknown): CmsBlockSchema[] {
  if (!Array.isArray(blocks)) return []

  return blocks.filter(
    (block): block is CmsBlockSchema =>
      typeof block === 'object' &&
      block !== null &&
      typeof (block as CmsBlockSchema).type === 'string' &&
      typeof (block as CmsBlockSchema).id === 'string' &&
      typeof (block as CmsBlockSchema).data === 'object' &&
      (block as CmsBlockSchema).data !== null,
  )
}

const GRID_COLUMNS: Record<number, string> = {
  1: 'grid grid-cols-1 gap-6',
  2: 'grid grid-cols-1 gap-6 sm:grid-cols-2',
  3: 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4',
}

/** A responsive grid of 1 to 4 columns (one column on phones). */
export function cmsGridClass(columns: number): string {
  return GRID_COLUMNS[Math.min(4, Math.max(1, Math.round(columns)))] ?? GRID_COLUMNS[3]!
}

const COLUMNS_LAYOUT: Record<number, string> = {
  2: 'grid grid-cols-1 gap-8 md:grid-cols-2',
  3: 'grid grid-cols-1 gap-8 md:grid-cols-3',
  4: 'grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4',
}

/** The columns block layout (stacked below `md`). */
export function cmsColumnsClass(count: number): string {
  return COLUMNS_LAYOUT[Math.min(4, Math.max(2, Math.round(count)))] ?? COLUMNS_LAYOUT[2]!
}

const ASPECT: Record<CmsAspectRatio, string> = {
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '1/1': 'aspect-square',
  '21/9': 'aspect-[21/9]',
  '9/16': 'aspect-[9/16] max-w-sm mx-auto',
}

export function cmsAspectClass(ratio: string | null | undefined): string {
  return ASPECT[ratio as CmsAspectRatio] ?? ASPECT['16/9']
}

const WIDTH: Record<string, string> = {
  prose: 'mx-auto max-w-3xl',
  contained: 'mx-auto max-w-4xl',
  wide: 'mx-auto max-w-6xl',
  full: 'w-full',
}

/** The content width of a block (`prose`, `contained`, `wide`, `full`). */
export function cmsWidthClass(width: string | null | undefined): string {
  return WIDTH[width ?? 'prose'] ?? WIDTH.prose!
}

/** The `rel` of a link: new-tab links never get a handle on this window. */
export function cmsLinkRel(newTab: boolean): string | undefined {
  return newTab ? 'noopener noreferrer' : undefined
}

export interface CmsMetaTag {
  name?: string
  property?: string
  content: string
}

export interface CmsLinkTag {
  rel: string
  href: string
  hreflang?: string
}

/** The favicon and font stylesheet of the site design, for `<head>`. */
export function cmsDesignLinks(design: CmsSiteDesign | null | undefined): CmsLinkTag[] {
  const links: CmsLinkTag[] = []

  if (design?.favicon) links.push({ rel: 'icon', href: design.favicon })
  if (design?.fonts) links.push({ rel: 'stylesheet', href: design.fonts })

  return links
}

/** The design's CSS for a `<style>` element; checked again so it can never close the element. */
export function cmsDesignCss(design: CmsSiteDesign | null | undefined): string | null {
  const css = design?.css

  return typeof css === 'string' && css !== '' && !css.includes('<') ? css : null
}

/**
 * The attributes of a block's wrapper (`data-slot="cms-block"`): its `id` (the anchor
 * from **Style**, else the block id) and the `data-cms-*` hooks `themes.css` styles.
 */
export function cmsBlockAttributes(block: CmsBlockSchema): Record<string, string> {
  const attributes: Record<string, string> = { id: block.style?.anchor ?? block.id }

  if (block.style?.background) attributes['data-cms-background'] = block.style.background
  if (block.style?.spacing) attributes['data-cms-spacing'] = block.style.spacing
  if (block.style?.visibility) attributes['data-cms-visibility'] = block.style.visibility

  return attributes
}

export interface CmsHeadTags {
  title: string
  meta: CmsMetaTag[]
  links: CmsLinkTag[]
  /** Pre-encoded JSON-LD (no `<` in it), for a `<script type="application/ld+json">`. */
  jsonLd: string | null
}

/** The `<head>` tags of a page, in the order the PHP `Seo::toHtml()` prints them. */
export function cmsHeadTags(seo: CmsSeoSchema | null | undefined): CmsHeadTags {
  if (!seo) return { title: '', meta: [], links: [], jsonLd: null }

  const meta: CmsMetaTag[] = []

  if (seo.description) meta.push({ name: 'description', content: seo.description })
  if (seo.robots) meta.push({ name: 'robots', content: seo.robots })

  for (const [property, content] of Object.entries(seo.openGraph ?? {})) {
    if (typeof content === 'string' && content !== '') {
      meta.push({
        property: `og:${property.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}`,
        content,
      })
    }
  }

  for (const [name, content] of Object.entries(seo.twitter ?? {})) {
    if (typeof content === 'string' && content !== '') {
      meta.push({ name: `twitter:${name}`, content })
    }
  }

  const links: CmsLinkTag[] = []

  if (seo.canonical) links.push({ rel: 'canonical', href: seo.canonical })

  for (const alternate of seo.alternates ?? []) {
    links.push({ rel: 'alternate', href: alternate.href, hreflang: alternate.hreflang })
  }

  // Encoded by the server; checked again so a `<` can never end the script element.
  const jsonLd = typeof seo.jsonLd === 'string' && !seo.jsonLd.includes('<') ? seo.jsonLd : null

  return { title: seo.title, meta, links, jsonLd }
}

/** A translator over the page's `cms.*` strings, for pages rendered outside panels. */
export function createCmsTranslator(
  payload: Pick<CmsPayload, 'translations' | 'site'> | null | undefined,
): Translator {
  return new Translator(payload?.translations ?? {}, payload?.site?.tag ?? 'en')
}

/** The `cms` prop, when the Inertia page has one. */
export function cmsPayload(props: unknown): CmsPayload | null {
  const cms = (props as { cms?: unknown } | null | undefined)?.cms

  return typeof cms === 'object' && cms !== null && 'page' in cms ? (cms as CmsPayload) : null
}
