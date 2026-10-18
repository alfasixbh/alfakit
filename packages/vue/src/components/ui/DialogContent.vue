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
    DialogContentProps & { class?: HTMLAttributes['class']; showCloseButton?: boolean }
  >(),
  { showCloseButton: true },
)
// The root is the portal, so extra attributes (data-slot, role, data-*) would be lost:
// forward them to the content element like the React and Svelte wrappers. `class` is a prop
// and is merged below, never replaced.
defineOptions({ inheritAttrs: false })

const emits = defineEmits<DialogContentEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class', 'showCloseButton'), emits)
const t = useT()
</script>

<template>
  <DialogPortal data-slot="dialog-portal">
    <DialogOverlay
      data-slot="dialog-overlay"
      class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
    />
    <DialogContent
      data-slot="dialog-content"
      v-bind="{ ...forwarded, ...$attrs }"
      :class="
        cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
          props.class,
        )
      "
    >
      <slot />
      <DialogClose
        v-if="props.showCloseButton"
        data-slot="dialog-close"
        class="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute end-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
      >
        <Icon name="alfakit::support.modal.close-button" :fallback="XIcon" />
        <span class="sr-only">{{ t('close', {}, 'Close') }}</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
