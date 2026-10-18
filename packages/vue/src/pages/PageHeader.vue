<script setup lang="ts">
import type { PageSchema } from '@alfakit/core'
import { computed } from 'vue'
import ActionList from '../components/actions/ActionList.vue'
import Slot from '../components/panel/Slot.vue'
import RecordPresence from '../components/realtime/RecordPresence.vue'
import { useRegistry } from '../context'
import { cn } from '../lib/utils'

const props = defineProps<{ page: PageSchema }>()
const registry = useRegistry()
// Record pages with `Panel::realtime()`: who else is on the record.
const Presence = computed(() => registry.resolve('page:presence') ?? RecordPresence)
const actions = computed(() => props.page.headerActions ?? [])
// `$headerActionsAlignment`: the default (end) sits beside the heading; the others stack
// the actions under it.
const alignment = computed(() => props.page.headerActionsAlignment)
const alignmentClass = computed(() => {
  switch (alignment.value) {
    case 'start':
      return 'justify-start'
    case 'center':
      return 'justify-center'
    case 'between':
    case 'justify':
      return 'justify-between'
    default:
      return 'justify-end'
  }
})
</script>

<template>
  <Slot name="page.header.before" />
  <header
    data-slot="page-header"
    :data-actions-alignment="alignment"
    :class="
      cn('flex flex-col gap-4', !alignment && 'sm:flex-row sm:items-start sm:justify-between')
    "
  >
    <div class="min-w-0">
      <Slot name="page.heading.before" />
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ props.page.heading ?? props.page.title }}
      </h1>
      <p v-if="props.page.subheading" class="text-muted-foreground mt-1 text-sm">
        {{ props.page.subheading }}
      </p>
      <Slot name="page.heading.after" />
    </div>
    <div :class="cn('flex shrink-0 flex-wrap items-center gap-2', alignmentClass)">
      <component :is="Presence" v-if="props.page.presence" :presence="props.page.presence" />
      <Slot name="page.actions.before" />
      <ActionList
        v-if="actions.length > 0"
        :actions="actions"
        :context="{ token: props.page.token, component: 'page' }"
        align="end"
        class="max-w-full shrink-0"
      />
      <Slot name="page.actions.after" />
    </div>
  </header>
  <Slot name="page.header.after" />
</template>
