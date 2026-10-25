<script lang="ts">
  import {
    byteLength,
    formatBytes,
    inspectableProps,
    jsonEntries,
    jsonScalar,
    latestServerTiming,
    prettyJson,
    searchJson,
  } from '@alfakit/core'
  import { router } from '@inertiajs/svelte'
  import BracesIcon from '@lucide/svelte/icons/braces'
  import CheckIcon from '@lucide/svelte/icons/check'
  import CopyIcon from '@lucide/svelte/icons/copy'
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link'
  import { onMount } from 'svelte'
  import { useAlfakitProps, useDirection, useFormatter, useT } from '../../context.svelte'
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
  import DevToolsJsonNode from './DevToolsJsonNode.svelte'

  /**
   * The schema inspector: a floating developer button that opens a drawer with the page's
   * props as a searchable JSON tree (with a copy button), what the context token identifies,
   * the server time reported in `Server-Timing`, the payload size and editor links for the
   * PHP classes behind the page. Rendered only for pages that carry `alfakitDevTools`.
   */
  const t = useT()
  const formatter = useFormatter()
  const props = $derived(useAlfakitProps())
  const direction = $derived(useDirection())
  const tools = $derived(props.alfakitDevTools)
  const data = $derived(inspectableProps(props as unknown as Record<string, unknown>))
  const payload = $derived(byteLength(props))
  let query = $state('')
  let copied = $state(false)
  let serverTime = $state<number | null>(null)
  const search = $derived(searchJson(data, query))
  const roots = $derived(jsonEntries(data))
  const parameters = $derived(Object.entries(tools?.context.parameters ?? {}))
  let timer: ReturnType<typeof setTimeout> | undefined

  onMount(() => {
    serverTime = latestServerTiming()
    // Re-read after every visit: the latest response carries the newest header.
    const stop = router.on('finish', () => {
      serverTime = latestServerTiming()
    })

    return () => {
      stop()
      clearTimeout(timer)
    }
  })

  function copy() {
    void navigator.clipboard?.writeText(prettyJson(data)).then(() => {
      copied = true
      clearTimeout(timer)
      timer = setTimeout(() => (copied = false), 2000)
    })
  }

  function time(value: number | null): string {
    return value === null
      ? t('dev_tools.never', {}, 'Never')
      : formatter.current.dateTime(value * 1000)
  }
</script>

