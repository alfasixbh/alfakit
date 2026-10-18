<script setup lang="ts">
import { initials, tenantNameText, type StarterKitWidgets } from '@alfakit/core'
import { ChevronsUpDownIcon } from '@lucide/vue'
import { computed } from 'vue'

/** The current tenant (or an empty avatar) until the switcher has loaded: a placeholder. */
const props = defineProps<{ source: StarterKitWidgets }>()

const current = computed(() => props.source.widgets.tenancy?.current)
</script>

<template>
  <button
    type="button"
    data-slot="tenant-menu"
    aria-hidden="true"
    tabindex="-1"
    class="hover:bg-accent inline-flex h-9 max-w-60 shrink-0 items-center gap-2 rounded-md px-2 text-sm font-medium"
  >
    <span class="bg-muted flex size-6 items-center justify-center rounded-md text-[10px]">{{
      current ? initials(tenantNameText(current)) : ''
    }}</span>
    <span v-if="current" class="sr-only min-w-0 truncate lg:not-sr-only">{{
      tenantNameText(current)
    }}</span>
    <ChevronsUpDownIcon class="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
  </button>
</template>
