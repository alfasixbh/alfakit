<script setup lang="ts">
import type { ImageSchema } from '@alfakit/core'
import { cn } from '../../lib/utils'
import Tooltip from '../ui/Tooltip.vue'
import TooltipContent from '../ui/TooltipContent.vue'
import TooltipTrigger from '../ui/TooltipTrigger.vue'

const ALIGNMENT: Record<string, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
}

const props = defineProps<{ component: ImageSchema }>()
</script>

<template>
  <div
    data-slot="image"
    :class="cn('flex', ALIGNMENT[props.component.alignment ?? 'start'] ?? 'justify-start')"
    v-bind="props.component.extraAttributes"
  >
    <Tooltip v-if="props.component.tooltip">
      <TooltipTrigger as-child>
        <img
          :src="props.component.url"
          :alt="props.component.alt"
          loading="lazy"
          :class="
            cn('max-w-full object-cover', props.component.circular ? 'rounded-full' : 'rounded-md')
          "
          :style="{ width: props.component.imageWidth, height: props.component.imageHeight }"
        />
      </TooltipTrigger>
      <TooltipContent>{{ props.component.tooltip }}</TooltipContent>
    </Tooltip>
    <img
      v-else
      :src="props.component.url"
      :alt="props.component.alt"
      loading="lazy"
      :class="
        cn('max-w-full object-cover', props.component.circular ? 'rounded-full' : 'rounded-md')
      "
      :style="{ width: props.component.imageWidth, height: props.component.imageHeight }"
    />
  </div>
</template>
