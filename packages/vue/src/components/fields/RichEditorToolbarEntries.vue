<script setup lang="ts">
import type { RichEditorPanel, RichEditorSchema, ToolbarCommand } from '@alfakit/core'
import { commandLabel, isToolbarGroup, toolbarPanel } from '@alfakit/core'
import type { Editor } from '@tiptap/vue-3'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import Button from '../ui/Button.vue'
import Separator from '../ui/Separator.vue'
import RichEditorExtensionButton from './RichEditorExtensionButton.vue'
import RichEditorToolbarGroup from './RichEditorToolbarGroup.vue'
import RichEditorToolIcon from './RichEditorToolIcon.vue'

/** Toolbar entries: separators, group dropdowns, panel toggles and buttons. */
const props = defineProps<{
  names: readonly string[]
  component: RichEditorSchema
  editor: Editor
  editable: boolean
  commands: Record<string, ToolbarCommand>
  /** Bumped on every transaction so active states follow the cursor. */
  tick: number
  openPanel: 'textColor' | null
  sidePanel: RichEditorPanel | null
}>()
const emit = defineEmits<{ run: [name: string]; togglePanel: [panel: RichEditorPanel] }>()
const t = useT()
const translate = (key: string, fallback: string) => t(key, {}, fallback)

/** Label, active and pressed state of a button (re-read on every transaction). */
const buttonState = (name: string) => {
  void props.tick

  const button = props.commands[name]

  if (!button) return null

  const active = Boolean(
    button.active?.(props.editor) || (name === 'textColor' && props.openPanel === name),
  )

  return {
    label: commandLabel(name, props.commands, translate),
    active,
    // Only toggles carry `aria-pressed`.
    pressed: button.active || name === 'textColor' ? (active ? 'true' : 'false') : undefined,
  }
}
</script>

<template>
  <template v-for="(name, index) in props.names" :key="`${name}-${index}`">
    <Separator v-if="name === '|'" orientation="vertical" class="mx-1 h-5" />
    <template v-else-if="isToolbarGroup(name)">
      <RichEditorToolbarGroup
        v-if="props.component.toolbarButtonGroups?.[name]"
        :group="props.component.toolbarButtonGroups[name]!"
        :editor="props.editor"
        :editable="props.editable"
        :commands="props.commands"
        :tools="props.component.editorTools"
        :tick="props.tick"
        @run="(button: string) => emit('run', button)"
      />
    </template>
    <RichEditorExtensionButton
      v-else-if="toolbarPanel(name)"
      :name="toolbarPanel(name)!"
      :component="props.component"
      :editable="props.editable"
      :open="props.sidePanel === toolbarPanel(name)"
      @toggle="emit('togglePanel', toolbarPanel(name)!)"
    />
    <Button
      v-else-if="buttonState(name)"
      type="button"
      variant="ghost"
      size="icon-sm"
      :aria-label="buttonState(name)!.label"
      :title="buttonState(name)!.label"
      :aria-pressed="buttonState(name)!.pressed"
      :disabled="!props.editable"
      :class="cn(buttonState(name)!.active && 'bg-accent text-accent-foreground')"
      @mousedown.prevent
      @click="emit('run', name)"
    >
      <RichEditorToolIcon
        :name="name"
        :label="buttonState(name)!.label"
        :tools="props.component.editorTools"
      />
    </Button>
  </template>
</template>
