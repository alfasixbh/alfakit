import type { ActionSchema } from './actions'

/**
 * The public pages of alfasix/alfakit-cms: what `CmsPageResponse` (PHP) sends as the
 * `cms` prop of the `Alfakit/CmsPage` Inertia page, and what the JSON API returns. Every
 * value is render-ready: HTML is sanitised and URLs are checked on the server.
 */

/** An image with its alternative text (empty for decorative images). */
export interface CmsImageSchema {
  url: string
  alt: string
  caption?: string | null
}

/** A button or link. */
export interface CmsLinkSchema {
  label: string
  url: string
  newTab: boolean
}

/** One rendered block: its type, a stable id (an anchor and a key) and its data. */
/** The **Style** section of a block; only options that differ from the default are sent. */
export interface CmsBlockStyle {
  background?: 'muted' | 'primary' | 'secondary' | 'dark'
  spacing?: 'none' | 'small' | 'large'
  visibility?: 'desktop' | 'mobile'
  /** The block's `id`, for in-page links (`#pricing`). */
  anchor?: string
}

export interface CmsBlockSchema<TData = Record<string, unknown>> {
  type: string
  id: string
  data: TData
  style?: CmsBlockStyle
}

export interface CmsHeroBlockData {
  eyebrow: string | null
  heading: string
  subheading: string | null
  primaryAction: CmsLinkSchema | null
  secondaryAction: CmsLinkSchema | null
  image: CmsImageSchema | null
  alignment: 'start' | 'center'
}

export interface CmsRichTextBlockData {
  /** Sanitised on the server (`Html::sanitize()`). */
  html: string
  width: 'prose' | 'wide'
}

export interface CmsImageBlockData {
  image: CmsImageSchema
  caption: string | null
  width: 'contained' | 'wide' | 'full'
}

export interface CmsGalleryBlockData {
  heading: string | null
  columns: 2 | 3 | 4
  images: CmsImageSchema[]
}

export interface CmsCallToActionBlockData {
  heading: string
  body: string | null
  primaryAction: CmsLinkSchema | null
  secondaryAction: CmsLinkSchema | null
  tone: 'default' | 'primary' | 'muted'
}

export interface CmsFeatureSchema {
  /** A resolved icon (Lucide name, image URL or sanitised SVG), like every server icon. */
  icon: string | null
  title: string
  description: string | null
  url: string | null
}

export interface CmsFeaturesBlockData {
  heading: string | null
  intro: string | null
  columns: 2 | 3 | 4
  items: CmsFeatureSchema[]
}

export interface CmsFaqBlockData {
  heading: string | null
  items: { question: string; answer: string }[]
}

export interface CmsTestimonialSchema {
  quote: string
  author: string
  role: string | null
  avatar: CmsImageSchema | null
}

export interface CmsTestimonialsBlockData {
  heading: string | null
  items: CmsTestimonialSchema[]
}

export type CmsAspectRatio = '16/9' | '4/3' | '1/1' | '21/9' | '9/16'

export interface CmsEmbedBlockData {
  embed: {
    provider: 'youtube' | 'vimeo' | 'video' | 'iframe'
    /** An allowlisted iframe source, or an `https` video file for `video`. */
    src: string
    title: string
  }
  caption: string | null
  aspectRatio: CmsAspectRatio
}

export interface CmsColumnsBlockData {
  align: 'start' | 'center'
  columns: { blocks: CmsBlockSchema[] }[]
}

export interface CmsFormBlockData {
  heading: string | null
  description: string | null
  /** The form key editors picked. */
  form: string
  /** What `CmsPlugin::formUsing()` returned for it; rendered by the `cms:form` component. */
  payload: Record<string, unknown>
}

export interface CmsSectionBlockData {
  /** The reusable section's name. */
  name: string
  /** Its rendered blocks. */
  blocks: CmsBlockSchema[]
}

/** The built-in block types and their data. */
export interface CmsBuiltInBlocks {
  hero: CmsHeroBlockData
  'rich-text': CmsRichTextBlockData
  image: CmsImageBlockData
  gallery: CmsGalleryBlockData
  'call-to-action': CmsCallToActionBlockData
  features: CmsFeaturesBlockData
  faq: CmsFaqBlockData
  testimonials: CmsTestimonialsBlockData
  embed: CmsEmbedBlockData
  columns: CmsColumnsBlockData
  form: CmsFormBlockData
  section: CmsSectionBlockData
}

export interface CmsSeoSchema {
  title: string
  description: string | null
  canonical: string
  robots: string
  openGraph: Record<string, string>
  twitter: Record<string, string>
  alternates: { hreflang: string; href: string }[]
  /** JSON-LD, already encoded with `<`, `>` and `&` escaped (safe inside a script element). */
  jsonLd: string | null
}

