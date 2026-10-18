<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import type { HTMLAttributes } from 'vue'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <li
    data-slot="breadcrumb-separator"
    role="presentation"
    aria-hidden="true"
    :class="cn('[&>svg]:size-3.5', props.class)"
  >
    <slot>
      <Icon
        name="alfakit::support.breadcrumbs.separator"
        :fallback="ChevronRight"
        class="rtl:rotate-180"
      />
    </slot>
  </li>
</template>
