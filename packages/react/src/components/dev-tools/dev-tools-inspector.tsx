import {
  byteLength,
  formatBytes,
  inspectableProps,
  jsonEntries,
  jsonScalar,
  jsonSize,
  latestServerTiming,
  overlayPlacementDirection,
  prettyJson,
  searchJson,
  type JsonEntry,
  type JsonSearchResult,
} from '@alfakit/core'
import { router } from '@inertiajs/react'
import { BracesIcon, CheckIcon, ChevronRightIcon, CopyIcon, ExternalLinkIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAlfakitProps, useDirection, useFormatter, useT } from '../../context'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet'

/**
 * The schema inspector: a floating developer button that opens a drawer with the page's
 * props as a searchable JSON tree (with a copy button), what the context token identifies,
 * the server time reported in `Server-Timing`, the payload size and editor links for the
 * PHP classes behind the page. Rendered only for pages that carry `alfakitDevTools`.
 */
export function DevToolsInspector() {
  const props = useAlfakitProps()
  const t = useT()
  const formatter = useFormatter()
  const direction = useDirection()
  const tools = props.alfakitDevTools
  const data = useMemo(() => inspectableProps(props as unknown as Record<string, unknown>), [props])
  const payload = useMemo(() => byteLength(props), [props])
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)
  // The inspector renders in the browser only (lazy chunk), so the Performance API is there.
  const [serverTime, setServerTime] = useState<number | null>(() => latestServerTiming())
  const search = useMemo(() => searchJson(data, query), [data, query])

  // Re-read the timing after every visit: the latest response carries the newest header.
  useEffect(() => router.on('finish', () => setServerTime(latestServerTiming())), [])

  useEffect(() => {
    if (!copied) return

    const timer = setTimeout(() => setCopied(false), 2000)

    return () => clearTimeout(timer)
  }, [copied])

  if (!tools) {
    return null
  }

  const copy = () => {
    void navigator.clipboard?.writeText(prettyJson(data)).then(() => setCopied(true))
  }

  const time = (value: number | null) =>
    value === null ? t('dev_tools.never', {}, 'Never') : formatter.dateTime(value * 1000)
  const parameters = Object.entries(tools.context.parameters)

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('dev_tools.open', {}, 'Open schema inspector')}
          data-slot="dev-tools-toggle"
          className="fixed end-4 bottom-16 z-40 rounded-full shadow-md [[data-slot=starter-kit-root]_&]:end-auto [[data-slot=starter-kit-root]_&]:right-4"
        >
          <BracesIcon />
        </Button>
      </SheetTrigger>
      <SheetContent
        side={
          overlayPlacementDirection(direction, props.alfakit?.starterKit) === 'rtl'
            ? 'left'
            : 'right'
        }
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <div data-slot="dev-tools" className="flex min-h-0 flex-1 flex-col">
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <BracesIcon className="size-4" />
              {t('dev_tools.title', {}, 'Schema inspector')}
            </SheetTitle>
            <SheetDescription className="truncate font-mono text-xs" title={tools.context.page}>
              {tools.context.page}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-5 p-4 text-sm">
              <dl className="grid grid-cols-2 gap-3">
                <Stat
                  label={t('dev_tools.server_time', {}, 'Server time')}
                  value={
                    serverTime === null
                      ? t('dev_tools.not_measured', {}, 'Not measured')
                      : t(
                          'dev_tools.milliseconds',
                          { value: formatter.number(serverTime) },
                          ':value ms',
                        )
                  }
                />
                <Stat
                  label={t('dev_tools.payload', {}, 'Payload size')}
                  value={formatBytes(payload)}
                />
              </dl>

              <section data-slot="dev-tools-context">
                <h3 className="mb-2 text-sm font-medium">
                  {t('dev_tools.context', {}, 'Context token')}
                </h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                  <Row label={t('dev_tools.panel', {}, 'Panel')} value={tools.context.panel} />
                  <Row label={t('dev_tools.page', {}, 'Page')} value={tools.context.page} />
                  {tools.context.component && (
                    <Row
                      label={t('dev_tools.component', {}, 'Component')}
                      value={tools.context.component}
                    />
                  )}
                  {tools.tenant !== null && (
                    <Row label={t('dev_tools.tenant', {}, 'Tenant')} value={tools.tenant} />
                  )}
                  {parameters.map(([key, value]) => (
                    <Row key={key} label={key} value={jsonScalar(value)} />
                  ))}
                  <Row
                    label={t('dev_tools.bound_to_user', {}, 'Bound to the user')}
                    value={
                      tools.context.boundToUser
                        ? t('dev_tools.yes', {}, 'Yes')
                        : t('dev_tools.no', {}, 'No')
                    }
                    plain
                  />
                  <Row
                    label={t('dev_tools.issued_at', {}, 'Issued')}
                    value={time(tools.context.issuedAt)}
                    plain
                  />
                  <Row
                    label={t('dev_tools.expires_at', {}, 'Expires')}
                    value={time(tools.context.expiresAt)}
                    plain
                  />
                </dl>
              </section>

              <section data-slot="dev-tools-classes">
                <h3 className="mb-2 text-sm font-medium">
                  {t('dev_tools.classes', {}, 'Classes')}
                </h3>
                <ul className="divide-y rounded-md border text-xs">
                  {tools.classes.map((item) => (
                    <li key={item.role} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="text-muted-foreground w-16 shrink-0">
                        {t(`dev_tools.roles.${item.role}`, {}, item.role)}
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate font-mono"
                        title={item.file ? `${item.file}:${item.line ?? 1}` : item.class}
                      >
                        {item.class}
                      </span>
                      {item.url && (
                        <a
                          href={item.url}
                          className="text-primary inline-flex shrink-0 items-center gap-1 hover:underline"
                          aria-label={t(
                            'dev_tools.open_in_editor',
                            { class: item.class, editor: tools.editor ?? '' },
                            'Open :class in :editor',
                          )}
                        >
                          <ExternalLinkIcon className="size-3.5" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
                {tools.editor === null && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    {t(
                      'dev_tools.no_editor',
                      {},
                      'Set APP_EDITOR (config app.editor) to open these classes in your editor.',
                    )}
                  </p>
                )}
              </section>

              <section data-slot="dev-tools-schema">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="me-auto text-sm font-medium">
                    {t('dev_tools.schema', {}, 'Schema')}
                  </h3>
                  <Button type="button" variant="ghost" size="sm" onClick={copy}>
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied
                      ? t('dev_tools.copied', {}, 'Copied')
                      : t('dev_tools.copy', {}, 'Copy JSON')}
                  </Button>
                </div>
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('dev_tools.search', {}, 'Search keys and values')}
                  aria-label={t('dev_tools.search', {}, 'Search keys and values')}
                  className="mb-2 h-8"
                />
                {query.trim() !== '' && search.matches.size === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t(
                      'dev_tools.no_matches',
                      { query: query.trim() },
                      'Nothing matches “:query”.',
                    )}
                  </p>
                ) : (
                  <ul
                    dir="ltr"
                    role="tree"
                    aria-label={t('dev_tools.schema', {}, 'Schema')}
                    className="bg-muted/40 overflow-x-auto rounded-md p-2 text-start font-mono text-xs leading-relaxed"
                  >
                    {jsonEntries(data).map((entry) => (
                      <JsonNode
                        key={entry.path}
                        entry={entry}
                        depth={0}
                        search={search}
                        query={query}
                      />
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function JsonNode({
  entry,
  depth,
  search,
  query,
}: {
  entry: JsonEntry
  depth: number
  search: JsonSearchResult
  query: string
}) {
  const t = useT()
  const formatter = useFormatter()
  const searching = query.trim() !== ''
  const [open, setOpen] = useState(depth < 1)

  if (searching && !search.visible.has(entry.path)) {
    return null
  }

  const container = entry.kind === 'object' || entry.kind === 'array'
  const expanded = searching || open
  const matched = search.matches.has(entry.path)
  const size = jsonSize(entry.value)
  const key = (
    <span className={cn('text-foreground', matched && 'bg-primary/15 rounded-sm')}>
      {entry.key}
    </span>
  )

  if (!container) {
    return (
      <li
        role="treeitem"
        aria-selected={false}
        className="py-px"
        style={{ paddingInlineStart: `${depth * 12 + 16}px` }}
      >
        {key}
        <span className="text-muted-foreground">: </span>
        <span
          className={cn(
            entry.kind === 'string' && 'text-emerald-700 dark:text-emerald-400',
            entry.kind === 'number' && 'text-sky-700 dark:text-sky-400',
            entry.kind === 'boolean' && 'text-violet-700 dark:text-violet-400',
            entry.kind === 'null' && 'text-muted-foreground',
            'break-all',
          )}
        >
          {jsonScalar(entry.value)}
        </span>
      </li>
    )
  }

  return (
    <li role="treeitem" aria-selected={false} aria-expanded={expanded}>
      <button
        type="button"
        className="hover:bg-muted flex w-full items-center gap-1 rounded py-px text-start"
        style={{ paddingInlineStart: `${depth * 12}px` }}
        onClick={() => setOpen(!open)}
        aria-label={
          expanded
            ? t('dev_tools.collapse', { key: entry.key }, 'Collapse :key')
            : t('dev_tools.expand', { key: entry.key }, 'Expand :key')
        }
      >
        {/* The tree is always left to right (it is code), so the chevron does not flip. */}
        <ChevronRightIcon
          className={cn('size-3 shrink-0 transition-transform', expanded && 'rotate-90')}
        />
        {key}
        <span className="text-muted-foreground">
          {entry.kind === 'array' ? `[${formatter.number(size)}]` : `{${formatter.number(size)}}`}
        </span>
      </button>
      {expanded && size > 0 && (
        <ul role="group">
          {jsonEntries(entry.value, entry.path).map((child) => (
            <JsonNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              search={search}
              query={query}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-mono text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function Row({ label, value, plain = false }: { label: string; value: string; plain?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('min-w-0 truncate', !plain && 'font-mono')} title={value}>
        {value}
      </dd>
    </>
  )
}
