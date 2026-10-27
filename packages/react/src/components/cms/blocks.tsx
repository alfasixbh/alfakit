import {
  CMS_FORM_KEY,
  cmsAspectClass,
  cmsBlockAttributes,
  cmsBlockKey,
  cmsBlocks,
  cmsColumnsClass,
  cmsGridClass,
  cmsWidthClass,
  type CmsBlockSchema,
  type CmsBuiltInBlocks,
  type CmsCallToActionBlockData,
  type CmsColumnsBlockData,
  type CmsEmbedBlockData,
  type CmsFaqBlockData,
  type CmsFeaturesBlockData,
  type CmsFormBlockData,
  type CmsGalleryBlockData,
  type CmsHeroBlockData,
  type CmsImageBlockData,
  type CmsRichTextBlockData,
  type CmsSectionBlockData,
  type CmsTestimonialsBlockData,
} from '@alfakit/core'
import { ChevronDownIcon, QuoteIcon } from 'lucide-react'
import { createContext, createElement, useContext, type ComponentType } from 'react'
import { useOptionalRegistry, type AnyComponent } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useCms } from './context'
import { CmsBlockHeading, CmsImage, CmsLinkButton } from './parts'

/** Props of every block renderer, built-in or registered as `cms:block:{type}`. */
export interface CmsBlockProps<TData = Record<string, unknown>> {
  block: CmsBlockSchema<TData>
  data: TData
}

type BlockComponent<K extends keyof CmsBuiltInBlocks> = ComponentType<
  CmsBlockProps<CmsBuiltInBlocks[K]>
>

const SECTION = 'px-4 py-12 sm:px-6 sm:py-16 lg:px-8'

/** Block renderers given to an outer `<CmsBlocks components>`, for the blocks inside columns. */
const ComponentsContext = createContext<Record<string, AnyComponent>>({})

/** Blocks inside a columns block: the column already has the page padding. */
const NestedContext = createContext(false)

/** The outer padding of a block, none when it is nested in a column. */
function useSection(extra?: string): string {
  return useContext(NestedContext) ? 'py-3' : cn(SECTION, extra)
}

export function HeroBlock({ data }: CmsBlockProps<CmsHeroBlockData>) {
  const sectionClass = useSection('sm:py-20 lg:py-24')
  const centered = data.alignment === 'center' && !data.image

  return (
    <section data-slot="cms-hero" className={sectionClass}>
      <div
        className={cn(
          'mx-auto grid max-w-6xl items-center gap-10',
          data.image && 'lg:grid-cols-2',
          centered && 'text-center',
        )}
      >
        <div className={cn('flex flex-col gap-5', centered && 'items-center')}>
          {data.eyebrow && (
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              {data.eyebrow}
            </p>
          )}
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            {data.heading}
          </h1>
          {data.subheading && (
            <p className="text-muted-foreground max-w-2xl text-lg text-pretty sm:text-xl">
              {data.subheading}
            </p>
          )}
          {(data.primaryAction || data.secondaryAction) && (
            <div className={cn('flex flex-wrap gap-3 pt-2', centered && 'justify-center')}>
              <CmsLinkButton link={data.primaryAction} />
              <CmsLinkButton link={data.secondaryAction} variant="outline" />
            </div>
          )}
        </div>
        {data.image && (
          <CmsImage
            image={data.image}
            eager
            className="w-full rounded-2xl object-cover shadow-sm"
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        )}
      </div>
    </section>
  )
}

export function RichTextBlock({ data }: CmsBlockProps<CmsRichTextBlockData>) {
  const sectionClass = useSection('py-8 sm:py-10')
  return (
    <section data-slot="cms-rich-text" className={sectionClass}>
      <div
        className={cn('alfakit-prose', cmsWidthClass(data.width))}
        // Sanitised on the server (`Html::sanitize()`); never raw editor input.
        dangerouslySetInnerHTML={{ __html: data.html }}
      />
    </section>
  )
}

export function ImageBlock({ data }: CmsBlockProps<CmsImageBlockData>) {
  const nested = useContext(NestedContext)
  const sectionClass = useSection('py-8 sm:py-10')
  return (
    <section
      data-slot="cms-image-block"
      className={data.width === 'full' && !nested ? 'py-8' : sectionClass}
    >
      <figure className={cn(cmsWidthClass(data.width), 'flex flex-col gap-3')}>
        <CmsImage
          image={data.image}
          className={cn('w-full object-cover', data.width !== 'full' && 'rounded-xl')}
        />
        {data.caption && (
          <figcaption className="text-muted-foreground text-center text-sm">
            {data.caption}
          </figcaption>
        )}
      </figure>
    </section>
  )
}

