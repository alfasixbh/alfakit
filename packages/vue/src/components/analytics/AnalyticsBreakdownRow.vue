<script setup lang="ts">
import type { AnalyticsBreakdownRowSchema } from '@alfakit/core'
import { analyticsChangeColor } from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import { computed } from 'vue'
import { useT } from '../../context'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'

const props = defineProps<{ row: AnalyticsBreakdownRowSchema; columns: string[] }>()

const t = useT()
const changeColor = computed(() => analyticsChangeColor(props.row.change))
// Links announce what they do; the visible label is then hidden from screen readers.
const linkLabel = computed(() =>
  props.row.url
    ? props.row.active
      ? t('analytics.remove_filter', { label: props.row.label }, 'Remove filter :label')
      : t('analytics.filter_by', { label: props.row.label }, 'Filter by :label')
    : null,
)
const rowClass = computed(() =>
  cn(
    'group relative flex min-h-9 items-center gap-3 rounded-md px-2 py-1.5 text-sm',
    props.row.active && 'font-medium',
    props.row.url && 'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
  ),
)
const width = computed(() => `${Math.max(0, Math.min(1, props.row.bar)) * 100}%`)
</script>

<template>
  <component
    :is="row.url ? Link : 'div'"
    v-bind="row.url ? { href: row.url, preserveScroll: true } : {}"
    data-slot="analytics-row"
    :aria-current="row.active && row.url ? 'true' : undefined"
    :class="rowClass"
  >
    <span
      aria-hidden="true"
      :class="
        cn(
          'pointer-events-none absolute inset-y-0 start-0 rounded-md transition-colors',
          row.active ? 'bg-primary/20' : 'bg-primary/10 group-hover:bg-primary/15',
        )
      "
      :style="{ width }"
    />
    <span class="relative flex min-w-0 flex-1 items-center gap-2">
      <span v-if="row.flag" aria-hidden="true">{{ row.flag }}</span>
      <span v-if="linkLabel" class="sr-only">{{ linkLabel }}</span>
      <span class="truncate" :title="row.label" :aria-hidden="linkLabel ? 'true' : undefined">{{
        row.label
      }}</span>
      <Icon v-if="row.active" name="x" class="text-muted-foreground size-3.5 shrink-0" />
    </span>
    <span class="relative flex w-16 flex-col items-end tabular-nums">
      <span class="sr-only">{{ columns[1] }}: </span>
      <span class="font-medium">{{ row.display[0] }}</span>
      <span
        v-if="row.changeDisplay"
        :class="
          cn(
            'text-[11px] leading-none',
            changeColor ? textColorClasses[changeColor] : 'text-muted-foreground',
          )
        "
      >
        {{ row.changeDisplay }}
      </span>
    </span>
    <span class="text-muted-foreground relative hidden w-20 text-end tabular-nums sm:block">
      <span class="sr-only">{{ columns[2] }}: </span>
      {{ row.display[1] }}
    </span>
  </component>
</template>
