<script setup lang="ts">
import { type AiCopilotSchema, CopilotController, shortcuts } from '@alfakit/core'
import { SparklesIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useT } from '../../context'
import Button from '../ui/Button.vue'
import { CopilotPanel, preloadCopilotPanel } from './copilot-lazy'

/**
 * The copilot of alfasix/alfakit-ai (`ai:copilot`): a topbar button (and `mod+j`) opening
 * a chat slide-over. Questions, tools and actions run on the server; proposed actions
 * run only when the user confirms them in the chat.
 */
const props = defineProps<{
  component: AiCopilotSchema
  /** Open once mounted (starter kit header: clicked or `mod+j` before its code loaded). */
  autoOpen?: boolean
}>()
const t = useT()
// One controller per panel: Inertia visits pass new props objects.
const controller = new CopilotController(props.component)
const state = shallowRef(controller.state)
const mounted = ref(false)
const label = computed(() => t('ai.open', {}, 'Open AI copilot'))

const unsubscribe = controller.subscribe((next) => {
  state.value = next

  if (next.open) mounted.value = true
})

if (props.autoOpen && props.component.canUse !== false) controller.open()

let unregister: (() => void) | undefined

watch(
  () => [JSON.stringify(props.component.keyBindings ?? []), label.value] as const,
  ([keys, text]) => {
    unregister?.()
    unregister = undefined

    const bindings = JSON.parse(keys) as string[]

    if (bindings.length === 0) return

    unregister = shortcuts.register({
      id: 'ai.copilot',
      keys: bindings,
      label: text,
      group: 'general',
      allowInInputs: true,
      handler: () => controller.toggle(),
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  unsubscribe()
  unregister?.()
})
</script>

<template>
  <div v-if="props.component.canUse !== false" data-slot="ai-copilot" class="contents">
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-slot="ai-copilot-trigger"
      :aria-label="label"
      :aria-expanded="state.open"
      aria-haspopup="dialog"
      :title="label"
      @click="controller.open()"
      @pointerenter="preloadCopilotPanel()"
      @focus="preloadCopilotPanel()"
    >
      <SparklesIcon aria-hidden="true" />
    </Button>
    <CopilotPanel v-if="mounted" :controller="controller" />
  </div>
</template>
