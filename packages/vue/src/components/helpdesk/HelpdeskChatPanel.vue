<script setup lang="ts">
import type { HelpdeskChatClient } from '@alfakit/core'
import { SendIcon, XIcon } from '@lucide/vue'
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue'
import { useStore } from '../../composables/use-store'
import { cn } from '../../lib/utils'
import Button from '../ui/Button.vue'
import Input from '../ui/Input.vue'
import Spinner from '../ui/Spinner.vue'
import Textarea from '../ui/Textarea.vue'

/**
 * The open live chat: the conversation (a polite live log), the visitor's contact details
 * before the first message, and the composer. Texts come from the server.
 */
const props = defineProps<{ client: HelpdeskChatClient }>()
const emit = defineEmits<{ close: [] }>()

const state = useStore(props.client.store)
const titleId = useId()
const composerId = useId()
const emailHintId = useId()
const log = ref<HTMLOListElement | null>(null)
const composer = ref<{ $el: HTMLTextAreaElement } | null>(null)
const t = (key: string, fallback: string, replacements: Record<string, string> = {}) =>
  props.client.t(key, fallback, replacements)

const conversation = computed(() => state.value.conversation)
const started = computed(() => Boolean(conversation.value?.key))
const closed = computed(() => Boolean(conversation.value?.closed))

onMounted(() => composer.value?.$el.focus())

watch(
  () => [conversation.value?.messages.length, conversation.value?.agentTyping],
  () =>
    void nextTick(() => {
      if (log.value) log.value.scrollTop = log.value.scrollHeight
    }),
)

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void props.client.send()
  }
}
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- message bodies are sanitised on the server (Html::sanitize) -->
  <div
    role="dialog"
    aria-modal="false"
    :aria-labelledby="titleId"
    data-slot="helpdesk-chat"
    class="bg-background text-foreground flex h-[min(36rem,calc(100svh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border shadow-xl"
    @keydown.esc.stop="emit('close')"
  >
    <header class="bg-primary text-primary-foreground flex items-start gap-2 px-4 py-3">
      <div class="min-w-0 flex-1">
        <h2 :id="titleId" class="text-sm font-semibold">{{ t('title', 'Chat with us') }}</h2>
        <p class="text-xs opacity-80">{{ t('subtitle', 'We usually reply in a few minutes.') }}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        :aria-label="t('close', 'Close chat')"
        class="hover:bg-primary-foreground/10 text-primary-foreground hover:text-primary-foreground -me-2"
        @click="emit('close')"
      >
        <XIcon />
      </Button>
    </header>

    <ol
      ref="log"
      role="log"
      aria-live="polite"
      :aria-label="t('messages', 'Messages')"
      class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3"
    >
      <li v-if="state.status === 'loading' && !state.config" class="m-auto"><Spinner /></li>
      <template v-else>
        <li
          v-if="state.config?.greeting"
          data-from="agent"
          class="bg-muted max-w-[85%] self-start rounded-2xl rounded-ss-sm px-3 py-2 text-sm"
        >
          {{ state.config.greeting }}
        </li>
        <li
          v-for="message in conversation?.messages ?? []"
          :key="message.key"
          :data-from="message.from"
          :class="
            cn(
              'flex max-w-[85%] flex-col gap-0.5',
              message.from === 'visitor' ? 'items-end self-end' : 'items-start self-start',
            )
          "
        >
          <span class="text-muted-foreground px-1 text-xs">{{ message.name }}</span>
          <div
            :class="
              cn(
                'prose prose-sm dark:prose-invert max-w-none rounded-2xl px-3 py-2 break-words [&_p]:my-0',
                message.from === 'visitor'
                  ? 'bg-primary text-primary-foreground prose-a:text-primary-foreground rounded-se-sm'
                  : 'bg-muted rounded-ss-sm',
              )
            "
            v-html="message.html"
          />
        </li>
        <li
          v-if="conversation?.agentTyping"
          role="status"
          class="text-muted-foreground animate-pulse self-start px-1 text-xs"
        >
          {{ t('typing', ':name is typing…', { name: conversation.agentTyping }) }}
        </li>
      </template>
    </ol>

    <div v-if="closed" class="flex flex-col items-center gap-2 border-t p-3 text-center text-sm">
      <p class="text-muted-foreground">{{ t('closed', 'This chat has ended.') }}</p>
      <Button type="button" size="sm" @click="props.client.startNew()">{{
        t('new_chat', 'Start a new chat')
      }}</Button>
    </div>
    <form v-else class="flex flex-col gap-2 border-t p-3" @submit.prevent="props.client.send()">
      <div v-if="!started && state.config?.askContact" class="grid grid-cols-2 gap-2">
        <Input
          :model-value="state.name"
          :placeholder="t('name', 'Your name')"
          :aria-label="t('name', 'Your name')"
          autocomplete="name"
          maxlength="255"
          @update:model-value="props.client.setContact({ name: $event })"
        />
        <Input
          type="email"
          :model-value="state.email"
          :placeholder="t('email', 'Your email')"
          :aria-label="t('email', 'Your email')"
          :aria-describedby="emailHintId"
          autocomplete="email"
          :required="state.config.requireEmail"
          maxlength="255"
          @update:model-value="props.client.setContact({ email: $event })"
        />
        <p :id="emailHintId" class="sr-only">
          {{ t('email_hint', 'So we can follow up if you leave.') }}
        </p>
        <!-- People never see or fill this; bots that fill every input do. -->
        <input
          type="text"
          :name="state.config.honeypot"
          :value="state.trap"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
          class="absolute -start-[10000px] size-px overflow-hidden"
          @input="props.client.setContact({ trap: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <label :for="composerId" class="sr-only">{{ t('message', 'Message') }}</label>
      <div class="flex items-end gap-2">
        <Textarea
          :id="composerId"
          ref="composer"
          rows="1"
          :model-value="state.draft"
          :maxlength="state.config?.maxLength"
          :placeholder="t('placeholder', 'Write a message…')"
          :aria-invalid="state.error ? true : undefined"
          class="max-h-32 min-h-10 flex-1 resize-none"
          @update:model-value="props.client.setDraft($event)"
          @keydown="onKeyDown"
        />
        <Button
          type="submit"
          size="icon"
          :disabled="state.sending || state.draft.trim() === ''"
          :aria-label="
            state.sending
              ? t('sending', 'Sending…')
              : started
                ? t('send', 'Send')
                : t('start', 'Start chat')
          "
        >
          <Spinner v-if="state.sending" />
          <SendIcon v-else class="rtl:-scale-x-100" />
        </Button>
      </div>
      <p v-if="state.error" role="alert" class="text-destructive text-xs">{{ state.error }}</p>
      <a
        v-if="state.config?.contactUrl && !started"
        :href="state.config.contactUrl"
        class="text-muted-foreground self-center text-xs underline-offset-4 hover:underline"
        >{{ t('contact', 'Prefer email? Contact us') }}</a
      >
    </form>
    <!-- eslint-disable-next-line vue/no-v-html -- built on the server (Credit::poweredBy) -->
    <div v-if="state.config?.poweredBy" class="shrink-0" v-html="state.config.poweredBy" />
  </div>
</template>
