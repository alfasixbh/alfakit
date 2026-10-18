<script setup lang="ts">
import type { HiddenSchema } from '@alfakit/core'
import { useField } from '../form/form-context'

const props = defineProps<{ component: HiddenSchema }>()
const { value, id } = useField<string | number | null>(() => props.component)
</script>

<template>
  <input :id="id" type="hidden" :name="props.component.name" :value="value ?? ''" readonly />
</template>
