<script setup lang="ts">
import type { NotificationUndoSchema } from '@alfakit/core'
import { bindUndo } from '@alfakit/core'
import { Undo2Icon } from '@lucide/vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useT } from '../../context'
import Button from '../ui/Button.vue'

/**
 * The "Undo" button of an `Action::undoable()` toast: a countdown, Ctrl/Cmd+Z while the
 * toast is up (outside text fields), and the undo request.
 */
const props = defineProps<{ undo: NotificationUndoSchema; toastId: string }>()

const t = useT()
const remaining = ref(props.undo.seconds)
const busy = ref(false)
let binding: ReturnType<typeof bindUndo> | null = null

onMounted(() => {
  binding = bindUndo(props.toastId, props.undo, {
    onTick: (seconds) => (remaining.value = seconds),
    onBusy: (value) => (busy.value = value),
    onClose: () => toast.dismiss(props.toastId),
  })
})

onBeforeUnmount(() => binding?.stop())
</script>

<template>
  <Button
    type="button"
    data-slot="undo-button"
    variant="outline"
    size="xs"
    :disabled="busy"
    aria-keyshortcuts="Control+Z Meta+Z"
    :aria-label="t('undo.aria', { seconds: remaining }, 'Undo (Ctrl+Z), :seconds seconds left')"
    @click="binding?.undo()"
  >
    <Undo2Icon class="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
    {{ t('undo.label', {}, 'Undo') }}
    <span aria-hidden="true" class="text-muted-foreground tabular-nums">{{ remaining }}</span>
  </Button>
</template>
