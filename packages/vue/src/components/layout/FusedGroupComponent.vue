<script setup lang="ts">
import type { FusedGroupSchema } from '@alfakit/core'
import { collectFieldStatePaths, gridColumnsClasses } from '@alfakit/core'
import { computed, shallowRef, useId } from 'vue'
import { useStore } from '../../composables/use-store'
import { cn } from '../../lib/utils'
import { useOptionalFormStore } from '../form/form-context'
import { provideFusedGroup } from '../schema/fused-group'
import RenderComponent from '../schema/RenderComponent.vue'

/**
 * Fields fused into one control: one border around them (styled by `themes.css`), the
 * group label above, and the fields' validation errors below.
 */
const props = defineProps<{ component: FusedGroupSchema }>()

provideFusedGroup()

const labelId = `${useId()}-label`
const store = useOptionalFormStore()
const state = store ? useStore(store.store) : shallowRef(null)
const paths = computed(() => collectFieldStatePaths(props.component.schema))
const errors = computed(() =>
  state.value
    ? paths.value
        .map((path) => state.value?.errors[path]?.[0])
        .filter((message): message is string => Boolean(message))
    : [],
)
</script>

<template>
  <div
    data-slot="fused-group"
    role="group"
    :aria-labelledby="props.component.label ? labelId : undefined"
    class="flex flex-col gap-1.5"
    v-bind="props.component.extraAttributes"
  >
    <span
      v-if="props.component.label"
      :id="labelId"
      class="text-sm leading-none font-medium select-none"
    >
      {{ props.component.label }}
    </span>
    <div
      data-slot="fused-group-controls"
      :data-invalid="errors.length ? '' : undefined"
      :class="cn('grid', gridColumnsClasses(props.component.columns ?? { default: 1 }))"
    >
      <RenderComponent
        v-for="child in props.component.schema ?? []"
        :key="child.key"
        :component="child"
      />
    </div>
    <!-- The fields announce their own errors; this list is the visible copy. -->
    <div v-if="errors.length" aria-hidden="true" class="flex flex-col gap-0.5">
      <p v-for="(message, index) in errors" :key="index" class="text-destructive text-xs">
        {{ message }}
      </p>
    </div>
  </div>
</template>
