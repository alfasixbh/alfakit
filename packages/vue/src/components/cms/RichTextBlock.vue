<script setup lang="ts">
import { cmsWidthClass, type CmsBlockSchema, type CmsRichTextBlockData } from '@alfakit/core'
import { cn } from '../../lib/utils'
import { useSectionClass } from './context'

const props = defineProps<{
  block: CmsBlockSchema<CmsRichTextBlockData>
  data: CmsRichTextBlockData
}>()

const sectionClass = useSectionClass('py-8 sm:py-10')
</script>

<template>
  <section data-slot="cms-rich-text" :class="sectionClass">
    <!-- eslint-disable-next-line vue/no-v-html -- sanitised on the server (Html::sanitize) -->
    <div :class="cn('alfakit-prose', cmsWidthClass(props.data.width))" v-html="props.data.html" />
  </section>
</template>
