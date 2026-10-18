<script setup lang="ts">
import type { FieldSchema } from '@alfakit/core'
import { computed } from 'vue'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Skeleton from '../ui/Skeleton.vue'

/**
 * What the server renders and hydration show for a field whose code loads the first time
 * one is shown in the browser: its label and a placeholder.
 */
const props = defineProps<{ component: object; height?: string }>()
// Every lazily loaded field schema carries the base field keys.
const field = computed(() => props.component as FieldSchema)
const { error, id } = useField<unknown>(() => field.value)
</script>

<template>
  <FieldWrapper :field="field" :html-for="id" :error="error">
    <Skeleton aria-busy="true" data-slot="field-placeholder" :class="props.height ?? 'h-9'" />
  </FieldWrapper>
</template>
