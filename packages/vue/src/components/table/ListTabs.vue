<script setup lang="ts">
import type { ListTabSchema } from '@alfakit/core'
import { listTabIds, listTabUrl, tabKeyTarget, withDeferredTabBadges } from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { computed } from 'vue'
import { useAlfakitProps, useDirection, useT } from '../../context'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Slot from '../panel/Slot.vue'

/**
 * Tabs above a resource's list table (`ListRecords::getTabs()`). Choosing one reloads the
 * page with `?activeTab=` (the server narrows the query); filters and search are kept.
 * Keyboard: one tab stop (the active tab), arrow keys / Home / End move focus (RTL-aware),
 * Enter / Space select. With `idBase` the tabs control the table panel (`listTabIds()`).
 */
const props = defineProps<{
  tabs: ListTabSchema[]
  activeTab?: string
  tabsQueryKey?: string
  label?: string
  idBase?: string
}>()

const direction = useDirection()
const buttons: Array<HTMLButtonElement | null> = []
const focusable = computed(() =>
  shown.value.some((tab) => tab.key === props.activeTab) ? props.activeTab : shown.value[0]?.key,
)
const ids = (key: string) => (props.idBase ? listTabIds(props.idBase, key) : null)

const onKeyDown = (event: KeyboardEvent, index: number) => {
  const target = tabKeyTarget(event.key, index, shown.value.length, direction.value)

  if (target === null) return

  event.preventDefault()
  buttons[target]?.focus()
}

const t = useT()
const pageProps = useAlfakitProps()
// `deferBadge()` tabs get their badge from a deferred prop loaded after the page.
const shown = computed(() => withDeferredTabBadges(props.tabs, pageProps.value.alfakitTabBadges))

const select = (tab: ListTabSchema) => {
  if (tab.key === props.activeTab || typeof window === 'undefined') return

  router.visit(listTabUrl(window.location.href, tab.key, props.tabsQueryKey), {
    preserveState: true,
    preserveScroll: true,
    replace: true,
  })
}
</script>

<template>
  <div
    data-slot="list-tabs"
    role="tablist"
    :aria-label="props.label"
    class="bg-muted text-muted-foreground relative inline-flex h-9 w-fit max-w-full items-center overflow-x-auto rounded-lg p-[3px]"
  >
    <Slot name="resource.list-records.tabs.start" />
    <button
      v-for="(tab, index) in shown"
      :key="tab.key"
      :ref="(element) => (buttons[index] = element as HTMLButtonElement | null)"
      v-bind="tab.extraAttributes"
      type="button"
      role="tab"
      :id="ids(tab.key)?.tab"
      :aria-controls="ids(tab.key)?.panel"
      :tabindex="tab.key === focusable ? 0 : -1"
      :aria-selected="tab.key === props.activeTab"
      :data-state="tab.key === props.activeTab ? 'active' : 'inactive'"
      :class="
        cn(
          'inline-flex h-[calc(100%-1px)] shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50',
          tab.key === props.activeTab
            ? 'bg-background text-foreground shadow-sm'
            : 'text-foreground/70 hover:text-foreground',
        )
      "
      @click="select(tab)"
      @keydown="onKeyDown($event, index)"
    >
      <Icon v-if="tab.icon && tab.iconPosition !== 'after'" :name="tab.icon" class="size-4" />
      {{ tab.label }}
      <Icon v-if="tab.icon && tab.iconPosition === 'after'" :name="tab.icon" class="size-4" />
      <span
        v-if="tab.badge !== undefined && tab.badge !== null"
        data-slot="badge"
        :class="
          cn(
            'ms-1 rounded-md px-1.5 py-0 text-xs font-medium',
            colorClass(badgeColorClasses, tab.badgeColor, 'gray'),
          )
        "
        >{{ tab.badge }}</span
      >
      <span
        v-if="tab.badgePending"
        data-slot="badge"
        aria-busy="true"
        :aria-label="t('loading', {}, 'Loading')"
        class="bg-muted-foreground/20 ms-1 inline-block h-4 w-5 animate-pulse rounded-md"
      />
    </button>
    <Slot name="resource.list-records.tabs.end" />
  </div>
</template>
