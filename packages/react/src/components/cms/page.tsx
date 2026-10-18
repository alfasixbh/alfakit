import {
  CMS_FOOTER_KEY,
  CMS_HEADER_KEY,
  cmsPayload,
  type CmsPageProps,
  type CmsPayload,
} from '@alfakit/core'
import { usePage } from '@inertiajs/react'
import { EyeIcon } from 'lucide-react'
import { Fragment, createElement, useEffect, type ReactNode } from 'react'
import { useOptionalRegistry, type AnyComponent } from '../../context'
import { lazyComponent } from '../../lib/lazy'
import { cn } from '../../lib/utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb'
import { CmsBlocks } from './blocks'
import { CmsProvider, useCms } from './context'
import { CmsHead } from './head'
import { CmsLanguageSwitcher, CmsMenuList, CmsNav } from './menu'

/** The admin bar loads only for signed-in editors (the server sends `cms.admin` to them alone). */
const CmsAdminBar = lazyComponent<{ admin: NonNullable<CmsPayload['admin']> }>(
  () => import('./admin-bar').then((module) => module.CmsAdminBar),
  () => null,
)

/** The site header: the site name, the `main` menu and the language links. */
export function CmsHeader({ cms }: { cms: CmsPayload }) {
  return (
    <header
      data-slot="cms-header"
      className="bg-background/90 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 border-b backdrop-blur"
    >
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href={cms.site.url}
          className="focus-visible:ring-ring/50 rounded-md text-lg font-semibold tracking-tight outline-none focus-visible:ring-[3px]"
        >
          {cms.site.name}
        </a>
        <div className="flex items-center gap-2">
          <CmsNav menu={cms.menus.main}>
            <CmsLanguageSwitcher site={cms.site} className="hidden sm:block" />
          </CmsNav>
        </div>
      </div>
    </header>
  )
}

/** The site footer: the `footer` menu and the site name. */
export function CmsFooter({ cms }: { cms: CmsPayload }) {
  const { t } = useCms()
  const footer = cms.menus.footer

  return (
    <footer data-slot="cms-footer" className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <p className="font-semibold">{cms.site.name}</p>
        {footer && footer.items.length > 0 && (
          <nav aria-label={t('cms.footer_navigation', {}, 'Footer navigation')}>
            <CmsMenuList
              items={footer.items}
              className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4"
            />
          </nav>
        )}
        <CmsLanguageSwitcher site={cms.site} className="sm:hidden" />
      </div>
    </footer>
  )
}

function CmsBreadcrumbs({ cms }: { cms: CmsPayload }) {
  const { t } = useCms()
  const crumbs = cms.page.breadcrumbs

  if (crumbs.length < 2) return null

  return (
    <Breadcrumb
      aria-label={t('cms.breadcrumbs', {}, 'Breadcrumbs')}
      className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8"
    >
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.url}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {index === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.url}>{crumb.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function PreviewBanner() {
  const { t } = useCms()

  return (
    <div
      role="status"
      data-slot="cms-preview-banner"
      className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
    >
      <EyeIcon className="size-4 shrink-0" aria-hidden="true" />
      <span>
        <strong className="font-semibold">{t('cms.preview', {}, 'Preview')}</strong> ·{' '}
        {t('cms.preview_notice', {}, "This is a preview. Visitors don't see unpublished changes.")}
      </span>
    </div>
  )
}

/** The page body inside `CmsPage`: header, breadcrumbs, blocks and footer. */
function CmsPageLayout({ cms, children }: { cms: CmsPayload; children?: ReactNode }) {
  const registry = useOptionalRegistry()
  const { t } = useCms()
  const header: AnyComponent = registry?.resolve(CMS_HEADER_KEY) ?? CmsHeader
  const footer: AnyComponent = registry?.resolve(CMS_FOOTER_KEY) ?? CmsFooter

  return (
    <div
      dir={cms.site.direction}
      lang={cms.site.tag}
      data-slot="cms-page"
      data-layout={cms.page.layout ?? undefined}
      className="bg-background text-foreground flex min-h-svh flex-col"
    >
      <a
        href="#cms-content"
        className="bg-background focus-visible:ring-ring/50 sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus-visible:ring-[3px]"
      >
        {t('cms.skip_to_content', {}, 'Skip to content')}
      </a>
      {cms.preview && <PreviewBanner />}
      {createElement(header, { cms })}
      <main
        id="cms-content"
        tabIndex={-1}
        className={cn('flex-1 outline-none')}
        data-slot="cms-content"
      >
        <CmsBreadcrumbs cms={cms} />
        {children ??
          (cms.page.blocks.length > 0 ? (
            <CmsBlocks blocks={cms.page.blocks} />
          ) : (
            <p className="text-muted-foreground mx-auto max-w-3xl px-4 py-24 text-center">
              {t('cms.empty_page', {}, 'This page has no content yet.')}
            </p>
          ))}
      </main>
      {createElement(footer, { cms })}
      {cms.poweredBy && (
        <div data-slot="cms-powered-by" dangerouslySetInnerHTML={{ __html: cms.poweredBy }} />
      )}
      {cms.admin && <CmsAdminBar admin={cms.admin} />}
    </div>
  )
}

/**
 * The `Alfakit/CmsPage` Inertia page (public CMS pages and previews). Register it in your
 * public site's Inertia app:
 *
 * ```tsx
 * createAlfakit({ pages: { 'Alfakit/CmsPage': CmsPage } })
 * ```
 *
 * Replace the header or footer with `cms:header` / `cms:footer` registry components, a
 * block with `cms:block:{type}`, or build your own page from `CmsBlocks` and `CmsHead`.
 */
export function CmsPage({
  cms: cmsProp,
  components,
}: Partial<CmsPageProps> & { components?: Record<string, AnyComponent> }) {
  const page = usePageProps()
  const cms = cmsProp ?? cmsPayload(page)

  const tag = cms?.site.tag
  const direction = cms?.site.direction

  useEffect(() => {
    if (!tag || !direction) return

    document.documentElement.lang = tag
    document.documentElement.dir = direction
  }, [tag, direction])

  if (!cms) return null

  return (
    <CmsProvider payload={cms} components={components}>
      <CmsHead seo={cms.page.seo} />
      <CmsPageLayout cms={cms} />
    </CmsProvider>
  )
}

function usePageProps(): unknown {
  try {
    return usePage().props
  } catch {
    return null
  }
}
