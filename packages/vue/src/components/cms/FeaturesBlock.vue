<script setup lang="ts">
import { cmsGridClass, type CmsBlockSchema, type CmsFeaturesBlockData } from '@alfakit/core'
import Icon from '../../lib/Icon.vue'
import CmsBlockHeading from './CmsBlockHeading.vue'
import { useSectionClass } from './context'

const props = defineProps<{
  block: CmsBlockSchema<CmsFeaturesBlockData>
  data: CmsFeaturesBlockData
}>()

const sectionClass = useSectionClass()
</script>

<template>
  <section data-slot="cms-features" :class="sectionClass">
    <div class="mx-auto max-w-6xl">
      <CmsBlockHeading :heading="props.data.heading" :intro="props.data.intro" />
      <ul :class="cmsGridClass(props.data.columns)" role="list">
        <li
          v-for="(item, index) in props.data.items"
          :key="`${item.title}-${index}`"
          class="bg-card flex flex-col gap-3 rounded-xl border p-6"
        >
          <component
            :is="item.url ? 'a' : 'div'"
            :href="item.url ?? undefined"
            class="focus-visible:ring-ring/50 flex flex-col gap-3 rounded-md outline-none focus-visible:ring-[3px]"
          >
            <span
              v-if="item.icon"
              class="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg"
            >
              <Icon :name="item.icon" class="size-5" aria-hidden="true" />
            </span>
            <h3 class="text-lg font-semibold">{{ item.title }}</h3>
            <p v-if="item.description" class="text-muted-foreground text-pretty">
              {{ item.description }}
            </p>
          </component>
        </li>
      </ul>
    </div>
  </section>
</template>
