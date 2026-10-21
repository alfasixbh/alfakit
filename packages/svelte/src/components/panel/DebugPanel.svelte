<script lang="ts">
  import { byteLength, debugRecorder, formatBytes } from '@alfakit/core'
  import BugIcon from '@lucide/svelte/icons/bug'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import { useAlfakitProps, useDirection, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
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
  import DebugFormState from './DebugFormState.svelte'
  import DebugTreeNode from './DebugTreeNode.svelte'

  /**
   * The developer debug panel: a top bar toggle that opens a drawer with the page's resolved
   * schema tree (visibility and authorisation per component, closures evaluated), the live
   * form state, the internal requests captured by `requestJson()` and timings. Rendered only
   * when the page carries the `alfakitDebug` prop, which PHP adds while `Panel::debugPanel()`
   * is active and `app.debug` is on. Replace it with `components: { 'panel:debug-panel': … }`.
   */
  const t = useT()
  const props = $derived(useAlfakitProps())
  const debug = $derived(props.alfakitDebug)
  const direction = $derived(useDirection())
  const state = useStore(debugRecorder.store)
  const payloadBytes = $derived(byteLength(props))

  function json(value: unknown): string {
    try {
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  function pathOf(url: string): string {
    try {
      const parsed = new URL(url, 'http://localhost')

      return parsed.pathname + parsed.search
    } catch {
      return url
    }
  }
</script>

{#snippet count(value: number)}
  <span
    class="bg-muted text-muted-foreground ms-1.5 rounded-full px-1.5 font-mono text-[10px] tabular-nums"
    >{value}</span
  >
{/snippet}

{#snippet stat(label: string, value: string)}
  <div class="rounded-md border p-3">
    <dt class="text-muted-foreground text-xs">{label}</dt>
    <dd class="font-mono text-sm font-semibold tabular-nums">{value}</dd>
  </div>
{/snippet}

{#if debug}
  <Sheet>
    <SheetTrigger>
      {#snippet child({ props: triggerProps })}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('debug.open', {}, 'Open debug panel')}
          {...triggerProps}
          data-slot="debug-toggle"
        >
          <BugIcon />
        </Button>
      {/snippet}
    </SheetTrigger>
    <SheetContent
      side={direction === 'rtl' ? 'left' : 'right'}
      class="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
    >
      <div data-slot="debug-panel" class="flex min-h-0 flex-1 flex-col">
        <SheetHeader class="border-b">
          <SheetTitle class="flex items-center gap-2">
            <BugIcon class="size-4" />
            {t('debug.title', {}, 'Debug')}
          </SheetTitle>
          <SheetDescription class="truncate font-mono text-xs" title={debug.page}>
            {debug.page}
          </SheetDescription>
        </SheetHeader>
        <Tabs value="schema" class="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList class="mx-4 mt-3 grid w-auto grid-cols-4">
            <TabsTrigger value="schema">{t('debug.schema', {}, 'Schema')}</TabsTrigger>
            <TabsTrigger value="form">
              {t('debug.form', {}, 'Form')}
              {#if state.current.forms.length > 0}{@render count(state.current.forms.length)}{/if}
            </TabsTrigger>
            <TabsTrigger value="requests">
              {t('debug.requests', {}, 'Requests')}
              {#if state.current.requests.length > 0}{@render count(
                  state.current.requests.length,
                )}{/if}
            </TabsTrigger>
            <TabsTrigger value="timings">{t('debug.timings', {}, 'Timings')}</TabsTrigger>
          </TabsList>
          <ScrollArea class="min-h-0 flex-1">
            <TabsContent value="schema" class="p-4 text-sm">
              {#if debug.tree.length === 0}
                <p class="text-muted-foreground text-sm">
                  {t('debug.no_tree', {}, 'The server sent no schema tree for this page.')}
                </p>
              {:else}
                <ul class="space-y-0.5 font-mono text-xs">
                  {#each debug.tree as node, index (`${node.key ?? node.type}-${index}`)}
                    <DebugTreeNode {node} depth={0} />
                  {/each}
                </ul>
              {/if}
            </TabsContent>
            <TabsContent value="form" class="space-y-4 p-4 text-sm">
              {#if state.current.forms.length === 0}
                <p class="text-muted-foreground text-sm">
                  {t('debug.no_forms', {}, 'No forms on this page.')}
                </p>
              {:else}
                {#each state.current.forms as form, index (index)}
                  <DebugFormState {form} />
                {/each}
              {/if}
            </TabsContent>
            <TabsContent value="requests" class="space-y-2 p-4 text-sm">
              {#if state.current.requests.length === 0}
                <p class="text-muted-foreground text-sm">
                  {t('debug.no_requests', {}, 'No internal requests yet.')}
                </p>
              {:else}
                <div class="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onclick={() => debugRecorder.clearRequests()}
                  >
                    {t('debug.clear', {}, 'Clear')}
                  </Button>
                </div>
                {#each state.current.requests as request (request.id)}
                  <Collapsible class="rounded-md border">
                    <CollapsibleTrigger
                      class="flex w-full items-center gap-2 px-3 py-2 text-start [&[data-state=open]>svg]:rotate-90"
                    >
                      <ChevronRightIcon
                        class="text-muted-foreground size-3.5 shrink-0 transition-transform rtl:rotate-180"
                      />
                      <span class="font-mono text-xs font-semibold">{request.method}</span>
                      <span class="min-w-0 flex-1 truncate font-mono text-xs" title={request.url}
                        >{pathOf(request.url)}</span
                      >
                      <Badge
                        variant={request.status === 0 || request.status >= 400
                          ? 'destructive'
                          : 'secondary'}
                        class="font-mono"
                        >{request.status === 0
                          ? t('debug.failed', {}, 'failed')
                          : request.status}</Badge
                      >
                      <span class="text-muted-foreground font-mono text-xs tabular-nums"
                        >{request.duration} ms</span
                      >
                    </CollapsibleTrigger>
                    <CollapsibleContent class="space-y-2 border-t px-3 py-2">
                      <dl
                        class="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs"
                      >
                        <dt>{t('debug.duration', {}, 'Duration')}</dt>
                        <dd class="font-mono tabular-nums">
                          {request.duration} ms
                          {#if request.serverDuration !== null}
                            ({t('debug.server_time', {}, 'Server time')}: {request.serverDuration} ms)
                          {/if}
                        </dd>
                        <dt>{t('debug.size', {}, 'Size')}</dt>
                        <dd class="font-mono tabular-nums">
                          ↑ {formatBytes(request.requestBytes)} · ↓ {formatBytes(
                            request.responseBytes,
                          )}
                        </dd>
                      </dl>
                      {#if request.request !== undefined && request.request !== null}
                        <pre
                          dir="ltr"
                          class="bg-muted/50 max-h-72 overflow-auto rounded-md p-2 text-start font-mono text-xs leading-relaxed">{json(
                            request.request,
                          )}</pre>
                      {/if}
                      <pre
                        dir="ltr"
                        class="bg-muted/50 max-h-72 overflow-auto rounded-md p-2 text-start font-mono text-xs leading-relaxed">{json(
                          request.response,
                        )}</pre>
                    </CollapsibleContent>
                  </Collapsible>
                {/each}
              {/if}
            </TabsContent>
            <TabsContent value="timings" class="space-y-4 p-4 text-sm">
              <dl class="grid grid-cols-2 gap-3">
                {@render stat(
                  t('debug.server_time', {}, 'Server time'),
                  `${debug.server.duration} ms`,
                )}
                {@render stat(
                  t('debug.queries', {}, 'Queries'),
                  `${debug.server.queries} · ${debug.server.queryTime} ms`,
                )}
                {@render stat(
                  t('debug.memory', {}, 'Peak memory'),
                  formatBytes(debug.server.memory),
                )}
                {@render stat(t('debug.payload', {}, 'Page payload'), formatBytes(payloadBytes))}
              </dl>
              <p class="text-muted-foreground font-mono text-xs">
                PHP {debug.server.php} · Laravel {debug.server.laravel}
              </p>
              <section>
                <h3 class="mb-2 text-sm font-medium">
                  {t('debug.closures', {}, 'Closures evaluated')}
                  {#if debug.closures.length > 0}{@render count(debug.closures.length)}{/if}
                </h3>
                {#if debug.closures.length === 0}
                  <p class="text-muted-foreground text-sm">
                    {t('debug.no_closures', {}, 'No closures were evaluated.')}
                  </p>
                {:else}
                  <ul class="divide-y rounded-md border font-mono text-xs">
                    {#each debug.closures as closure, index (index)}
                      <li class="flex items-center gap-2 px-3 py-1.5">
                        <span class="font-semibold">{closure.owner}</span>
                        <span
                          class="text-muted-foreground min-w-0 flex-1 truncate"
                          title={closure.file}>{closure.file}:{closure.line}</span
                        >
                        {#if closure.count > 1}
                          <Badge variant="secondary"
                            >{t('debug.times', { count: closure.count }, '×:count')}</Badge
                          >
                        {/if}
                      </li>
                    {/each}
                  </ul>
                {/if}
              </section>
              {#if (debug.deprecations ?? []).length > 0}
                <section>
                  <h3 class="mb-2 text-sm font-medium">
                    {t('debug.deprecations', {}, 'Deprecations')}
                    {@render count(debug.deprecations?.length ?? 0)}
                  </h3>
                  <ul class="divide-y rounded-md border text-xs">
                    {#each debug.deprecations ?? [] as item (item.subject)}
                      <li class="flex flex-col gap-0.5 px-3 py-1.5">
                        <span class="font-mono font-semibold"
                          >{item.subject}{#if item.since}<span
                              class="text-muted-foreground font-normal"
                            >
                              · {item.since}</span
                            >{/if}</span
                        >
                        <span class="text-muted-foreground">{item.message}</span>
                      </li>
                    {/each}
                  </ul>
                </section>
              {/if}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </SheetContent>
  </Sheet>
{/if}
