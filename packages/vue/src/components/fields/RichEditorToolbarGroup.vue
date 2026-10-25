<script setup lang="ts">
import type {
  RichEditorToolbarGroupSchema,
  RichEditorToolSchema,
  ToolbarCommand,
} from '@alfakit/core'
import { commandLabel, groupTriggerButton } from '@alfakit/core'
import { ChevronDownIcon } from '@lucide/vue'
import type { Editor } from '@tiptap/vue-3'
import { computed } from 'vue'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Button from '../ui/Button.vue'
import DropdownMenu from '../ui/DropdownMenu.vue'
import DropdownMenuContent from '../ui/DropdownMenuContent.vue'
import DropdownMenuItem from '../ui/DropdownMenuItem.vue'
import DropdownMenuTrigger from '../ui/DropdownMenuTrigger.vue'
import RichEditorToolIcon from './RichEditorToolIcon.vue'

/** A `ToolbarButtonGroup`: a dropdown of buttons (icons, or labels with `textualButtons()`). */
const props = defineProps<{
  group: RichEditorToolbarGroupSchema
  editor: Editor
  editable: boolean
  commands: Record<string, ToolbarCommand>
  tools?: RichEditorToolSchema[] | null
  /** Bumped on every transaction so active states follow the cursor. */
  tick: number
}>()
const emit = defineEmits<{ run: [name: string] }>()
const t = useT()
const translate = (key: string, fallback: string) => t(key, {}, fallback)

const buttons = computed(() => props.group.buttons.filter((name) => props.commands[name]))
const trigger = computed(() => {
  void props.tick

  return groupTriggerButton(buttons.value, props.editor, props.commands)
})
const active = computed(() => {
  void props.tick

  return buttons.value.some((name) => props.commands[name]?.active?.(props.editor))
})
const label = (name: string) => commandLabel(name, props.commands, translate)
// After a pick, typing goes on in the editor (the command focused it); the menu would
// otherwise return focus to its trigger. Closing without a pick (Escape) still does.
let picked = false
const pick = (name: string) => {
  picked = true
  emit('run', name)
}
const closeAutoFocus = (event: Event) => {
  if (!picked) return

  picked = false
  event.preventDefault()
  props.editor.commands.focus()
}
const pressed = (name: string) => {
  void props.tick

  return Boolean(props.commands[name]?.active?.(props.editor))
}
</script>

<template>
  <DropdownMenu v-if="buttons.length > 0">
    <DropdownMenuTrigger as-child>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        :aria-label="props.group.label"
        :title="props.group.label"
        :disabled="!props.editable"
        :class="cn('h-8 gap-0.5 px-1.5', active && 'bg-accent text-accent-foreground')"
        @mousedown.prevent
      >
        <Icon v-if="props.group.icon" :name="props.group.icon" />
        <RichEditorToolIcon
          v-else-if="trigger"
          :name="trigger"
          :label="label(trigger)"
          :tools="props.tools"
        />
        <template v-else>{{ props.group.label }}</template>
        <ChevronDownIcon class="size-3 opacity-60" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="start"
      :aria-label="props.group.label"
      :class="cn(!props.group.textual && 'flex min-w-0 flex-row gap-0.5')"
      @close-auto-focus="closeAutoFocus"
    >
      <DropdownMenuItem
        v-for="name in buttons"
        :key="name"
        :aria-label="props.group.textual ? undefined : label(name)"
        :title="label(name)"
        :class="cn(pressed(name) && 'bg-accent text-accent-foreground')"
        @select="pick(name)"
      >
        <RichEditorToolIcon :name="name" :label="label(name)" :tools="props.tools" />
        <span v-if="props.group.textual">{{ label(name) }}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
