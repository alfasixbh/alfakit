<script setup lang="ts">
import { useForwardPropsEmits, type DialogRootEmits, type DialogRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import Command from './Command.vue'
import Dialog from './Dialog.vue'
import DialogContent from './DialogContent.vue'
import DialogDescription from './DialogDescription.vue'
import DialogHeader from './DialogHeader.vue'
import DialogTitle from './DialogTitle.vue'

const props = withDefaults(
  defineProps<
    DialogRootProps & {
      title?: string
      description?: string
      class?: HTMLAttributes['class']
      showCloseButton?: boolean
    }
  >(),
  {
    title: undefined,
    description: undefined,
    showCloseButton: true,
  },
)
const t = useT()
const emits = defineEmits<DialogRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <Dialog
    :open="forwarded.open"
    :default-open="forwarded.defaultOpen"
    :modal="forwarded.modal"
    @update:open="emits('update:open', $event)"
  >
    <DialogContent
      :class="cn('overflow-hidden p-0', props.class)"
      :show-close-button="props.showCloseButton"
    >
      <DialogHeader class="sr-only">
        <DialogTitle>{{ props.title ?? t('command_palette', {}, 'Command palette') }}</DialogTitle>
        <DialogDescription>{{
          props.description ?? t('command_palette_description', {}, 'Search for a command to run…')
        }}</DialogDescription>
      </DialogHeader>
      <Command
        class="[&_[data-slot=command-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group-heading]]:font-medium [&_[data-slot=command-group]]:px-2 [&_[data-slot=command-input-wrapper]_svg]:h-5 [&_[data-slot=command-input-wrapper]_svg]:w-5 [&_[data-slot=command-input]]:h-12 [&_[data-slot=command-item]]:px-2 [&_[data-slot=command-item]]:py-3 [&_[data-slot=command-item]_svg]:h-5 [&_[data-slot=command-item]_svg]:w-5"
      >
        <slot />
      </Command>
    </DialogContent>
  </Dialog>
</template>
