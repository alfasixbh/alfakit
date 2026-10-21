<script setup lang="ts">
import {
  registerStarterKitCopilotShortcut,
  requestStarterKitCopilot,
  type StarterKitWidgets,
} from '@alfakit/core'
import { computed, watch } from 'vue'

/**
 * The AI copilot's button until its code has loaded: the same look, from the shared prop
 * alone (its code loads once mounted). A click and its key bindings (`mod+j`) are
 * remembered and open it once loaded.
 */
const props = defineProps<{ source: StarterKitWidgets }>()

const copilot = computed(() => props.source.widgets.copilot)

if (typeof window !== 'undefined') {
  watch(
    copilot,
    (value, _old, onCleanup) =>
      onCleanup(registerStarterKitCopilotShortcut(value?.keyBindings ?? [], value?.label ?? '')),
    { immediate: true },
  )
}
</script>

<template>
  <button
    type="button"
    data-slot="ai-copilot-trigger"
    :aria-label="copilot?.label"
    aria-haspopup="dialog"
    :title="copilot?.label"
    class="hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md"
    @click="requestStarterKitCopilot()"
  >
    <!-- Lucide's "sparkles", inline: the loaded copilot draws the same icon. -->
    <svg
      class="size-4"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
      />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" />
    </svg>
  </button>
</template>
