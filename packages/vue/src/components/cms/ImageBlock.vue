<script setup lang="ts">
import { cmsWidthClass, type CmsBlockSchema, type CmsImageBlockData } from '@alfakit/core'
import { inject } from 'vue'
import { cn } from '../../lib/utils'
import CmsImage from './CmsImage.vue'
import { CMS_NESTED_KEY, useSectionClass } from './context'

const props = defineProps<{ block: CmsBlockSchema<CmsImageBlockData>; data: CmsImageBlockData }>()

const nested = inject(CMS_NESTED_KEY, false)
const sectionClass = useSectionClass('py-8 sm:py-10')
</script>

<template>
  <section
    data-slot="cms-image-block"
    :class="props.data.width === 'full' && !nested ? 'py-8' : sectionClass"
  >
    <figure :class="cn(cmsWidthClass(props.data.width), 'flex flex-col gap-3')">
      <CmsImage
        :image="props.data.image"
        :class="cn('w-full object-cover', props.data.width !== 'full' && 'rounded-xl')"
      />
      <figcaption v-if="props.data.caption" class="text-muted-foreground text-center text-sm">
        {{ props.data.caption }}
      </figcaption>
    </figure>
  </section>
</template>
