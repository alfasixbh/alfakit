<script lang="ts">
  import { uniqueKey } from '../../lib/keys'
  import type { TabsSchema } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import {
    componentHasErrors,
    readPersisted,
    schemaGapClass,
    tabFromQuery,
    tabQueryValue,
    tabToReveal,
    writePersisted,
  } from '@alfakit/core'
  import { onMount, untrack } from 'svelte'
  import { useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { useOptionalFormStore } from '../form/form-context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
  import { extraProps } from '../../lib/attributes'
  import DeferredSchema from './DeferredSchema.svelte'
  import TabBadge from './TabBadge.svelte'

  let { component }: { component: TabsSchema } = $props()

  const tabs = $derived(component.schema ?? [])

  let active = $state(
    untrack(() => {
      // The page URL (not `window.location`) so the server renders the same tab as the browser.
      const list = component.schema ?? []
      // The tab's readable value (`?tab=billing-address`), or its key in links from older versions.
      const fromQuery = component.queryStringKey
        ? tabFromQuery(
            list,
            new URL(page.url, 'http://localhost').searchParams.get(component.queryStringKey),
          )
        : null

      return fromQuery ?? list[Math.max(0, component.activeTab - 1)]?.key ?? list[0]?.key ?? ''
    }),
  )

  // `persistTab()`: restored after mounting (the server can't read browser storage); a
  // tab named in the query string wins.
  onMount(() => {
    const persist = component.persistTab

    if (!persist) return

    const fromQuery = component.queryStringKey
      ? tabFromQuery(tabs, new URL(window.location.href).searchParams.get(component.queryStringKey))
      : null

    if (fromQuery) return

    const stored = readPersisted(persist.key, persist.storage)

    if (stored && tabs.some((tab) => tab.key === stored)) active = stored
  })

  // Tabs holding a field with a validation error are marked, and when a submit brings new
  // errors while the open tab has none, the first tab with an error opens.
  const TAB_INVALID_CLASSES =
    'text-destructive data-[state=active]:text-destructive dark:text-destructive dark:data-[state=active]:text-destructive'
  const t = useT()
  const store = useOptionalFormStore()
  const formState = useStore(
    store?.store ?? {
      get: () => ({ errors: {} as Record<string, string[]> }),
      subscribe: () => () => {},
    },
  )
  const errors = $derived(formState.current.errors)
  let seenErrors: Record<string, string[]> = {}

  $effect.pre(() => {
    const next = errors

    untrack(() => {
      const reveal = tabToReveal(tabs, active, seenErrors, next)

      seenErrors = next
      if (reveal !== null) active = reveal
    })
  })

  function rememberTab(value: string) {
    const persist = component.persistTab

    if (persist) writePersisted(persist.key, value, persist.storage)
  }

  $effect(() => {
    if (!component.queryStringKey || typeof window === 'undefined') return

    const tab = tabs.find((item) => item.key === active)
    const url = new URL(window.location.href)
    url.searchParams.set(component.queryStringKey, tab ? tabQueryValue(tab) : active)
    window.history.replaceState(window.history.state, '', url)
  })
</script>

<Tabs
  data-surface={component.contained ? 'tabs' : undefined}
  bind:value={active}
  onValueChange={rememberTab}
  orientation={component.vertical ? 'vertical' : 'horizontal'}
  {...extraProps(
    component.extraAttributes,
    cn(
      component.contained && 'bg-card rounded-xl border shadow-xs',
      component.vertical && 'flex-row',
    ),
  )}
>
  <TabsList
    data-scrollable={component.scrollable === false ? 'false' : undefined}
    class={cn(
      component.contained && 'm-2',
      component.vertical
        ? 'self-start'
        : component.scrollable === false
          ? 'h-auto max-w-full flex-wrap justify-start'
          : 'relative max-w-full overflow-x-auto',
    )}
  >
    {#each tabs as tab, tabIndex (uniqueKey(tabs, tabIndex, (item) => item.key))}
      {@const invalid = componentHasErrors(tab, errors)}
      <TabsTrigger
        value={tab.key}
        data-invalid={invalid || undefined}
        class={invalid ? TAB_INVALID_CLASSES : undefined}
      >
        {#if tab.icon && tab.iconPosition !== 'after'}<Icon name={tab.icon} />{/if}
        {tab.label}
        {#if tab.icon && tab.iconPosition === 'after'}<Icon name={tab.icon} />{/if}
        <TabBadge {tab} />
        {#if invalid}
          <span aria-hidden="true" class="bg-destructive size-1.5 shrink-0 rounded-full"></span>
          <span class="sr-only">({t('translatable.has_errors')})</span>
        {/if}
      </TabsTrigger>
    {/each}
  </TabsList>
  {#each tabs as tab, tabIndex (uniqueKey(tabs, tabIndex, (item) => item.key))}
    <!-- Panels stay mounted (bits-ui only hides inactive ones, like React's forceMount) so
      hidden tabs keep their DOM state; bits-ui links each panel to its tab with
      `id` / `aria-labelledby` and the tab to it with `aria-controls`. -->
    <TabsContent value={tab.key} class={component.contained ? 'p-6 pt-4' : 'pt-4'}>
      <DeferredSchema component={tab}>
        {#snippet children(loaded)}
          <SchemaRenderer
            components={loaded.schema ?? []}
            columns={loaded.columns}
            attributes={loaded.extraAttributes}
            class={schemaGapClass(loaded) || undefined}
          />
        {/snippet}
      </DeferredSchema>
    </TabsContent>
  {/each}
</Tabs>
