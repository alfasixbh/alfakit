<script setup lang="ts">
import type { CmsBlockSchema, CmsSectionBlockData } from '@alfakit/core'
import CmsBlocks from './CmsBlocks.vue'

/** A reusable section: its blocks, at full page width. */
const props = defineProps<{
  block: CmsBlockSchema<CmsSectionBlockData>
  data: CmsSectionBlockData
}>()
</script>

<template>
  <div data-slot="cms-section" :data-section="props.data.name">
    <CmsBlocks :blocks="props.data.blocks" />
  </div>
</template>
