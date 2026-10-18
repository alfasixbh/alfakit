<script setup lang="ts">
import { XIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
  type DialogContentEmits,
  type DialogContentProps,
} from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useT } from '../../context'

const props = withDefaults(
  defineProps<
    DialogContentProps & {
      class?: HTMLAttributes['class']
      side?: 'top' | 'right' | 'bottom' | 'left'
      showCloseButton?: boolean
    }
  >(),
  { side: 'right', showCloseButton: true },
)
// The root is the portal, so extra attributes (data-slot, role, data-*) would be lost:
// forward them to the content element like the React and Svelte wrappers. `class` is a prop
// and is merged below, never replaced.
defineOptions({ inheritAttrs: false })

const emits = defineEmits<DialogContentEmits>()
const forwarded = useForwardPropsEmits(
  reactiveOmit(props, 'class', 'side', 'showCloseButton'),
  emits,
)
const t = useT()
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      data-slot="sheet-overlay"
      class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
    />
    <DialogContent
      data-slot="sheet-content"
      v-bind="{ ...forwarded, ...$attrs }"
      :class="
        cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
          props.side === 'right' &&
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
          props.side === 'left' &&
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
          props.side === 'top' &&
            'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
          props.side === 'bottom' &&
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
          props.class,
        )
      "
    >
      <slot />
      <DialogClose
        v-if="props.showCloseButton"
        class="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute end-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
      >
        <Icon name="alfakit::support.modal.close-button" :fallback="XIcon" class="size-4" />
        <span class="sr-only">{{ t('close', {}, 'Close') }}</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
