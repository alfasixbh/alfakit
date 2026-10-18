<script setup lang="ts">
import { cmsColumnsClass, type CmsBlockSchema, type CmsColumnsBlockData } from '@alfakit/core'
import { provide } from 'vue'
import { cn } from '../../lib/utils'
import CmsBlocks from './CmsBlocks.vue'
import { CMS_NESTED_KEY, useSectionClass } from './context'

const props = defineProps<{
  block: CmsBlockSchema<CmsColumnsBlockData>
  data: CmsColumnsBlockData
}>()

const sectionClass = useSectionClass('py-8 sm:py-10')

// Blocks inside the columns drop the page padding (the columns block has it).
provide(CMS_NESTED_KEY, true)
</script>

<template>
  <section data-slot="cms-columns" :class="sectionClass">
    <div
      :class="
        cn(
          'mx-auto max-w-6xl',
          cmsColumnsClass(props.data.columns.length),
          props.data.align === 'center' && 'items-center',
        )
      "
    >
      <div
        v-for="(column, index) in props.data.columns"
        :key="index"
        class="min-w-0"
        data-slot="cms-column"
      >
        <CmsBlocks :blocks="column.blocks" />
      </div>
    </div>
  </section>
</template>