{#snippet stat(label: string, value: string)}
  <div class="rounded-md border p-3">
    <dt class="text-muted-foreground text-xs">{label}</dt>
    <dd class="font-mono text-sm font-semibold tabular-nums">{value}</dd>
  </div>
{/snippet}

{#snippet row(label: string, value: string, plain = false)}
  <dt class="text-muted-foreground">{label}</dt>
  <dd class={plain ? 'min-w-0 truncate' : 'min-w-0 truncate font-mono'} title={value}>{value}</dd>
{/snippet}

{#if tools}
  <Sheet>
    <SheetTrigger>
      {#snippet child({ props: triggerProps })}
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('dev_tools.open', {}, 'Open schema inspector')}
          class="fixed end-4 bottom-16 z-40 rounded-full shadow-md [[data-slot=starter-kit-root]_&]:end-auto [[data-slot=starter-kit-root]_&]:right-4"
          {...triggerProps}
          data-slot="dev-tools-toggle"
        >
          <BracesIcon />
        </Button>
      {/snippet}
    </SheetTrigger>
    <SheetContent
      side={direction === 'rtl' ? 'left' : 'right'}
      class="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
    >
      <div data-slot="dev-tools" class="flex min-h-0 flex-1 flex-col">
        <SheetHeader class="border-b">
          <SheetTitle class="flex items-center gap-2">
            <BracesIcon class="size-4" />
            {t('dev_tools.title', {}, 'Schema inspector')}
          </SheetTitle>
          <SheetDescription class="truncate font-mono text-xs" title={tools.context.page}>
            {tools.context.page}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea class="min-h-0 flex-1">
          <div class="space-y-5 p-4 text-sm">
            <dl class="grid grid-cols-2 gap-3">
              {@render stat(
                t('dev_tools.server_time', {}, 'Server time'),
                serverTime === null
                  ? t('dev_tools.not_measured', {}, 'Not measured')
                  : t(
                      'dev_tools.milliseconds',
                      { value: formatter.current.number(serverTime) },
                      ':value ms',
                    ),
              )}
              {@render stat(t('dev_tools.payload', {}, 'Payload size'), formatBytes(payload))}
            </dl>

            <section data-slot="dev-tools-context">
              <h3 class="mb-2 text-sm font-medium">
                {t('dev_tools.context', {}, 'Context token')}
              </h3>
              <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                {@render row(t('dev_tools.panel', {}, 'Panel'), tools.context.panel)}
                {@render row(t('dev_tools.page', {}, 'Page'), tools.context.page)}
                {#if tools.context.component}
                  {@render row(t('dev_tools.component', {}, 'Component'), tools.context.component)}
                {/if}
                {#if tools.tenant !== null}
                  {@render row(t('dev_tools.tenant', {}, 'Tenant'), tools.tenant)}
                {/if}
                {#each parameters as [key, value] (key)}
                  {@render row(key, jsonScalar(value))}
                {/each}
                {@render row(
                  t('dev_tools.bound_to_user', {}, 'Bound to the user'),
                  tools.context.boundToUser
                    ? t('dev_tools.yes', {}, 'Yes')
                    : t('dev_tools.no', {}, 'No'),
                  true,
                )}
                {@render row(
                  t('dev_tools.issued_at', {}, 'Issued'),
                  time(tools.context.issuedAt),
                  true,
                )}
                {@render row(
                  t('dev_tools.expires_at', {}, 'Expires'),
                  time(tools.context.expiresAt),
                  true,
                )}
              </dl>
            </section>

            <section data-slot="dev-tools-classes">
              <h3 class="mb-2 text-sm font-medium">{t('dev_tools.classes', {}, 'Classes')}</h3>
              <ul class="divide-y rounded-md border text-xs">
                {#each tools.classes as item (item.role)}
                  <li class="flex items-center gap-2 px-3 py-1.5">
                    <span class="text-muted-foreground w-16 shrink-0">
                      {t(`dev_tools.roles.${item.role}`, {}, item.role)}
                    </span>
                    <span
                      class="min-w-0 flex-1 truncate font-mono"
                      title={item.file ? `${item.file}:${item.line ?? 1}` : item.class}
                    >
                      {item.class}
                    </span>
                    {#if item.url}
                      <a
                        href={item.url}
                        class="text-primary inline-flex shrink-0 items-center gap-1 hover:underline"
                        aria-label={t(
                          'dev_tools.open_in_editor',
                          { class: item.class, editor: tools.editor ?? '' },
                          'Open :class in :editor',
                        )}
                      >
                        <ExternalLinkIcon class="size-3.5" />
                      </a>
                    {/if}
                  </li>
                {/each}
              </ul>
              {#if tools.editor === null}
                <p class="text-muted-foreground mt-2 text-xs">
                  {t(
                    'dev_tools.no_editor',
                    {},
                    'Set APP_EDITOR (config app.editor) to open these classes in your editor.',
                  )}
                </p>
              {/if}
            </section>

            <section data-slot="dev-tools-schema">
              <div class="mb-2 flex items-center gap-2">
                <h3 class="me-auto text-sm font-medium">{t('dev_tools.schema', {}, 'Schema')}</h3>
                <Button type="button" variant="ghost" size="sm" onclick={copy}>
                  {#if copied}<CheckIcon />{:else}<CopyIcon />{/if}
                  {copied
                    ? t('dev_tools.copied', {}, 'Copied')
                    : t('dev_tools.copy', {}, 'Copy JSON')}
                </Button>
              </div>
              <Input
                type="search"
                bind:value={query}
                placeholder={t('dev_tools.search', {}, 'Search keys and values')}
                aria-label={t('dev_tools.search', {}, 'Search keys and values')}
                class="mb-2 h-8"
              />
              {#if query.trim() !== '' && search.matches.size === 0}
                <p class="text-muted-foreground text-sm">
                  {t('dev_tools.no_matches', { query: query.trim() }, 'Nothing matches “:query”.')}
                </p>
              {:else}
                <ul
                  dir="ltr"
                  role="tree"
                  aria-label={t('dev_tools.schema', {}, 'Schema')}
                  class="bg-muted/40 overflow-x-auto rounded-md p-2 text-start font-mono text-xs leading-relaxed"
                >
                  {#each roots as entry (entry.path)}
                    <DevToolsJsonNode {entry} depth={0} {search} {query} />
                  {/each}
                </ul>
              {/if}
            </section>
          </div>
        </ScrollArea>
      </div>
    </SheetContent>
  </Sheet>
{/if}
