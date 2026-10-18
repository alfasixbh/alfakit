<script lang="ts">
  import { uniqueKey } from '../../lib/keys'
  import type { TabsSchema } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import { readPersisted, schemaGapClass, writePersisted } from '@alfakit/core'
  import { onMount, untrack } from 'svelte'
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
      const fromQuery = component.queryStringKey
        ? new URL(page.url, 'http://localhost').searchParams.get(component.queryStringKey)
        : null
      const list = component.schema ?? []

      return (
        list.find((tab) => tab.key === fromQuery)?.key ??
        list[Math.max(0, component.activeTab - 1)]?.key ??
        list[0]?.key ??
        ''
      )
    }),
  )

  // `persistTab()`: restored after mounting (the server can't read browser storage); a
  // tab named in the query string wins.
  onMount(() => {
    const persist = component.persistTab

    if (!persist) return

    const fromQuery = component.queryStringKey
      ? new URL(window.location.href).searchParams.get(component.queryStringKey)
      : null

    if (fromQuery) return

    const stored = readPersisted(persist.key, persist.storage)

    if (stored && tabs.some((tab) => tab.key === stored)) active = stored
  })

  function rememberTab(value: string) {
    const persist = component.persistTab

    if (persist) writePersisted(persist.key, value, persist.storage)
  }

  $effect(() => {
    if (!component.queryStringKey || typeof window === 'undefined') return

    const url = new URL(window.location.href)
    url.searchParams.set(component.queryStringKey, active)
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
      <TabsTrigger value={tab.key}>
        {#if tab.icon && tab.iconPosition !== 'after'}<Icon name={tab.icon} />{/if}
        {tab.label}
        {#if tab.icon && tab.iconPosition === 'after'}<Icon name={tab.icon} />{/if}
        <TabBadge {tab} />
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
