<script setup lang="ts">
import type { RichEditorSchema } from '@alfakit/core'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Skeleton from '../ui/Skeleton.vue'

const props = defineProps<{ component: RichEditorSchema }>()
const { error, id } = useField<string | null>(() => props.component)
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <Skeleton class="h-40 w-full" aria-hidden="true" />
  </FieldWrapper>
</template>
