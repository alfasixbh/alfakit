import { resolveLazyComponents, type ContentBlock, type PageSchema } from '@alfakit/core'
import { Head } from '@inertiajs/react'
import { useMemo, type ReactNode } from 'react'
import { PageActionProvider } from '../components/actions/action-context'
import { useAlfakitProps, usePageSchema, usePanel } from '../context'
import { cn } from '../lib/utils'
import { ContentBlockRenderer, PageShell } from '../pages/page'

/**
 * Building blocks for custom page components: the page shell with the panel layout, and the
 * page's PHP-defined pieces rendered by name, with live fields, actions, uploads and polling
 * working exactly as on schema-driven pages.
 */

/** The current page with its lazy components resolved. */
export function useAppPage(): PageSchema | undefined {
  const props = useAlfakitProps()
  const page = usePageSchema()

  return useMemo(
    () => (page ? resolveLazyComponents(page, props.alfakitLazy) : undefined),
    [page, props.alfakitLazy],
  )
}

/** A content block of the page by key (`form:customer`, `table`, `headerWidgets`…). */
export function usePageBlock(key: string): ContentBlock | undefined {
  const page = useAppPage()

  return page?.content.find((block) => block.key === key)
}

/**
 * The page's layout (sidebar and topbar, `fullscreen`…), heading, header actions and
 * document title around a custom component:
 *
 * ```tsx
 * export default function Pos(props: PosProps) {
 *   return <AppPage>…</AppPage>
 * }
 * ```
 */
export function AppPage({ children }: { children: ReactNode }) {
  const page = useAppPage()
  const panel = usePanel()

  if (!page) return <>{children}</>

  return (
    <PageActionProvider value={{ token: page.token, component: 'page' }}>
      <Head title={`${page.title} - ${panel.brandName}`} />
      <PageShell page={page}>{children}</PageShell>
    </PageActionProvider>
  )
}

export interface PageBlockProps {
  /** The block key: `form:customer`, `table:products`, `infolist:summary`, `form`, `table`, `content`… */
  name: string
  /** Rendered when the page has no such block (e.g. a hidden form). */
  fallback?: ReactNode
  className?: string
}

/** Render any content block of the page by key. */
export function PageBlock({ name, fallback = null, className }: PageBlockProps) {
  const page = useAppPage()
  const block = page?.content.find((candidate) => candidate.key === name)

  if (!page || !block) return <>{fallback}</>

  return (
    <PageActionProvider value={{ token: page.token, component: 'page' }}>
      <div data-slot="page-block" data-block={name} className={cn('min-w-0', className)}>
        <ContentBlockRenderer block={block} />
      </div>
    </PageActionProvider>
  )
}

type NamedBlockProps = Omit<PageBlockProps, 'name'> & { name?: string }

/** A form defined by `{name}Form(Schema $schema)` (or the page's `form()` without a name). */
export function PageForm({ name, ...props }: NamedBlockProps) {
  return <PageBlock name={name ? `form:${name}` : 'form'} {...props} />
}

/** A table defined by `{name}Table(Table $table)` (or the page's `table()` without a name). */
export function PageTable({ name, ...props }: NamedBlockProps) {
  return <PageBlock name={name ? `table:${name}` : 'table'} {...props} />
}

/** An infolist defined by `{name}Infolist(Schema $schema)` (or the page's `infolist()`). */
export function PageInfolist({ name, ...props }: NamedBlockProps) {
  return <PageBlock name={name ? `infolist:${name}` : 'infolist'} {...props} />
}

/** The page's header (default) or footer widgets. */
export function PageWidgets({
  position = 'header',
  ...props
}: Omit<PageBlockProps, 'name'> & { position?: 'header' | 'footer' }) {
  return <PageBlock name={position === 'footer' ? 'footerWidgets' : 'headerWidgets'} {...props} />
}
