<script setup lang="ts">
import {
  jsonEntries,
  jsonScalar,
  jsonSize,
  type JsonEntry,
  type JsonSearchResult,
} from '@alfakit/core'
import { ChevronRightIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useFormatter, useT } from '../../context'
import { cn } from '../../lib/utils'

defineOptions({ name: 'DevToolsJsonNode' })

const props = defineProps<{
  entry: JsonEntry
  depth: number
  search: JsonSearchResult
  query: string
}>()

const t = useT()
const formatter = useFormatter()
const open = ref(props.depth < 1)
const searching = computed(() => props.query.trim() !== '')
const hidden = computed(() => searching.value && !props.search.visible.has(props.entry.path))
const container = computed(() => props.entry.kind === 'object' || props.entry.kind === 'array')
const expanded = computed(() => searching.value || open.value)
const matched = computed(() => props.search.matches.has(props.entry.path))
const size = computed(() => jsonSize(props.entry.value))
const summary = computed(() => {
  const count = formatter.value.number(size.value)

  return props.entry.kind === 'array' ? `[${count}]` : `{${count}}`
})
const children = computed(() =>
  expanded.value ? jsonEntries(props.entry.value, props.entry.path) : [],
)
</script>

<template>
  <template v-if="!hidden">
    <li
      v-if="!container"
      role="treeitem"
      aria-selected="false"
      class="py-px"
      :style="{ paddingInlineStart: `${depth * 12 + 16}px` }"
    >
      <span :class="cn('text-foreground', matched && 'bg-primary/15 rounded-sm')">{{
        entry.key
      }}</span>
      <span class="text-muted-foreground">: </span>
      <span
        :class="
          cn(
            entry.kind === 'string' && 'text-emerald-700 dark:text-emerald-400',
            entry.kind === 'number' && 'text-sky-700 dark:text-sky-400',
            entry.kind === 'boolean' && 'text-violet-700 dark:text-violet-400',
            entry.kind === 'null' && 'text-muted-foreground',
            'break-all',
          )
        "
        >{{ jsonScalar(entry.value) }}</span
      >
    </li>
    <li v-else role="treeitem" aria-selected="false" :aria-expanded="expanded">
      <button
        type="button"
        class="hover:bg-muted flex w-full items-center gap-1 rounded py-px text-start"
        :style="{ paddingInlineStart: `${depth * 12}px` }"
        :aria-label="
          expanded
            ? t('dev_tools.collapse', { key: entry.key }, 'Collapse :key')
            : t('dev_tools.expand', { key: entry.key }, 'Expand :key')
        "
        @click="open = !open"
      >
        <!-- The tree is always left to right (it is code), so the chevron does not flip. -->
        <ChevronRightIcon
          :class="cn('size-3 shrink-0 transition-transform', expanded && 'rotate-90')"
        />
        <span :class="cn('text-foreground', matched && 'bg-primary/15 rounded-sm')">{{
          entry.key
        }}</span>
        <span class="text-muted-foreground">{{ summary }}</span>
      </button>
      <ul v-if="expanded && size > 0" role="group">
        <DevToolsJsonNode
          v-for="child in children"
          :key="child.path"
          :entry="child"
          :depth="depth + 1"
          :search="search"
          :query="query"
        />
      </ul>
    </li>
  </template>
</template>
