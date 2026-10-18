<script lang="ts">
  import { AiStreamController, type AiStreamSchema, type AiStreamState } from '@alfakit/core'
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
  import SquareIcon from '@lucide/svelte/icons/square'
  import { onDestroy, untrack } from 'svelte'
  import { useT } from '../../context.svelte'
  import { useFormStore } from '../form/form-context.svelte'
  import { Button } from '../ui/button'

  /**
   * `ai:stream` (alfasix/alfakit-ai `streaming()`): streams an answer into a modal form.
   * The text shows as it is written (plain text) with a "Stop" button; a polite live region
   * announces it in batches. When it is done the finished answer (cleaned up by the server)
   * goes into the target field and the form refreshes, so the server renders it.
   */
  let { component }: { component: AiStreamSchema } = $props()
  const t = useT()
  const form = useFormStore()
  const schema = untrack(() => component)

  let values = $state(form.state.values)
  const unsubscribeForm = form.subscribe((next) => (values = next.values))
  const token = $derived.by(() => {
    void values

    return form.getValue<string | null>(schema.statePath, null)
  })

  const settle = (next: Record<string, unknown>) => {
    form.setValue(schema.statePath, null, { silent: true })

    for (const [path, value] of Object.entries(next)) {
      form.setValue(path, value, { silent: true })
    }

    void form.refresh(schema.target)
  }

  const controller = new AiStreamController({
    endpoint: schema.endpoint,
    onDone: (text) => settle({ [schema.target]: text, [schema.errorPath]: null }),
    onError: (message) =>
      settle({
        [schema.errorPath]:
          message || t('ai.stream.failed', {}, 'The answer could not be written. Try again.'),
      }),
    onCancel: () => settle({ [schema.errorPath]: t('ai.stream.stopped', {}, 'Stopped.') }),
  })

  let stream = $state<AiStreamState>(controller.state)
  const unsubscribe = controller.store.subscribe((next) => (stream = next))

  $effect(() => {
    if (typeof token === 'string' && token !== '') void controller.start(token)
  })

  onDestroy(() => {
    unsubscribe()
    unsubscribeForm()
    controller.dispose()
  })

  const streaming = $derived(stream.status === 'streaming')
</script>

{#if streaming || token}
  <div
    data-slot="ai-stream"
    class="bg-muted/40 flex flex-col gap-3 rounded-md border p-3"
    aria-busy={streaming}
  >
    <div class="flex items-center justify-between gap-3">
      <span class="text-muted-foreground flex items-center gap-2 text-sm">
        <LoaderCircleIcon class="size-4 animate-spin" aria-hidden="true" />
        {t('ai.stream.writing', {}, 'Writing…')}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-slot="ai-stream-stop"
        aria-label={t('ai.stream.stop_label', {}, 'Stop writing the answer')}
        onclick={() => controller.cancel()}
      >
        <SquareIcon aria-hidden="true" class="size-3.5" />
        {t('ai.stream.stop', {}, 'Stop')}
      </Button>
    </div>
    {#if stream.text !== ''}
      <div
        data-slot="ai-stream-text"
        class="text-start text-sm leading-relaxed break-words whitespace-pre-wrap"
      >
        {stream.text}
      </div>
    {/if}
    <div class="sr-only" aria-live="polite" aria-atomic="true">{stream.announcement}</div>
  </div>
{/if}
