<script lang="ts">
  import type { ListTabSchema } from '@alfakit/core'
  import { listTabIds, listTabUrl, tabKeyTarget, withDeferredTabBadges } from '@alfakit/core'
  import { router } from '@inertiajs/svelte'
  import { useAlfakitProps, useDirection, useT } from '../../context.svelte'
  import { extraProps } from '../../lib/attributes'
  import { badgeColorClasses, colorClass } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import Slot from '../panel/Slot.svelte'

  /**
   * Tabs above a resource's list table (`ListRecords::getTabs()`). Choosing one reloads the
   * page with `?activeTab=` (the server narrows the query); filters and search are kept.
   * Keyboard: one tab stop (the active tab), arrow keys / Home / End move focus (RTL-aware),
   * Enter / Space select. With `idBase` the tabs control the table panel (`listTabIds()`).
   */
  let {
    tabs,
    activeTab,
    tabsQueryKey,
    label,
    idBase,
  }: {
    tabs: ListTabSchema[]
    activeTab?: string
    tabsQueryKey?: string
    label?: string
    idBase?: string
  } = $props()

  const direction = $derived(useDirection())
  const buttons: Array<HTMLButtonElement | null> = $state([])

  const t = useT()
  // `deferBadge()` tabs get their badge from a deferred prop loaded after the page.
  const shown = $derived(withDeferredTabBadges(tabs, useAlfakitProps().alfakitTabBadges))

  const focusable = $derived(shown.some((tab) => tab.key === activeTab) ? activeTab : shown[0]?.key)

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const target = tabKeyTarget(event.key, index, shown.length, direction)

    if (target === null) return

    event.preventDefault()
    buttons[target]?.focus()
  }

  const select = (tab: ListTabSchema) => {
    if (tab.key === activeTab || typeof window === 'undefined') return

    router.visit(listTabUrl(window.location.href, tab.key, tabsQueryKey), {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    })
  }
</script>

<div
  data-slot="list-tabs"
  role="tablist"
  aria-label={label}
  class="bg-muted text-muted-foreground relative inline-flex h-9 w-fit max-w-full items-center overflow-x-auto rounded-lg p-[3px]"
>
  <Slot name="resource.list-records.tabs.start" />
  {#each shown as tab, index (tab.key)}
    {@const active = tab.key === activeTab}
    {@const ids = idBase ? listTabIds(idBase, tab.key) : null}
    <button
      bind:this={buttons[index]}
      {...extraProps(
        tab.extraAttributes,
        cn(
          'inline-flex h-[calc(100%-1px)] shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50',
          active ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
        ),
      )}
      type="button"
      role="tab"
      id={ids?.tab}
      aria-controls={ids?.panel}
      aria-selected={active}
      tabindex={tab.key === focusable ? 0 : -1}
      data-state={active ? 'active' : 'inactive'}
      onclick={() => select(tab)}
      onkeydown={(event) => onKeyDown(event, index)}
    >
      {#if tab.icon && tab.iconPosition !== 'after'}<Icon name={tab.icon} class="size-4" />{/if}
      {tab.label}
      {#if tab.icon && tab.iconPosition === 'after'}<Icon name={tab.icon} class="size-4" />{/if}
      {#if tab.badge !== undefined && tab.badge !== null}
        <span
          data-slot="badge"
          class={cn(
            'ms-1 rounded-md px-1.5 py-0 text-xs font-medium',
            colorClass(badgeColorClasses, tab.badgeColor, 'gray'),
          )}>{tab.badge}</span
        >
      {/if}
      {#if tab.badgePending}
        <span
          data-slot="badge"
          aria-busy="true"
          aria-label={t('loading', {}, 'Loading')}
          class="bg-muted-foreground/20 ms-1 inline-block h-4 w-5 animate-pulse rounded-md"
        ></span>
      {/if}
    </button>
  {/each}
  <Slot name="resource.list-records.tabs.end" />
</div>