export interface CmsBreadcrumbSchema {
  label: string
  url: string
}

export interface CmsAlternateSchema {
  locale: string
  url: string
  current: boolean
}

export interface CmsPageSchema {
  id: number
  title: string
  path: string
  url: string
  locale: string | null
  isHome: boolean
  layout: string | null
  publishedAt: string | null
  updatedAt: string | null
  blocks: CmsBlockSchema[]
  breadcrumbs: CmsBreadcrumbSchema[]
  alternates: CmsAlternateSchema[]
  seo: CmsSeoSchema
}

export interface CmsMenuItemSchema {
  id: string
  label: string
  /** Null when the item has no safe link (it renders as text). */
  url: string | null
  newTab: boolean
  /** The item of the requested page. */
  current: boolean
  /** The current item or one of its ancestors. */
  active: boolean
  children: CmsMenuItemSchema[]
}

export interface CmsMenuSchema {
  handle: string
  name: string
  items: CmsMenuItemSchema[]
}

export interface CmsSiteSchema {
  name: string
  url: string
  locale: string
  tag: string
  direction: 'ltr' | 'rtl'
  locales: { code: string; label: string; url: string; current: boolean }[]
  /** **Site design** (`CmsPlugin::siteDesign()`); null when nothing is set. */
  design?: CmsSiteDesign | null
}

/** The site's colors, fonts, logo and favicon, built and checked on the server. */
export interface CmsSiteDesign {
  /** Theme variables and custom CSS, for a `<style>` element (never contains `<`). */
  css: string | null
  /** The fonts' stylesheet URL. */
  fonts: string | null
  logo: { url: string; alt: string } | null
  favicon: string | null
}

/** The `cms` prop of the `Alfakit/CmsPage` Inertia page. */
export interface CmsPayload {
  page: CmsPageSchema
  menus: Record<string, CmsMenuSchema>
  site: CmsSiteSchema
  /** A signed preview link (the page may be a draft). */
  preview: boolean
  /** Links of the floating admin bar, for signed-in users who may edit the page (`CmsPlugin::adminBar()`). */
  admin?: CmsAdminBarSchema | null
  /** "Powered by AlfaKit · Alfa Six" as HTML, below the footer, when `CmsPlugin::poweredBy()` is on (off by default). */
  poweredBy?: string | null
  /** The renderers' strings (`cms.*`), in the page's language. */
  translations: Record<string, unknown>
}

/**
 * `GET /api/cms/page` (`CmsPlugin::api()`): the page, as `cms.page`, and the site's
 * **Site design** as `cms.site.design` (null when none is set or `siteDesign(false)`). The
 * `customCode()` head and body snippets are never part of it.
 */
export interface CmsPageApiResponse {
  data: CmsPageSchema
  site: { design: CmsSiteDesign | null }
}

export interface CmsAdminBarSchema {
  editUrl: string
  /** A signed preview of the unpublished changes, when there are some. */
  draftUrl: string | null
  dashboardUrl: string
  hasChanges: boolean
}

/**
 * `LivePreview` in the page editor (schema type `CmsLivePreview`): autosaves the form
 * through the page's `autosaveMethod` and shows the signed preview of the draft.
 */
export interface CmsLivePreviewSchema {
  type: 'CmsLivePreview'
  key: string
  previewUrl: string | null
  autosaveMethod: string
  /** Milliseconds to wait after the last change before autosaving. */
  debounce: number
  savedAt?: string | null
  hasChanges?: boolean
  /** Where the page stands now, in plain words (the bar's status). */
  status?: CmsEditorStatusSchema
  /** The status once the draft differs from the live page (published pages). */
  changedStatus?: CmsEditorStatusSchema | null
  /** The editor's main actions ("Save draft", "Publish"…), run as page actions. */
  actions?: ActionSchema[]
  /** The actions once the draft differs from the live page ("Publish changes"). */
  changedActions?: ActionSchema[] | null
}

/** The page editor's status line: a badge and a plain-language explanation. */
export interface CmsEditorStatusSchema {
  label: string
  /** A badge colour (`gray`, `success`, `warning`, `info`, `danger`). */
  color: string
  description: string
}

/** What `cmsAutosave` answers. */
export interface CmsAutosaveResult {
  savedAt: string | null
  hasChanges: boolean
  previewUrl: string | null
  /** The record's version after the draft was stored, when the editor's was still current. */
  recordVersion?: string | null
}

export interface CmsPageProps {
  cms: CmsPayload
}
