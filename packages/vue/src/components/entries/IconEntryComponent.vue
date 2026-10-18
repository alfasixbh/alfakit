<script setup lang="ts">
import type { IconEntrySchema } from '@alfakit/core'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import EntryLink from './EntryLink.vue'
import EntryPlaceholder from './EntryPlaceholder.vue'
import EntryWrapper from './EntryWrapper.vue'

const ICON_SIZES: Record<string, string> = {
  xs: 'size-3',
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
  xl: 'size-8',
  '2xl': 'size-10',
}

const props = defineProps<{ component: IconEntrySchema }>()
</script>

<template>
  <EntryWrapper :entry="props.component">
    <EntryLink v-if="props.component.icon" :entry="props.component">
      <Icon
        :name="props.component.icon"
        :class="
          cn(
            ICON_SIZES[props.component.size ?? 'md'],
            props.component.color && textColorClasses[props.component.color],
          )
        "
      />
    </EntryLink>
    <EntryPlaceholder v-else :entry="props.component" />
  </EntryWrapper>
</template>
