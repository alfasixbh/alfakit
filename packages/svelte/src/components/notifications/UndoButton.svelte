<script lang="ts">
  import type { NotificationUndoSchema } from '@alfakit/core'
  import { bindUndo } from '@alfakit/core'
  import Undo2Icon from '@lucide/svelte/icons/undo-2'
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'
  import { useT } from '../../context.svelte'
  import { Button } from '../ui/button'

  /**
   * The "Undo" button of an `Action::undoable()` toast: a countdown, Ctrl/Cmd+Z while the
   * toast is up (outside text fields), and the undo request.
   */
  let { undo, toastId }: { undo: NotificationUndoSchema; toastId: string } = $props()

  const t = useT()
  // svelte-ignore state_referenced_locally
  let remaining = $state(undo.seconds)
  let busy = $state(false)
  let binding: ReturnType<typeof bindUndo> | null = null

  onMount(() => {
    binding = bindUndo(toastId, undo, {
      onTick: (seconds) => (remaining = seconds),
      onBusy: (value) => (busy = value),
      onClose: () => toast.dismiss(toastId),
    })

    return () => binding?.stop()
  })
</script>

<Button
  type="button"
  data-slot="undo-button"
  variant="outline"
  size="xs"
  disabled={busy}
  aria-keyshortcuts="Control+Z Meta+Z"
  aria-label={t('undo.aria', { seconds: remaining }, 'Undo (Ctrl+Z), :seconds seconds left')}
  onclick={() => void binding?.undo()}
>
  <Undo2Icon class="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
  {t('undo.label', {}, 'Undo')}
  <span aria-hidden="true" class="text-muted-foreground tabular-nums">{remaining}</span>
</Button>
