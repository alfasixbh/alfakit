<script setup lang="ts">
import { checkSchemaContract, reportSchemaContractMismatch, type PanelSchema } from '@alfakit/core'
import { computed, watch } from 'vue'
import { useT } from '../../context'

/**
 * Renders its slot only when the page's schema contract (`alfakit.schemaContract`) has the
 * major version this frontend understands; otherwise a translated message replaces the page
 * and the mismatch is logged once, naming both versions.
 */
const props = defineProps<{ panel: PanelSchema | undefined }>()

const t = useT()
const check = computed(() => checkSchemaContract(props.panel?.schemaContract))

watch(check, (value) => reportSchemaContractMismatch(value), { immediate: true })
</script>

<template>
  <slot v-if="check.compatible" />
  <div
    v-else
    role="alert"
    data-slot="schema-contract-mismatch"
    class="bg-background text-foreground mx-auto flex min-h-svh w-full max-w-lg flex-col items-center justify-center gap-2 p-6 text-center"
  >
    <h1 class="text-lg font-semibold">{{ t('schema_contract.title') }}</h1>
    <p class="text-muted-foreground text-sm">
      {{ t('schema_contract.body', { server: check.server ?? '?', client: check.client }) }}
    </p>
  </div>
</template>
