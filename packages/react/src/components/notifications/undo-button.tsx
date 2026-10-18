import type { NotificationUndoSchema } from '@alfakit/core'
import { bindUndo } from '@alfakit/core'
import { Undo2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useT } from '../../context'
import { Button } from '../ui/button'

/**
 * The "Undo" button of an `Action::undoable()` toast: a countdown, Ctrl/Cmd+Z while the
 * toast is up (outside text fields), and the undo request. The toast closes when the offer
 * ends.
 */
export function UndoButton({ undo, toastId }: { undo: NotificationUndoSchema; toastId: string }) {
  const t = useT()
  const [remaining, setRemaining] = useState(undo.seconds)
  const [busy, setBusy] = useState(false)
  const run = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    const binding = bindUndo(toastId, undo, {
      onTick: setRemaining,
      onBusy: setBusy,
      onClose: () => toast.dismiss(toastId),
    })

    run.current = binding.undo

    return binding.stop
  }, [toastId, undo])

  return (
    <Button
      type="button"
      data-slot="undo-button"
      variant="outline"
      size="xs"
      disabled={busy}
      aria-keyshortcuts="Control+Z Meta+Z"
      aria-label={t('undo.aria', { seconds: remaining }, 'Undo (Ctrl+Z), :seconds seconds left')}
      onClick={() => void run.current()}
    >
      <Undo2Icon className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
      {t('undo.label', {}, 'Undo')}
      <span aria-hidden="true" className="text-muted-foreground tabular-nums">
        {remaining}
      </span>
    </Button>
  )
}
