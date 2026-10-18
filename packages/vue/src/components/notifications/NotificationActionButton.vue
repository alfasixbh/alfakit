<script setup lang="ts">
import type { NotificationActionSchema } from '@alfakit/core'
import { resolveActionSize } from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import {
  colorClass,
  ghostButtonColorClasses,
  outlineButtonColorClasses,
  solidButtonColorClasses,
  textColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import Button from '../ui/Button.vue'

const props = defineProps<{
  action: NotificationActionSchema
  toastId?: string
  onMarkAsRead?: () => void
  /** Database notifications: `markAsUnread()`. */
  onMarkAsUnread?: () => void
}>()

const run = () => {
  if (props.action.dispatch) {
    window.dispatchEvent(
      new CustomEvent(props.action.dispatch.event, { detail: props.action.dispatch.data }),
    )
  }

  if (props.action.markAsRead) props.onMarkAsRead?.()
  if (props.action.markAsUnread) props.onMarkAsUnread?.()
  if (props.action.close && props.toastId) toast.dismiss(props.toastId)

  if (props.action.url) {
    if (props.action.openUrlInNewTab) window.open(props.action.url, '_blank', 'noopener')
    else router.visit(props.action.url)
  }
}

const variant = computed(() => {
  switch (props.action.variant) {
    case 'button':
      return 'default'
    case 'outline':
      return 'outline'
    case 'ghost':
    case 'icon-button':
      return 'ghost'
    default:
      return 'link'
  }
})

// The action's `color()` applied to its variant (links default to the primary colour).
const colorClasses = computed(() => {
  const color = props.action.color

  if (!color) return undefined

  switch (props.action.variant) {
    case 'button':
      return colorClass(solidButtonColorClasses, color, 'primary')
    case 'outline':
      return colorClass(outlineButtonColorClasses, color, 'gray')
    case 'ghost':
    case 'icon-button':
      return colorClass(ghostButtonColorClasses, color, 'gray')
    default:
      return colorClass(textColorClasses, color, 'primary')
  }
})
</script>

<template>
  <Button
    type="button"
    :size="resolveActionSize(props.action.size, 'xs')"
    :variant="variant"
    :class="colorClasses"
    @click="run"
  >
    <Icon v-if="props.action.icon" :name="props.action.icon" class="size-3.5" />
    {{ props.action.label }}
  </Button>
</template>
