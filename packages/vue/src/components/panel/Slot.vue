<script setup lang="ts">
import { slotItems } from '@alfakit/core'
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { usePanel } from '../../context'
import { cn } from '../../lib/utils'
import RenderComponent from '../schema/RenderComponent.vue'

/**
 * Renders content added with `Panel::slot('name', …)` or `Slots::register()` on the
 * server: HTML or schema components (`Text`, `Html`, `View`, …). Renders nothing when the
 * slot is empty. `scope` is the component key (`relationManager:<class>`, `widget:<id>`)
 * of the table, relation manager or widget the slot belongs to. `data` is what this render
 * is about (a header cell's column, a modal's action): items registered with
 * `when: ['column' => 'title']` only render where it matches.
 */
const props = defineProps<{
  name: string
  scope?: string | null
  data?: Record<string, unknown> | null
  class?: HTMLAttributes['class']
}>()
const panel = usePanel()
const items = computed(() => slotItems(panel.value?.slots, props.name, props.scope, props.data))
</script>

<template>
  <div v-if="items.length > 0" :data-slot-name="props.name" :class="cn('contents', props.class)">
    <template v-for="(item, index) in items" :key="index">
      <div v-if="item.type === 'html'" class="contents" v-html="item.html" />
      <RenderComponent v-else :component="item.component" />
    </template>
  </div>
</template>
