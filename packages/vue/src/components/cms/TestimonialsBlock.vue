<script setup lang="ts">
import { cmsGridClass, type CmsBlockSchema, type CmsTestimonialsBlockData } from '@alfakit/core'
import { QuoteIcon } from '@lucide/vue'
import CmsBlockHeading from './CmsBlockHeading.vue'
import CmsImage from './CmsImage.vue'
import { useSectionClass } from './context'

const props = defineProps<{
  block: CmsBlockSchema<CmsTestimonialsBlockData>
  data: CmsTestimonialsBlockData
}>()

const sectionClass = useSectionClass()
</script>

<template>
  <section data-slot="cms-testimonials" :class="sectionClass">
    <div class="mx-auto max-w-6xl">
      <CmsBlockHeading :heading="props.data.heading" />
      <ul :class="cmsGridClass(Math.min(3, props.data.items.length))" role="list">
        <li v-for="(item, index) in props.data.items" :key="`${item.author}-${index}`">
          <figure class="bg-card flex h-full flex-col gap-5 rounded-xl border p-6">
            <QuoteIcon class="text-primary/60 size-6 rtl:-scale-x-100" aria-hidden="true" />
            <blockquote class="flex-1 text-pretty">
              <p>{{ item.quote }}</p>
            </blockquote>
            <figcaption class="flex items-center gap-3">
              <CmsImage
                v-if="item.avatar"
                :image="{ ...item.avatar, alt: '' }"
                class="size-10 rounded-full object-cover"
              />
              <span class="flex flex-col">
                <span class="font-medium">{{ item.author }}</span>
                <span v-if="item.role" class="text-muted-foreground text-sm">{{ item.role }}</span>
              </span>
            </figcaption>
          </figure>
        </li>
      </ul>
    </div>
  </section>
</template>
