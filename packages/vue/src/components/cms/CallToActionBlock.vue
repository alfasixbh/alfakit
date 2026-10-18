<script setup lang="ts">
import type { CmsBlockSchema, CmsCallToActionBlockData } from '@alfakit/core'
import { computed } from 'vue'
import { cn } from '../../lib/utils'
import CmsLinkButton from './CmsLinkButton.vue'
import { useSectionClass } from './context'

const props = defineProps<{
  block: CmsBlockSchema<CmsCallToActionBlockData>
  data: CmsCallToActionBlockData
}>()

const sectionClass = useSectionClass()
const primary = computed(() => props.data.tone === 'primary')
</script>

<template>
  <section data-slot="cms-call-to-action" :class="sectionClass">
    <div
      :class="
        cn(
          'mx-auto flex max-w-5xl flex-col items-center gap-5 rounded-2xl px-6 py-12 text-center sm:px-12',
          primary && 'bg-primary text-primary-foreground',
          props.data.tone === 'muted' && 'bg-muted',
          props.data.tone === 'default' && 'border',
        )
      "
    >
      <h2 class="text-3xl font-semibold tracking-tight text-balance">{{ props.data.heading }}</h2>
      <p
        v-if="props.data.body"
        :class="
          cn(
            'max-w-2xl text-lg text-pretty',
            primary ? 'text-primary-foreground/85' : 'text-muted-foreground',
          )
        "
      >
        {{ props.data.body }}
      </p>
      <div
        v-if="props.data.primaryAction || props.data.secondaryAction"
        class="flex flex-wrap justify-center gap-3 pt-2"
      >
        <CmsLinkButton
          :link="props.data.primaryAction"
          :variant="primary ? 'secondary' : 'default'"
        />
        <CmsLinkButton
          :link="props.data.secondaryAction"
          variant="outline"
          :class="
            primary
              ? 'text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10 bg-transparent'
              : undefined
          "
        />
      </div>
    </div>
  </section>
</template>
