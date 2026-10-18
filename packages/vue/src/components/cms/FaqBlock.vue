<script setup lang="ts">
import type { CmsBlockSchema, CmsFaqBlockData } from '@alfakit/core'
import { ChevronDownIcon } from '@lucide/vue'
import CmsBlockHeading from './CmsBlockHeading.vue'
import { useSectionClass } from './context'

const props = defineProps<{ block: CmsBlockSchema<CmsFaqBlockData>; data: CmsFaqBlockData }>()

const sectionClass = useSectionClass()
</script>

<template>
  <section data-slot="cms-faq" :class="sectionClass">
    <div class="mx-auto max-w-3xl">
      <CmsBlockHeading :heading="props.data.heading" />
      <div class="divide-y rounded-xl border">
        <details
          v-for="(item, index) in props.data.items"
          :key="`${props.block.id}-${index}`"
          class="group px-5"
          data-slot="cms-faq-item"
        >
          <summary
            class="focus-visible:ring-ring/50 flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 text-start font-medium outline-none focus-visible:ring-[3px] [&::-webkit-details-marker]:hidden"
          >
            {{ item.question }}
            <ChevronDownIcon
              class="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <p class="text-muted-foreground pb-5 whitespace-pre-line">{{ item.answer }}</p>
        </details>
      </div>
    </div>
  </section>
</template>
