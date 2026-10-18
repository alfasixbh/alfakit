import { AiStreamController, type AiStreamSchema, type AiStreamState } from '@alfakit/core'
import { Loader2Icon, SquareIcon } from 'lucide-react'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useT } from '../../context'
import { useFormStore } from '../form/form-context'
import { Button } from '../ui/button'

/**
 * `ai:stream` (alfasix/alfakit-ai `streaming()`): streams an answer into a modal form. The
 * text shows as it is written (plain text) with a "Stop" button; a polite live region
 * announces it in batches. When it is done the finished answer (cleaned up by the server)
 * goes into the target field and the form refreshes, so the server renders it.
 */
export function AiStream({ component }: { component: AiStreamSchema }) {
  const t = useT()
  const form = useFormStore()
  const token = useSyncExternalStore(
    (listener) => form.subscribe(listener),
    () => form.getValue<string | null>(component.statePath, null),
    () => form.getValue<string | null>(component.statePath, null),
  )

  const controller = useMemo(() => {
    const settle = (values: Record<string, unknown>) => {
      form.setValue(component.statePath, null, { silent: true })

      for (const [path, value] of Object.entries(values)) {
        form.setValue(path, value, { silent: true })
      }

      void form.refresh(component.target)
    }

    return new AiStreamController({
      endpoint: component.endpoint,
      onDone: (text) => settle({ [component.target]: text, [component.errorPath]: null }),
      onError: (message) =>
        settle({
          [component.errorPath]:
            message || t('ai.stream.failed', {}, 'The answer could not be written. Try again.'),
        }),
      onCancel: () => settle({ [component.errorPath]: t('ai.stream.stopped', {}, 'Stopped.') }),
    })
    // One controller per field; the endpoint and paths don't change while it is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, component.statePath])

  const state = useSyncExternalStore<AiStreamState>(
    (listener) => controller.store.subscribe(listener),
    () => controller.state,
    () => controller.state,
  )

  useEffect(() => {
    if (typeof token === 'string' && token !== '') void controller.start(token)
  }, [controller, token])

  useEffect(() => () => controller.dispose(), [controller])

  const streaming = state.status === 'streaming'

  if (!streaming && !token) return null

  return (
    <div
      data-slot="ai-stream"
      className="bg-muted/40 flex flex-col gap-3 rounded-md border p-3"
      aria-busy={streaming}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          {t('ai.stream.writing', {}, 'Writing…')}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-slot="ai-stream-stop"
          aria-label={t('ai.stream.stop_label', {}, 'Stop writing the answer')}
          onClick={() => controller.cancel()}
        >
          <SquareIcon aria-hidden="true" className="size-3.5" />
          {t('ai.stream.stop', {}, 'Stop')}
        </Button>
      </div>
      {state.text !== '' && (
        <div
          data-slot="ai-stream-text"
          className="text-start text-sm leading-relaxed break-words whitespace-pre-wrap"
        >
          {state.text}
        </div>
      )}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {state.announcement}
      </div>
    </div>
  )
}
