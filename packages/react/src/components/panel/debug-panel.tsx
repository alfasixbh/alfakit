import type { DebugNode, DebugSchema, FormStore } from '@alfakit/core'
import { byteLength, debugRecorder, formatBytes } from '@alfakit/core'
import { BugIcon, ChevronRightIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAlfakitProps, useDirection, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { ScrollArea } from '../ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

export { DebugPanelSlot } from './debug-panel-slot'

/**
 * The developer debug panel: a top bar toggle that opens a drawer with the page's resolved
 * schema tree (visibility and authorisation per component, closures evaluated), the live
 * form state, the internal requests captured by `requestJson()` and timings. Rendered only
 * when the page carries the `alfakitDebug` prop, which PHP adds while `Panel::debugPanel()`
 * is active and `app.debug` is on. Replace it with `components: { 'panel:debug-panel': … }`.
 */
export function DebugPanel() {
  const props = useAlfakitProps()
  const t = useT()
  const direction = useDirection()
  const debug = props.alfakitDebug

  if (!debug) {
    return null
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('debug.open', {}, 'Open debug panel')}
          data-slot="debug-toggle"
        >
          <BugIcon />
        </Button>
      </SheetTrigger>
      <SheetContent
        side={direction === 'rtl' ? 'left' : 'right'}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <div data-slot="debug-panel" className="flex min-h-0 flex-1 flex-col">
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <BugIcon className="size-4" />
              {t('debug.title', {}, 'Debug')}
            </SheetTitle>
            <SheetDescription className="truncate font-mono text-xs" title={debug.page}>
              {debug.page}
            </SheetDescription>
          </SheetHeader>
          <DebugTabs debug={debug} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DebugTabs({ debug }: { debug: DebugSchema }) {
  const t = useT()
  const props = useAlfakitProps()
  const state = useStore(debugRecorder.store)
  const payloadBytes = useMemo(() => byteLength(props), [props])

  return (
    <Tabs defaultValue="schema" className="flex min-h-0 flex-1 flex-col gap-0">
      <TabsList className="mx-4 mt-3 grid w-auto grid-cols-4">
        <TabsTrigger value="schema">{t('debug.schema', {}, 'Schema')}</TabsTrigger>
        <TabsTrigger value="form">
          {t('debug.form', {}, 'Form')}
          {state.forms.length > 0 && <Count value={state.forms.length} />}
        </TabsTrigger>
        <TabsTrigger value="requests">
          {t('debug.requests', {}, 'Requests')}
          {state.requests.length > 0 && <Count value={state.requests.length} />}
        </TabsTrigger>
        <TabsTrigger value="timings">{t('debug.timings', {}, 'Timings')}</TabsTrigger>
      </TabsList>
      <ScrollArea className="min-h-0 flex-1">
        <TabsContent value="schema" className="p-4 text-sm">
          {debug.tree.length === 0 ? (
            <Empty>{t('debug.no_tree', {}, 'The server sent no schema tree for this page.')}</Empty>
          ) : (
            <ul className="space-y-0.5 font-mono text-xs">
              {debug.tree.map((node, index) => (
                <DebugTreeNode key={`${node.key ?? node.type}-${index}`} node={node} depth={0} />
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="form" className="space-y-4 p-4 text-sm">
          {state.forms.length === 0 ? (
            <Empty>{t('debug.no_forms', {}, 'No forms on this page.')}</Empty>
          ) : (
            state.forms.map((form, index) => <FormStateView key={index} form={form} />)
          )}
        </TabsContent>
        <TabsContent value="requests" className="space-y-2 p-4 text-sm">
          {state.requests.length === 0 ? (
            <Empty>{t('debug.no_requests', {}, 'No internal requests yet.')}</Empty>
          ) : (
            <>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => debugRecorder.clearRequests()}
                >
                  {t('debug.clear', {}, 'Clear')}
                </Button>
              </div>
              {state.requests.map((request) => (
                <Collapsible key={request.id} className="rounded-md border">
                  <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-start [&[data-state=open]>svg]:rotate-90">
                    <ChevronRightIcon className="text-muted-foreground size-3.5 shrink-0 transition-transform rtl:rotate-180" />
                    <span className="font-mono text-xs font-semibold">{request.method}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs" title={request.url}>
                      {pathOf(request.url)}
                    </span>
                    <Badge
                      variant={
                        request.status === 0 || request.status >= 400 ? 'destructive' : 'secondary'
                      }
                      className="font-mono"
                    >
                      {request.status === 0 ? t('debug.failed', {}, 'failed') : request.status}
                    </Badge>
                    <span className="text-muted-foreground font-mono text-xs tabular-nums">
                      {request.duration} ms
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 border-t px-3 py-2">
                    <dl className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                      <dt>{t('debug.duration', {}, 'Duration')}</dt>
                      <dd className="font-mono tabular-nums">
                        {request.duration} ms
                        {request.serverDuration !== null &&
                          ` (${t('debug.server_time', {}, 'Server time')}: ${request.serverDuration} ms)`}
                      </dd>
                      <dt>{t('debug.size', {}, 'Size')}</dt>
                      <dd className="font-mono tabular-nums">
                        ↑ {formatBytes(request.requestBytes)} · ↓{' '}
                        {formatBytes(request.responseBytes)}
                      </dd>
                    </dl>
                    {request.request !== undefined && request.request !== null && (
                      <Json value={request.request} />
                    )}
                    <Json value={request.response} />
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </>
          )}
        </TabsContent>
        <TabsContent value="timings" className="space-y-4 p-4 text-sm">
          <dl className="grid grid-cols-2 gap-3">
            <Stat
              label={t('debug.server_time', {}, 'Server time')}
              value={`${debug.server.duration} ms`}
            />
            <Stat
              label={t('debug.queries', {}, 'Queries')}
              value={`${debug.server.queries} · ${debug.server.queryTime} ms`}
            />
            <Stat
              label={t('debug.memory', {}, 'Peak memory')}
              value={formatBytes(debug.server.memory)}
            />
            <Stat
              label={t('debug.payload', {}, 'Page payload')}
              value={formatBytes(payloadBytes)}
            />
          </dl>
          <p className="text-muted-foreground font-mono text-xs">
            PHP {debug.server.php} · Laravel {debug.server.laravel}
          </p>
          <section>
            <h3 className="mb-2 text-sm font-medium">
              {t('debug.closures', {}, 'Closures evaluated')}
              {debug.closures.length > 0 && <Count value={debug.closures.length} />}
            </h3>
            {debug.closures.length === 0 ? (
              <Empty>{t('debug.no_closures', {}, 'No closures were evaluated.')}</Empty>
            ) : (
              <ul className="divide-y rounded-md border font-mono text-xs">
                {debug.closures.map((closure, index) => (
                  <li key={index} className="flex items-center gap-2 px-3 py-1.5">
                    <span className="font-semibold">{closure.owner}</span>
                    <span
                      className="text-muted-foreground min-w-0 flex-1 truncate"
                      title={closure.file}
                    >
                      {closure.file}:{closure.line}
                    </span>
                    {closure.count > 1 && (
                      <Badge variant="secondary">
                        {t('debug.times', { count: closure.count }, '×:count')}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          {(debug.deprecations ?? []).length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-medium">
                {t('debug.deprecations', {}, 'Deprecations')}
                <Count value={debug.deprecations!.length} />
              </h3>
              <ul className="divide-y rounded-md border text-xs">
                {debug.deprecations!.map((item) => (
                  <li key={item.subject} className="flex flex-col gap-0.5 px-3 py-1.5">
                    <span className="font-mono font-semibold">
                      {item.subject}
                      {item.since && (
                        <span className="text-muted-foreground font-normal"> · {item.since}</span>
                      )}
                    </span>
                    <span className="text-muted-foreground">{item.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </TabsContent>
      </ScrollArea>
    </Tabs>
  )
}

export function DebugTreeNode({ node, depth }: { node: DebugNode; depth: number }) {
  const t = useT()
  const children = node.children ?? []
  const [open, setOpen] = useState(depth < 2)
  const details = Object.entries(node.details ?? {}).filter(
    ([, value]) => value !== null && value !== false && value !== '',
  )

  const row = (
    <div
      className={cn(
        'flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5',
        !node.visible && 'text-muted-foreground',
      )}
    >
      {children.length > 0 ? (
        <ChevronRightIcon
          className={cn(
            'size-3.5 shrink-0 transition-transform rtl:rotate-180',
            open && 'rotate-90 rtl:rotate-90',
          )}
        />
      ) : (
        <span className="size-3.5 shrink-0" />
      )}
      <span className={cn('font-semibold', !node.visible && 'line-through')}>{node.type}</span>
      {node.key && <span className="truncate">{node.key}</span>}
      {node.label && node.label !== node.key && (
        <span className="text-muted-foreground truncate">“{node.label}”</span>
      )}
      {details.map(([name, value]) => (
        <span key={name} className="text-muted-foreground truncate">
          {value === true ? name : `${name}=${String(value)}`}
        </span>
      ))}
      {!node.visible && (
        <Badge
          variant={node.authorized === false ? 'destructive' : 'outline'}
          className="ms-auto shrink-0 font-sans"
        >
          {node.authorized === false
            ? t('debug.unauthorized', {}, 'unauthorized')
            : (node.reason ?? t('debug.hidden', {}, 'hidden'))}
        </Badge>
      )}
    </div>
  )

  if (children.length === 0) {
    return <li style={{ paddingInlineStart: `${depth * 12}px` }}>{row}</li>
  }

  return (
    <li style={{ paddingInlineStart: `${depth * 12}px` }}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="hover:bg-muted/60 w-full rounded text-start">
          {row}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="space-y-0.5">
            {children.map((child, index) => (
              <DebugTreeNode key={`${child.key ?? child.type}-${index}`} node={child} depth={1} />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

function FormStateView({ form }: { form: FormStore }) {
  const t = useT()
  const state = useStore(form.store)
  const dirty = [...state.dirty]
  const errors = Object.keys(state.errors)

  return (
    <section className="space-y-2 rounded-md border p-3">
      <header className="flex flex-wrap items-center gap-2 font-mono text-xs">
        <span className="font-semibold">{form.component}</span>
        {form.record !== null && <span className="text-muted-foreground">#{form.record}</span>}
        {state.processing && <Badge variant="secondary">processing</Badge>}
        {state.refreshing && <Badge variant="secondary">refreshing</Badge>}
      </header>
      <h4 className="text-muted-foreground text-xs font-medium">
        {t('debug.values', {}, 'Values')}
      </h4>
      <Json value={state.values} />
      {dirty.length > 0 && (
        <>
          <h4 className="text-muted-foreground text-xs font-medium">
            {t('debug.dirty', {}, 'Dirty fields')}
          </h4>
          <div className="flex flex-wrap gap-1">
            {dirty.map((path) => (
              <Badge key={path} variant="outline" className="font-mono">
                {path}
              </Badge>
            ))}
          </div>
        </>
      )}
      {errors.length > 0 && (
        <>
          <h4 className="text-destructive text-xs font-medium">
            {t('debug.errors', {}, 'Errors')}
          </h4>
          <Json value={state.errors} />
        </>
      )}
    </section>
  )
}

function Json({ value }: { value: unknown }) {
  const text = useMemo(() => {
    try {
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }, [value])

  return (
    <pre
      dir="ltr"
      className="bg-muted/50 max-h-72 overflow-auto rounded-md p-2 text-start font-mono text-xs leading-relaxed"
    >
      {text}
    </pre>
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

function Count({ value }: { value: number }) {
  return (
    <span className="bg-muted text-muted-foreground ms-1.5 rounded-full px-1.5 font-mono text-[10px] tabular-nums">
      {value}
    </span>
  )
}

function Empty({ children }: { children: string }) {
  return <p className="text-muted-foreground text-sm">{children}</p>
}

function pathOf(url: string): string {
  try {
    const parsed = new URL(url, 'http://localhost')

    return parsed.pathname + parsed.search
  } catch {
    return url
  }
}
