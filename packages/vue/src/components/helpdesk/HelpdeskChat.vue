<script setup lang="ts">
import { HelpdeskChatClient, type HelpdeskChatOptions } from '@alfakit/core'
import { MessageCircleIcon, XIcon } from '@lucide/vue'
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useStore } from '../../composables/use-store'
import { cn } from '../../lib/utils'

/**
 * The helpdesk's live chat widget for your public pages (alfasix/alfakit-helpdesk): a
 * launcher button that opens the chat. The chat's code loads when it is first opened;
 * nothing renders on the server. Works outside panels (no `AlfakitRoot` needed).
 *
 * ```vue
 * <HelpdeskChat endpoint="/support/chat" />
 * ```
 */
const props = withDefaults(
  defineProps<
    HelpdeskChatOptions & {
      /** Which corner, in the reading direction (`end` by default: bottom right in LTR). */
      position?: 'start' | 'end'
      defaultOpen?: boolean
      /** The launcher's accessible name before the server's texts arrive. */
      label?: string
      class?: string
    }
  >(),
  { position: 'end', defaultOpen: false, pollWhenClosed: undefined },
)

const loadPanel = () => import('./HelpdeskChatPanel.vue').then((module) => module.default)
const HelpdeskChatPanel = defineAsyncComponent(loadPanel)

const client = new HelpdeskChatClient({
  endpoint: props.endpoint,
  pollWhenClosed: props.pollWhenClosed,
  request: props.request,
})
const state = useStore(client.store)
const mounted = ref(false)
const launcher = ref<HTMLButtonElement | null>(null)
const panelId = useId()

const name = computed(() =>
  state.value.open ? client.t('close', 'Close chat') : client.t('open', props.label ?? 'Open chat'),
)
const unread = computed(() =>
  typeof document === 'undefined'
    ? String(state.value.unread)
    : new Intl.NumberFormat(document.documentElement.lang || undefined).format(state.value.unread),
)

onMounted(() => {
  mounted.value = true
  void client.load()

  if (props.defaultOpen) client.setOpen(true)
})

onBeforeUnmount(() => client.stop())

function close(): void {
  client.setOpen(false)
  launcher.value?.focus()
}

function toggle(): void {
  if (state.value.open) close()
  else client.setOpen(true)
}
</script>

<template>
  <div
    v-if="mounted && state.config?.enabled !== false"
    data-slot="helpdesk-chat-widget"
    :class="
      cn(
        'fixed bottom-4 z-50 flex flex-col gap-3',
        props.position === 'end' ? 'end-4 items-end' : 'start-4 items-start',
        props.class,
      )
    "
  >
    <div v-if="state.open" :id="panelId">
      <HelpdeskChatPanel :client="client" @close="close" />
    </div>
    <button
      ref="launcher"
      type="button"
      :aria-expanded="state.open"
      :aria-controls="state.open ? panelId : undefined"
      :aria-label="name"
      :title="name"
      class="bg-primary text-primary-foreground focus-visible:ring-ring/50 relative flex size-14 items-center justify-center rounded-full shadow-lg transition-transform outline-none hover:scale-105 focus-visible:ring-[3px]"
      @click="toggle"
      @mouseenter="loadPanel()"
      @focus="loadPanel()"
    >
      <XIcon v-if="state.open" class="size-6" aria-hidden="true" />
      <MessageCircleIcon v-else class="size-6 rtl:-scale-x-100" aria-hidden="true" />
      <span
        v-if="!state.open && state.unread > 0"
        class="bg-destructive text-destructive-foreground absolute -end-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold"
      >
        {{ unread }}
        <span class="sr-only">{{
          client.t('new_message', 'New message from :name', { name: client.t('agent', 'Support') })
        }}</span>
      </span>
    </button>
  </div>
</template>
