<script setup lang="ts">
import { cmsGridClass, type CmsBlockSchema, type CmsGalleryBlockData } from '@alfakit/core'
import CmsBlockHeading from './CmsBlockHeading.vue'
import CmsImage from './CmsImage.vue'
import { useSectionClass } from './context'

const props = defineProps<{
  block: CmsBlockSchema<CmsGalleryBlockData>
  data: CmsGalleryBlockData
}>()

const sectionClass = useSectionClass()
</script>

<template>
  <section data-slot="cms-gallery" :class="sectionClass">
    <div class="mx-auto max-w-6xl">
      <CmsBlockHeading :heading="props.data.heading" />
      <ul :class="cmsGridClass(props.data.columns)" role="list">
        <li v-for="(image, index) in props.data.images" :key="`${image.url}-${index}`">
          <figure class="flex flex-col gap-2">
            <CmsImage :image="image" class="aspect-[4/3] w-full rounded-xl object-cover" />
            <figcaption v-if="image.caption" class="text-muted-foreground text-sm">
              {{ image.caption }}
            </figcaption>
          </figure>
        </li>
      </ul>
    </div>
  </section>
</template>
