<script setup lang="ts">
import type { CodeEditorSchema } from '@alfakit/core'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'

/** What the server renders and hydration shows: the code, read-only and unhighlighted. */
const props = defineProps<{ component: CodeEditorSchema }>()
const { value, error, id } = useField<string | null>(() => props.component)
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <pre
      dir="ltr"
      data-slot="code-editor"
      aria-busy="true"
      class="border-input dark:bg-input/30 m-0 overflow-auto rounded-md border p-3 font-mono text-sm leading-6 whitespace-pre"
      :style="{
        minHeight: props.component.minHeight ? `${props.component.minHeight}px` : undefined,
        maxHeight: props.component.maxHeight ? `${props.component.maxHeight}px` : undefined,
      }"
      >{{ typeof value === 'string' ? value : '' }}{{ '\n' }}</pre>
  </FieldWrapper>
</template>
