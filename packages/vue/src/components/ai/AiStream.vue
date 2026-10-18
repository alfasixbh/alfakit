<script setup lang="ts">
import { AiStreamController, type AiStreamSchema } from '@alfakit/core'
import { LoaderCircleIcon, SquareIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { useT } from '../../context'
import { useFormStore } from '../form/form-context'
import Button from '../ui/Button.vue'

/**
 * `ai:stream` (alfasix/alfakit-ai `streaming()`): streams an answer into a modal form. The
 * text shows as it is written (plain text) with a "Stop" button; a polite live region
 * announces it in batches. When it is done the finished answer (cleaned up by the server)
 * goes into the target field and the form refreshes, so the server renders it.
 */
const props = defineProps<{ component: AiStreamSchema }>()
const t = useT()
const form = useFormStore()

const values = shallowRef(form.state.values)
const unsubscribeForm = form.subscribe((state) => (values.value = state.values))
const token = computed(() => {
  void values.value

  return form.getValue<string | null>(props.component.statePath, null)
})

const settle = (next: Record<string, unknown>) => {
  form.setValue(props.component.statePath, null, { silent: true })

  for (const [path, value] of Object.entries(next)) {
    form.setValue(path, value, { silent: true })
  }

  void form.refresh(props.component.target)
}

const controller = new AiStreamController({
  endpoint: props.component.endpoint,
  onDone: (text) => settle({ [props.component.target]: text, [props.component.errorPath]: null }),
  onError: (message) =>
    settle({
      [props.component.errorPath]:
        message || t('ai.stream.failed', {}, 'The answer could not be written. Try again.'),
    }),
  onCancel: () => settle({ [props.component.errorPath]: t('ai.stream.stopped', {}, 'Stopped.') }),
})

const state = shallowRef(controller.state)
const unsubscribe = controller.store.subscribe((next) => (state.value = next))

watch(
  token,
  (value) => {
    if (typeof value === 'string' && value !== '') void controller.start(value)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  unsubscribe()
  unsubscribeForm()
  controller.dispose()
})

const streaming = computed(() => state.value.status === 'streaming')
</script>

<template>
  <div
    v-if="streaming || token"
    data-slot="ai-stream"
    class="bg-muted/40 flex flex-col gap-3 rounded-md border p-3"
    :aria-busy="streaming"
  >
    <div class="flex items-center justify-between gap-3">
      <span class="text-muted-foreground flex items-center gap-2 text-sm">
        <LoaderCircleIcon class="size-4 animate-spin" aria-hidden="true" />
        {{ t('ai.stream.writing', {}, 'Writing…') }}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-slot="ai-stream-stop"
        :aria-label="t('ai.stream.stop_label', {}, 'Stop writing the answer')"
        @click="controller.cancel()"
      >
        <SquareIcon aria-hidden="true" class="size-3.5" />
        {{ t('ai.stream.stop', {}, 'Stop') }}
      </Button>
    </div>
    <div
      v-if="state.text !== ''"
      data-slot="ai-stream-text"
      class="text-start text-sm leading-relaxed break-words whitespace-pre-wrap"
    >
      {{ state.text }}
    </div>
    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ state.announcement }}</div>
  </div>
</template>
