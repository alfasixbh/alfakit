<script setup lang="ts">
import type { ImageEntrySchema } from '@alfakit/core'
import { remainingTextSizeClass, stackedImageStyle, usesDefaultImageStack } from '@alfakit/core'
import { computed } from 'vue'
import { cn } from '../../lib/utils'
import EntryLink from './EntryLink.vue'
import EntryPlaceholder from './EntryPlaceholder.vue'
import EntryWrapper from './EntryWrapper.vue'

const props = defineProps<{ component: ImageEntrySchema }>()
const urls = computed(() => props.component.state ?? [])
const limit = computed(() => props.component.limit ?? urls.value.length)
const size = computed(() => props.component.size ?? 40)
const toCss = (value: number | string | undefined) =>
  typeof value === 'number' ? `${value}px` : value
const style = computed(() => ({
  height: toCss(props.component.height ?? size.value),
  width: toCss(
    props.component.width ??
      (props.component.square || props.component.circular ? size.value : undefined),
  ),
}))
const defaultImageStack = computed(() => usesDefaultImageStack(props.component))
</script>

<template>
  <EntryWrapper :entry="props.component">
    <EntryPlaceholder v-if="urls.length === 0" :entry="props.component" />
    <EntryLink v-else :entry="props.component">
      <div
        :class="
          cn(
            'flex items-center',
            props.component.stacked ? defaultImageStack && '-space-x-2' : 'gap-2',
          )
        "
      >
        <img
          v-for="(url, index) in urls.slice(0, limit)"
          :key="index"
          :src="url"
          :alt="props.component.alts?.[index] ?? props.component.alt ?? ''"
          :style="[style, stackedImageStyle(index, props.component)]"
          :class="
            cn(
              'object-cover',
              props.component.circular ? 'rounded-full' : 'rounded-md',
              props.component.stacked && defaultImageStack && 'ring-background ring-2',
            )
          "
          v-bind="props.component.extraImgAttributes"
        />
        <span
          v-if="props.component.limitedRemainingText !== false && urls.length > limit"
          data-slot="image-remaining"
          :class="
            cn(
              'text-muted-foreground',
              remainingTextSizeClass(props.component.limitedRemainingTextSize),
            )
          "
          >+{{ urls.length - limit }}</span
        >
      </div>
    </EntryLink>
  </EntryWrapper>
</template>
