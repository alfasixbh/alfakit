import { cmsLinkRel, type CmsImageSchema, type CmsLinkSchema } from '@alfakit/core'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { useCms } from './context'

/** A button link from a block (`primaryAction` / `secondaryAction`). */
export function CmsLinkButton({
  link,
  variant = 'default',
  size = 'lg',
  className,
}: {
  link: CmsLinkSchema | null | undefined
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'lg' | 'sm'
  className?: string
}) {
  const { t } = useCms()

  if (!link) return null

  return (
    <Button asChild variant={variant} size={size} className={className}>
      <a
        href={link.url}
        target={link.newTab ? '_blank' : undefined}
        rel={cmsLinkRel(link.newTab)}
        data-slot="cms-link-button"
      >
        {link.label}
        {link.newTab && (
          <span className="sr-only"> {t('cms.new_tab', {}, '(opens in a new tab)')}</span>
        )}
      </a>
    </Button>
  )
}

/** A lazily loaded image with its alternative text; decorative images get `alt=""`. */
export function CmsImage({
  image,
  className,
  sizes,
  eager = false,
}: {
  image: CmsImageSchema | null | undefined
  className?: string
  sizes?: string
  eager?: boolean
}) {
  if (!image) return null

  return (
    <img
      src={image.url}
      alt={image.alt ?? ''}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      sizes={sizes}
      className={cn('h-auto max-w-full', className)}
      data-slot="cms-image"
    />
  )
}

/** A block's optional heading and introduction. */
export function CmsBlockHeading({
  heading,
  intro,
  className,
}: {
  heading?: string | null
  intro?: string | null
  className?: string
}) {
  if (!heading && !intro) return null

  return (
    <div className={cn('mx-auto mb-10 max-w-2xl text-center', className)}>
      {heading && <h2 className="text-3xl font-semibold tracking-tight text-balance">{heading}</h2>}
      {intro && <p className="text-muted-foreground mt-3 text-lg text-pretty">{intro}</p>}
    </div>
  )
}
