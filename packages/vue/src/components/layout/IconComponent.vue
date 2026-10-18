<script setup lang="ts">
import type { IconSchema } from '@alfakit/core'
import { iconSizeClasses, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Tooltip from '../ui/Tooltip.vue'
import TooltipContent from '../ui/TooltipContent.vue'
import TooltipTrigger from '../ui/TooltipTrigger.vue'

const props = defineProps<{ component: IconSchema }>()
</script>

<template>
  <Tooltip v-if="props.component.tooltip">
    <TooltipTrigger as-child>
      <span
        data-slot="icon"
        class="inline-flex"
        role="img"
        :aria-label="props.component.tooltip"
        v-bind="props.component.extraAttributes"
      >
        <Icon
          :name="props.component.icon"
          aria-hidden="true"
          :class="
            cn(
              iconSizeClasses[props.component.size ?? 'md'] ?? 'size-5',
              props.component.color && textColorClasses[props.component.color],
            )
          "
        />
      </span>
    </TooltipTrigger>
    <TooltipContent>{{ props.component.tooltip }}</TooltipContent>
  </Tooltip>
  <span v-else data-slot="icon" class="inline-flex" v-bind="props.component.extraAttributes">
    <Icon
      :name="props.component.icon"
      aria-hidden="true"
      :class="
        cn(
          iconSizeClasses[props.component.size ?? 'md'] ?? 'size-5',
          props.component.color && textColorClasses[props.component.color],
        )
      "
    />
  </span>
</template>
