<script setup lang="ts">
import { cmsAspectClass, type CmsBlockSchema, type CmsEmbedBlockData } from '@alfakit/core'
import { cn } from '../../lib/utils'
import { useSectionClass } from './context'

const props = defineProps<{ block: CmsBlockSchema<CmsEmbedBlockData>; data: CmsEmbedBlockData }>()

const sectionClass = useSectionClass('py-8 sm:py-10')
</script>

<template>
  <section data-slot="cms-embed" :class="sectionClass">
    <figure class="mx-auto flex max-w-4xl flex-col gap-3">
      <div
        :class="cn('bg-muted overflow-hidden rounded-xl', cmsAspectClass(props.data.aspectRatio))"
      >
        <video
          v-if="props.data.embed.provider === 'video'"
          :src="props.data.embed.src"
          controls
          preload="metadata"
          class="size-full"
          :title="props.data.embed.title"
        />
        <iframe
          v-else
          :src="props.data.embed.src"
          :title="props.data.embed.title"
          loading="lazy"
          class="size-full border-0"
          allow="
            accelerometer;
            autoplay;
            clipboard-write;
            encrypted-media;
            gyroscope;
            picture-in-picture;
            fullscreen;
          "
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
          :sandbox="
            props.data.embed.provider === 'iframe'
              ? 'allow-scripts allow-same-origin allow-popups allow-forms'
              : undefined
          "
        />
      </div>
      <figcaption v-if="props.data.caption" class="text-muted-foreground text-center text-sm">
        {{ props.data.caption }}
      </figcaption>
    </figure>
  </section>
</template>
