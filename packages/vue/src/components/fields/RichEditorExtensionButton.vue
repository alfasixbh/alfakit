<script setup lang="ts">
import type { RichEditorPanel, RichEditorSchema } from '@alfakit/core'
import { BlocksIcon, BracesIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import Button from '../ui/Button.vue'

/** The toolbar button that opens the custom blocks or merge tags panel. */
const props = defineProps<{
  name: RichEditorPanel
  component: RichEditorSchema
  editable: boolean
  open: boolean
}>()
const emit = defineEmits<{ toggle: [] }>()
const t = useT()

const count = computed(() =>
  props.name === 'customBlocks'
    ? (props.component.customBlocks ?? []).length
    : (props.component.mergeTags ?? []).length,
)
const label = computed(() =>
  props.name === 'customBlocks'
    ? t('editor.custom_blocks', {}, 'Insert block')
    : t('editor.merge_tags', {}, 'Insert merge tag'),
)
</script>

<template>
  <Button
    v-if="count > 0"
    type="button"
    variant="ghost"
    size="icon-sm"
    :aria-label="label"
    :title="label"
    :aria-pressed="props.open ? 'true' : 'false'"
    :aria-expanded="props.open ? 'true' : 'false'"
    :disabled="!props.editable"
    :class="cn(props.open && 'bg-accent text-accent-foreground')"
    @mousedown.prevent
    @click="emit('toggle')"
  >
    <BlocksIcon v-if="props.name === 'customBlocks'" />
    <BracesIcon v-else />
  </Button>
</template>
