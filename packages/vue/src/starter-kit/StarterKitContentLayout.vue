<script setup lang="ts">
import type { BreadcrumbSchema, PageSchema, Width } from '@alfakit/core'
import { computed } from 'vue'
import Slot from '../components/panel/Slot.vue'
import { useAlfakitProps } from '../context'
import { MAX_WIDTHS } from '../layouts/max-widths'
import { cn } from '../lib/utils'

/**
 * The content area of an Alfakit page inside the host layout: what `layout:app` renders in
 * starter kit mode instead of Alfakit's sidebar and top bar. Replace it with
 * `createStarterKitPage({ components: { 'layout:app': MyContent } })`.
 */
const props = defineProps<{
  breadcrumbs?: BreadcrumbSchema[]
  maxContentWidth?: Width | string
  page?: PageSchema
}>()
const pageProps = useAlfakitProps()
// The host's pages fill the content area, so starter kit pages default to the full width.
const width = computed(
  () => props.maxContentWidth ?? pageProps.value.alfakit.maxContentWidth ?? 'full',
)
</script>

<template>
  <div
    data-slot="content"
    data-alfakit-embedded=""
    :class="
      cn(
        'mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 p-4 md:p-6',
        MAX_WIDTHS[width] ?? 'max-w-full',
      )
    "
  >
    <Slot name="content.start" />
    <slot />
    <Slot name="content.end" />
  </div>
</template>
