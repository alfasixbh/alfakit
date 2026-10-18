<script lang="ts">
  import { uniqueKey } from '../lib/keys'
  import type { RelationManagersBlock } from '@alfakit/core'
  import type { ContentBlock } from '@alfakit/core'
  import {
    hasRelationManagerTabs,
    isLazyPlaceholder,
    RELATION_QUERY_KEY,
    relationManagerTabs,
    relationTabFromQuery,
    relationTabSlug,
  } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import { untrack } from 'svelte'
  import LazyPlaceholder from '../components/panel/LazyPlaceholder.svelte'
  import Slot from '../components/panel/Slot.svelte'
  import DataTable from '../components/table/DataTable.svelte'
  import { Badge } from '../components/ui/badge'
  import ContentBlockRenderer from './ContentBlockRenderer.svelte'
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
  import Icon from '../lib/Icon.svelte'
  import { badgeColorClasses, colorClass } from '../lib/colors'
  import { cn } from '../lib/utils'

  let { block }: { block: RelationManagersBlock } = $props()

  const tabs = $derived(relationManagerTabs(block))
  // `?relation=`: a key in `getRelations()` or a position. The page URL (not
  // `window.location`) so the server renders the same tab as the browser.
  let active = $state(
    untrack(() => {
      const initial = relationManagerTabs(block)
      const fromQuery = relationTabFromQuery(
        initial,
        new URL(page.url, 'http://localhost').searchParams.get(RELATION_QUERY_KEY),
      )

      return fromQuery?.key ?? initial[0]?.key ?? ''
    }),
  )

  function changeTab(key: string) {
    active = key

    if (typeof window === 'undefined') return

    const next = new URL(window.location.href)
    const slug = relationTabSlug(tabs, key)

    if (slug === null) next.searchParams.delete(RELATION_QUERY_KEY)
    else next.searchParams.set(RELATION_QUERY_KEY, slug)

    window.history.replaceState(window.history.state, '', next)
  }
  const single = $derived(hasRelationManagerTabs(block) ? undefined : block.managers[0])
</script>

{#if single}
  <section class="flex flex-col gap-3">
    <Slot name="resource.relation-manager.before" scope={single.key} />
    {#if isLazyPlaceholder(single)}
      <LazyPlaceholder variant="table" />
    {:else}
      <DataTable
        table={{ ...single.table, heading: single.table.heading ?? single.title }}
        component={single.component}
      />
    {/if}
    <Slot name="resource.relation-manager.after" scope={single.key} />
  </section>
{:else if block.managers.length > 0}
  <Tabs bind:value={() => active, changeTab}>
    <TabsList>
      <Slot name="resource.tabs.start" />
      {#each tabs as tab, tabIndex (uniqueKey(tabs, tabIndex, (item) => item.key))}
        <TabsTrigger value={tab.key}>
          {#if tab.icon}<Icon name={tab.icon} />{/if}
          {tab.title}
          {#if tab.badge !== undefined && tab.badge !== null && tab.badge !== ''}<Badge
              variant="secondary"
              title={tab.badgeTooltip}
              class={cn(
                'ms-1 px-1.5 py-0',
                tab.badgeColor && colorClass(badgeColorClasses, tab.badgeColor, 'gray'),
              )}
              >{tab.badge}{#if tab.badgeTooltip}<span class="sr-only"
                  >{` (${tab.badgeTooltip})`}</span
                >{/if}</Badge
            >{/if}
        </TabsTrigger>
      {/each}
      <Slot name="resource.tabs.end" />
    </TabsList>
    {#each tabs as tab, tabIndex (uniqueKey(tabs, tabIndex, (item) => item.key))}
      <TabsContent
        value={tab.key}
        class="flex flex-col gap-6 pt-2"
        data-slot={tab.group ? 'relation-group' : tab.content ? 'relation-content' : undefined}
      >
        <!-- The page's form / infolist (`hasCombinedRelationManagerTabsWithContent()`). -->
        {#if tab.content}<ContentBlockRenderer block={tab.content as ContentBlock} />{/if}
        {#each tab.managers as manager (manager.key)}
          <Slot name="resource.relation-manager.before" scope={manager.key} />
          {#if isLazyPlaceholder(manager)}
            <LazyPlaceholder variant="table" />
          {:else}
            <!-- Inside a group each table keeps its own heading; a lone manager's is the tab. -->
            <DataTable
              table={{
                ...manager.table,
                heading: tab.group ? (manager.table.heading ?? manager.title) : undefined,
              }}
              component={manager.component}
            />
          {/if}
          <Slot name="resource.relation-manager.after" scope={manager.key} />
        {/each}
      </TabsContent>
    {/each}
  </Tabs>
{/if}