export function GalleryBlock({ data }: CmsBlockProps<CmsGalleryBlockData>) {
  const sectionClass = useSection()
  return (
    <section data-slot="cms-gallery" className={sectionClass}>
      <div className="mx-auto max-w-6xl">
        <CmsBlockHeading heading={data.heading} />
        <ul className={cmsGridClass(data.columns)} role="list">
          {data.images.map((image, index) => (
            <li key={`${image.url}-${index}`}>
              <figure className="flex flex-col gap-2">
                <CmsImage image={image} className="aspect-[4/3] w-full rounded-xl object-cover" />
                {image.caption && (
                  <figcaption className="text-muted-foreground text-sm">{image.caption}</figcaption>
                )}
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function CallToActionBlock({ data }: CmsBlockProps<CmsCallToActionBlockData>) {
  const sectionClass = useSection()
  const primary = data.tone === 'primary'

  return (
    <section data-slot="cms-call-to-action" className={sectionClass}>
      <div
        className={cn(
          'mx-auto flex max-w-5xl flex-col items-center gap-5 rounded-2xl px-6 py-12 text-center sm:px-12',
          primary && 'bg-primary text-primary-foreground',
          data.tone === 'muted' && 'bg-muted',
          data.tone === 'default' && 'border',
        )}
      >
        <h2 className="text-3xl font-semibold tracking-tight text-balance">{data.heading}</h2>
        {data.body && (
          <p
            className={cn(
              'max-w-2xl text-lg text-pretty',
              primary ? 'text-primary-foreground/85' : 'text-muted-foreground',
            )}
          >
            {data.body}
          </p>
        )}
        {(data.primaryAction || data.secondaryAction) && (
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <CmsLinkButton link={data.primaryAction} variant={primary ? 'secondary' : 'default'} />
            <CmsLinkButton
              link={data.secondaryAction}
              variant="outline"
              className={
                primary
                  ? 'text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10 bg-transparent'
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </section>
  )
}

export function FeaturesBlock({ data }: CmsBlockProps<CmsFeaturesBlockData>) {
  const sectionClass = useSection()
  return (
    <section data-slot="cms-features" className={sectionClass}>
      <div className="mx-auto max-w-6xl">
        <CmsBlockHeading heading={data.heading} intro={data.intro} />
        <ul className={cmsGridClass(data.columns)} role="list">
          {data.items.map((item, index) => {
            const content = (
              <>
                {item.icon && (
                  <span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg">
                    <Icon name={item.icon} className="size-5" aria-hidden="true" />
                  </span>
                )}
                <h3 className="text-lg font-semibold">{item.title}</h3>
                {item.description && (
                  <p className="text-muted-foreground text-pretty">{item.description}</p>
                )}
              </>
            )

            return (
              <li
                key={`${item.title}-${index}`}
                className="bg-card flex flex-col gap-3 rounded-xl border p-6"
              >
                {item.url ? (
                  <a
                    href={item.url}
                    className="focus-visible:ring-ring/50 flex flex-col gap-3 rounded-md outline-none focus-visible:ring-[3px]"
                  >
                    {content}
                  </a>
                ) : (
                  content
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export function FaqBlock({ block, data }: CmsBlockProps<CmsFaqBlockData>) {
  const sectionClass = useSection()
  return (
    <section data-slot="cms-faq" className={sectionClass}>
      <div className="mx-auto max-w-3xl">
        <CmsBlockHeading heading={data.heading} />
        <div className="divide-y rounded-xl border">
          {data.items.map((item, index) => (
            <details key={`${block.id}-${index}`} className="group px-5" data-slot="cms-faq-item">
              <summary className="focus-visible:ring-ring/50 flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 text-start font-medium outline-none focus-visible:ring-[3px] [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDownIcon
                  className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="text-muted-foreground pb-5 whitespace-pre-line">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export function TestimonialsBlock({ data }: CmsBlockProps<CmsTestimonialsBlockData>) {
  const sectionClass = useSection()
  return (
    <section data-slot="cms-testimonials" className={sectionClass}>
      <div className="mx-auto max-w-6xl">
        <CmsBlockHeading heading={data.heading} />
        <ul className={cmsGridClass(Math.min(3, data.items.length))} role="list">
          {data.items.map((item, index) => (
            <li key={`${item.author}-${index}`}>
              <figure className="bg-card flex h-full flex-col gap-5 rounded-xl border p-6">
                <QuoteIcon className="text-primary/60 size-6 rtl:-scale-x-100" aria-hidden="true" />
                <blockquote className="flex-1 text-pretty">
                  <p>{item.quote}</p>
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  {item.avatar && (
                    <CmsImage
                      image={{ ...item.avatar, alt: '' }}
                      className="size-10 rounded-full object-cover"
                    />
                  )}
                  <span className="flex flex-col">
                    <span className="font-medium">{item.author}</span>
                    {item.role && (
                      <span className="text-muted-foreground text-sm">{item.role}</span>
                    )}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function EmbedBlock({ data }: CmsBlockProps<CmsEmbedBlockData>) {
  const sectionClass = useSection('py-8 sm:py-10')
  const { embed } = data

  return (
    <section data-slot="cms-embed" className={sectionClass}>
      <figure className="mx-auto flex max-w-4xl flex-col gap-3">
        <div
          className={cn('bg-muted overflow-hidden rounded-xl', cmsAspectClass(data.aspectRatio))}
        >
          {embed.provider === 'video' ? (
            <video
              src={embed.src}
              controls
              preload="metadata"
              className="size-full"
              title={embed.title}
            />
          ) : (
            <iframe
              src={embed.src}
              title={embed.title}
              loading="lazy"
              className="size-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox={
                embed.provider === 'iframe'
                  ? 'allow-scripts allow-same-origin allow-popups allow-forms'
                  : undefined
              }
            />
          )}
        </div>
        {data.caption && (
          <figcaption className="text-muted-foreground text-center text-sm">
            {data.caption}
          </figcaption>
        )}
      </figure>
    </section>
  )
}

export function ColumnsBlock({ data }: CmsBlockProps<CmsColumnsBlockData>) {
  const sectionClass = useSection('py-8 sm:py-10')
  return (
    <section data-slot="cms-columns" className={sectionClass}>
      <div
        className={cn(
          'mx-auto max-w-6xl',
          cmsColumnsClass(data.columns.length),
          data.align === 'center' && 'items-center',
        )}
      >
        {data.columns.map((column, index) => (
          <div key={index} className="min-w-0" data-slot="cms-column">
            <NestedContext.Provider value={true}>
              <CmsBlocks blocks={column.blocks} />
            </NestedContext.Provider>
          </div>
        ))}
      </div>
    </section>
  )
}

export function FormBlock({ block, data }: CmsBlockProps<CmsFormBlockData>) {
  const sectionClass = useSection()
  const registry = useOptionalRegistry()
  const { components, preview, t } = useCms()
  const Form = components[CMS_FORM_KEY] ?? registry?.resolve(CMS_FORM_KEY)

  if (!Form) {
    // Nothing renders the form: visitors see nothing, editors see why in previews.
    return preview ? (
      <p
        className="text-muted-foreground mx-auto max-w-3xl px-4 py-6 text-center text-sm"
        role="status"
      >
        {t('cms.form_unavailable', {}, "This form isn't available.")}
      </p>
    ) : null
  }

  return (
    <section data-slot="cms-form" className={sectionClass}>
      <div className="mx-auto max-w-2xl">
        <CmsBlockHeading heading={data.heading} intro={data.description} />
        {createElement(Form, { form: data.payload, formKey: data.form, block })}
      </div>
    </section>
  )
}

/** A reusable section: its blocks, at full page width. */
export function SectionBlock({ data }: CmsBlockProps<CmsSectionBlockData>) {
  return (
    <div data-slot="cms-section" data-section={data.name}>
      <CmsBlocks blocks={data.blocks} />
    </div>
  )
}

/** The built-in block renderers, by type. */
export const CMS_BLOCK_COMPONENTS: { [K in keyof CmsBuiltInBlocks]: BlockComponent<K> } = {
  hero: HeroBlock,
  'rich-text': RichTextBlock,
  image: ImageBlock,
  gallery: GalleryBlock,
  'call-to-action': CallToActionBlock,
  features: FeaturesBlock,
  faq: FaqBlock,
  testimonials: TestimonialsBlock,
  embed: EmbedBlock,
  columns: ColumnsBlock,
  form: FormBlock,
  section: SectionBlock,
}

/**
 * Renders rendered CMS blocks (`page.blocks`, `Cms::blocks()`, the JSON API). Each type
 * resolves, in order, to `components[type]`, the registry's `cms:block:{type}` and the
 * built-in renderer; unknown types render nothing.
 *
 * ```tsx
 * <CmsBlocks blocks={cms.page.blocks} components={{ pricing: PricingBlock }} />
 * ```
 */
export function CmsBlocks({
  blocks,
  components,
}: {
  blocks: CmsBlockSchema[] | null | undefined
  components?: Record<string, AnyComponent>
}) {
  const registry = useOptionalRegistry()
  const cms = useCms()
  const outer = useContext(ComponentsContext)
  const merged = components ? { ...outer, ...components } : outer

  return (
    <ComponentsContext.Provider value={merged}>
      {cmsBlocks(blocks).map((block) => {
        const Component: AnyComponent | undefined =
          merged[block.type] ??
          cms.components[block.type] ??
          registry?.resolve(cmsBlockKey(block.type)) ??
          (CMS_BLOCK_COMPONENTS as Record<string, AnyComponent>)[block.type]

        if (!Component) return null

        return (
          <div
            key={block.id}
            {...cmsBlockAttributes(block)}
            data-slot="cms-block"
            data-cms-block={block.type}
          >
            <Component block={block} data={block.data} />
          </div>
        )
      })}
    </ComponentsContext.Provider>
  )
}
