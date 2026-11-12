<script setup lang="ts">
import type { FormBlock as FormBlockSchema } from '@alfakit/core'
import { formIdentity } from '@alfakit/core'
import { computed } from 'vue'
import { usePageSchema } from '../../context'
import FormBlockInner from './FormBlockInner.vue'

const props = defineProps<{ block: FormBlockSchema }>()
const page = usePageSchema()

// The store survives reloads of the same form (table sorting/paging, polling,
// relation-manager actions all deliver a new `block` object); only a different form
// identity remounts it and starts from server state again: its failed uploads, in-flight
// requests and wizard progress belong to the form it left.
const identity = computed(() => formIdentity(page.value, props.block))
</script>

<template>
  <FormBlockInner :key="identity" :block="props.block" />
</template>
