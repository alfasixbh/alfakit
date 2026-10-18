<script setup lang="ts">
import type { BaseField, SchemaComponent } from '@alfakit/core'
import {
  columnOrderClasses,
  columnSpanClasses,
  columnStartClasses,
  containerColumnSpanClasses,
} from '@alfakit/core'
import { computed } from 'vue'
import { useRegistry } from '../../context'
import { cn } from '../../lib/utils'
import TranslatableField from './TranslatableField.vue'

const props = defineProps<{ component: SchemaComponent }>()
const registry = useRegistry()

const type = computed(() =>
  props.component.type === 'View'
    ? ((props.component as { component?: string }).component ?? 'View')
    : props.component.type,
)
const resolved = computed(
  () =>
    registry.resolve(type.value) ??
    (props.component.type === 'View' ? registry.resolve('View') : undefined),
)
const translatable = computed(() =>
  Boolean((props.component as Partial<BaseField>).translatable?.locales?.length),
)
const span = computed(() =>
  cn(
    columnSpanClasses(props.component.columnSpan),
    containerColumnSpanClasses(props.component.columnSpan),
    columnStartClasses(props.component.columnStart),
    columnOrderClasses(props.component.columnOrder),
  ),
)
// Registered `View` components get the PHP `props` spread, as the docs describe.
const viewProps = computed(() =>
  props.component.type === 'View'
    ? ((props.component as { props?: Record<string, unknown> }).props ?? {})
    : {},
)
</script>

<template>
  <div
    v-if="!resolved"
    :class="
      cn('border-destructive/40 text-destructive rounded-md border border-dashed p-3 text-xs', span)
    "
  >
    Unknown component type <code class="font-mono">{{ type }}</code
    >. Register it with <code class="font-mono">createAlfakit({ components })</code>.
  </div>
  <div
    v-else
    data-slot="schema-item"
    :data-type="props.component.type"
    :class="cn('min-w-0', span || undefined)"
  >
    <TranslatableField
      v-if="translatable"
      :component="props.component as BaseField"
      :render="resolved"
    />
    <component :is="resolved" v-else v-bind="viewProps" :component="props.component" />
  </div>
</template>
