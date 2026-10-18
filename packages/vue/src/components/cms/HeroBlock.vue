<script setup lang="ts">
import type { CmsBlockSchema, CmsHeroBlockData } from '@alfakit/core'
import { computed } from 'vue'
import { cn } from '../../lib/utils'
import CmsImage from './CmsImage.vue'
import CmsLinkButton from './CmsLinkButton.vue'
import { useSectionClass } from './context'

const props = defineProps<{ block: CmsBlockSchema<CmsHeroBlockData>; data: CmsHeroBlockData }>()

const sectionClass = useSectionClass('sm:py-20 lg:py-24')
const centered = computed(() => props.data.alignment === 'center' && !props.data.image)
</script>

<template>
  <section data-slot="cms-hero" :class="sectionClass">
    <div
      :class="
        cn(
          'mx-auto grid max-w-6xl items-center gap-10',
          props.data.image && 'lg:grid-cols-2',
          centered && 'text-center',
        )
      "
    >
      <div :class="cn('flex flex-col gap-5', centered && 'items-center')">
        <p
          v-if="props.data.eyebrow"
          class="text-primary text-sm font-semibold tracking-wide uppercase"
        >
          {{ props.data.eyebrow }}
        </p>
        <h1 class="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {{ props.data.heading }}
        </h1>
        <p
          v-if="props.data.subheading"
          class="text-muted-foreground max-w-2xl text-lg text-pretty sm:text-xl"
        >
          {{ props.data.subheading }}
        </p>
        <div
          v-if="props.data.primaryAction || props.data.secondaryAction"
          :class="cn('flex flex-wrap gap-3 pt-2', centered && 'justify-center')"
        >
          <CmsLinkButton :link="props.data.primaryAction" />
          <CmsLinkButton :link="props.data.secondaryAction" variant="outline" />
        </div>
      </div>
      <CmsImage
        v-if="props.data.image"
        :image="props.data.image"
        eager
        class="w-full rounded-2xl object-cover shadow-sm"
        sizes="(min-width: 1024px) 50vw, 100vw"
      />
    </div>
  </section>
</template>
