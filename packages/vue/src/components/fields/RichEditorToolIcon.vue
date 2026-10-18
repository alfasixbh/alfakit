<script setup lang="ts">
import type { RichEditorToolSchema } from '@alfakit/core'
import { computed } from 'vue'
import { Icon } from '../../lib/icons'
import { RICH_EDITOR_ICONS } from './rich-editor-icons'

/** A toolbar button's icon: built-in, the plugin tool's icon, else its label. */
const props = defineProps<{
  name: string
  label: string
  tools?: RichEditorToolSchema[] | null
}>()

const builtIn = computed(() => RICH_EDITOR_ICONS[props.name])
const toolIcon = computed(
  () => props.tools?.find((candidate) => candidate.name === props.name)?.icon ?? null,
)
</script>

<template>
  <component :is="builtIn.icon" v-if="builtIn" :class="builtIn.class" />
  <Icon v-else-if="toolIcon" :name="toolIcon" />
  <span v-else class="text-xs">{{ props.label }}</span>
</template>
