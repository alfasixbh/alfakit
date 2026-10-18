<script setup lang="ts">
import { PanelLeftIcon } from '@lucide/vue'
import type { HTMLAttributes } from 'vue'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Button from './Button.vue'
import { useSidebar } from './use-sidebar'
import { useT } from '../../context'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const { toggleSidebar } = useSidebar()
const t = useT()
</script>

<template>
  <Button
    data-sidebar="trigger"
    data-slot="sidebar-trigger"
    variant="ghost"
    size="icon"
    :class="cn('size-7', props.class)"
    @click="toggleSidebar"
  >
    <Icon name="alfakit::panels.sidebar.toggle-button" :fallback="PanelLeftIcon" />
    <span class="sr-only">{{ t('toggle_sidebar', {}, 'Toggle sidebar') }}</span>
  </Button>
</template>
