<script setup lang="ts">
import type { HelpdeskInboxController, HelpdeskTicket } from '@alfakit/core'
import { helpdeskFileSize, presenceInitials } from '@alfakit/core'
import { ArrowLeftIcon, ExternalLinkIcon, LockIcon, PaperclipIcon, SendIcon } from '@lucide/vue'
import { nextTick, onMounted, ref, useId, watch } from 'vue'
import { useStore } from '../../composables/use-store'
import { useFormatter, useT } from '../../context'
import { cn } from '../../lib/utils'
import ActionList from '../actions/ActionList.vue'
import RecordPresence from '../realtime/RecordPresence.vue'
import Avatar from '../ui/Avatar.vue'
import AvatarFallback from '../ui/AvatarFallback.vue'
import AvatarImage from '../ui/AvatarImage.vue'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'
import Spinner from '../ui/Spinner.vue'
import Textarea from '../ui/Textarea.vue'
import HelpdeskBadge from './HelpdeskBadge.vue'

const props = defineProps<{
  ticket: HelpdeskTicket
  controller: HelpdeskInboxController
  token: string
  actionComponent: string
}>()

const t = useT()
const formatter = useFormatter()
const state = useStore(props.controller.store)
const messages = ref<HTMLOListElement | null>(null)
const composer = ref<{ $el: HTMLTextAreaElement } | null>(null)
const composerId = useId()
const hintId = useId()

function focusComposer(): void {
  composer.value?.$el.focus()
}

defineExpose({ focusComposer })

function scrollToEnd(): void {
  void nextTick(() => {
    if (messages.value) messages.value.scrollTop = messages.value.scrollHeight
  })
}

onMounted(scrollToEnd)
watch(() => [props.ticket.key, props.ticket.messages.length], scrollToEnd)

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void props.controller.send()
  }

  if (event.key === 'Escape') {
    ;(event.currentTarget as HTMLElement | null)?.blur()
  }
}

const fileSize = (bytes: number | null | undefined) =>
  helpdeskFileSize(bytes, (value) => formatter.value.number(value))
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- message bodies are sanitised on the server (Html::sanitize) -->
  <header class="flex flex-col gap-2 border-b p-3">
    <div class="flex items-start gap-2">
      <Button
        variant="ghost"
        size="icon-sm"
        class="md:hidden"
        :aria-label="t('helpdesk.back', {}, 'Back to the list')"
        @click="props.controller.select(null)"
      >
        <ArrowLeftIcon class="rtl:rotate-180" />
      </Button>
      <div class="min-w-0 flex-1">
        <h2 class="truncate text-base font-semibold">
          <span class="text-muted-foreground me-1.5 font-normal tabular-nums">{{
            props.ticket.reference
          }}</span
          >{{ props.ticket.subject }}
        </h2>
        <p class="text-muted-foreground truncate text-xs">
          {{ props.ticket.requester.name
          }}<template v-if="props.ticket.requester.email">
            · {{ props.ticket.requester.email }}</template
          >
        </p>
      </div>
      <RecordPresence v-if="props.ticket.presence" :presence="props.ticket.presence" />
      <Button v-if="props.ticket.url" as-child variant="ghost" size="icon-sm">
        <a
          :href="props.ticket.url"
          :aria-label="t('helpdesk.open_page', {}, 'Open the ticket page')"
          :title="t('helpdesk.open_page', {}, 'Open the ticket page')"
        >
          <ExternalLinkIcon class="rtl:-scale-x-100" />
        </a>
      </Button>
    </div>
    <dl class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <div class="flex items-center gap-1">
        <dt class="sr-only">{{ t('helpdesk.status', {}, 'Status') }}</dt>
        <dd><HelpdeskBadge :badge="props.ticket.status" /></dd>
      </div>
      <div class="flex items-center gap-1">
        <dt class="sr-only">{{ t('helpdesk.priority', {}, 'Priority') }}</dt>
        <dd><HelpdeskBadge :badge="props.ticket.priority" /></dd>
      </div>
      <div class="flex items-center gap-1">
        <dt>{{ t('helpdesk.assignee', {}, 'Assignee') }}:</dt>
        <dd class="text-foreground">
          {{ props.ticket.assignee?.name ?? t('helpdesk.unassigned', {}, 'Unassigned') }}
        </dd>
      </div>
      <div v-if="props.ticket.group" class="flex items-center gap-1">
        <dt>{{ t('helpdesk.group', {}, 'Group') }}:</dt>
        <dd class="text-foreground">{{ props.ticket.group.name }}</dd>
      </div>
      <div v-if="props.ticket.sla.firstResponse" class="flex items-center gap-1">
        <dt>{{ t('helpdesk.first_response', {}, 'First response') }}:</dt>
        <dd><HelpdeskBadge :sla="props.ticket.sla.firstResponse" :formatter="formatter" /></dd>
      </div>
      <div v-if="props.ticket.sla.resolution" class="flex items-center gap-1">
        <dt>{{ t('helpdesk.resolution', {}, 'Resolution') }}:</dt>
        <dd><HelpdeskBadge :sla="props.ticket.sla.resolution" :formatter="formatter" /></dd>
      </div>
      <div v-if="props.ticket.satisfaction?.rating !== undefined" class="flex items-center gap-1">
        <dt>{{ t('helpdesk.satisfaction', {}, 'Satisfaction') }}:</dt>
        <dd class="text-foreground">
          {{ t('helpdesk.rating', { rating: props.ticket.satisfaction.rating }, ':rating / 5') }}
        </dd>
      </div>
      <div v-if="props.ticket.tags?.length" class="flex items-center gap-1">
        <dt class="sr-only">{{ t('helpdesk.tags', {}, 'Tags') }}</dt>
        <dd class="flex flex-wrap gap-1">
          <Badge v-for="tag in props.ticket.tags" :key="tag" variant="secondary">{{ tag }}</Badge>
        </dd>
      </div>
    </dl>
    <div
      v-if="props.ticket.actions.length > 0"
      role="group"
      :aria-label="t('helpdesk.actions', {}, 'Ticket actions')"
    >
      <ActionList
        :actions="props.ticket.actions"
        :context="{
          token: props.token,
          component: props.actionComponent,
          record: props.ticket.key,
        }"
        size="xs"
      />
    </div>
  </header>

  <ol
    ref="messages"
    :aria-label="t('helpdesk.conversation', {}, 'Conversation')"
    class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
  >
    <template v-for="message in props.ticket.messages" :key="message.key">
      <li
        v-if="message.kind === 'event'"
        data-slot="helpdesk-message"
        data-kind="event"
        class="text-muted-foreground flex items-center gap-2 self-center text-xs"
      >
        <span class="sr-only">{{ t('helpdesk.activity', {}, 'Activity') }}:</span>
        <span class="[&_p]:inline" v-html="message.html" />
        <time v-if="message.createdAt" :datetime="message.createdAt"
          >· {{ formatter.relative(message.createdAt) }}</time
        >
      </li>
      <li
        v-else
        data-slot="helpdesk-message"
        :data-kind="message.kind"
        :data-from="message.fromRequester ? 'requester' : 'agent'"
        :class="
          cn(
            'flex max-w-[48rem] gap-2.5',
            !message.fromRequester && 'flex-row-reverse self-end text-start',
          )
        "
      >
        <Avatar class="size-8 shrink-0">
          <AvatarImage v-if="message.author.avatar" :src="message.author.avatar" alt="" />
          <AvatarFallback aria-hidden="true">{{
            presenceInitials(message.author.name)
          }}</AvatarFallback>
        </Avatar>
        <article
          :class="
            cn(
              'min-w-0 rounded-lg border px-3 py-2',
              message.kind === 'note'
                ? 'border-warning/40 bg-warning/10'
                : message.fromRequester
                  ? 'bg-muted/50'
                  : 'bg-primary/5 border-primary/20',
            )
          "
        >
          <header class="mb-1 flex flex-wrap items-center gap-x-2 text-xs">
            <span class="font-medium">{{ message.author.name }}</span>
            <span
              v-if="message.kind === 'note'"
              class="text-warning inline-flex items-center gap-1 font-medium"
            >
              <LockIcon class="size-3" aria-hidden="true" />
              {{ t('helpdesk.internal', {}, 'Internal note') }}
            </span>
            <time
              v-if="message.createdAt"
              :datetime="message.createdAt"
              :title="formatter.dateTime(message.createdAt)"
              class="text-muted-foreground"
              >{{ formatter.relative(message.createdAt) }}</time
            >
          </header>
          <div
            class="prose prose-sm dark:prose-invert max-w-none break-words"
            v-html="message.html"
          />
          <ul
            v-if="message.attachments?.length"
            :aria-label="t('helpdesk.attachments', {}, 'Attachments')"
            class="mt-2 flex flex-wrap gap-1.5"
          >
            <li v-for="(file, index) in message.attachments" :key="index">
              <a
                v-if="file.url"
                :href="file.url"
                target="_blank"
                rel="noopener"
                class="hover:bg-muted inline-flex items-center gap-1 rounded border px-2 py-1 text-xs"
              >
                <PaperclipIcon class="size-3" aria-hidden="true" />
                {{ file.name }}
                <span v-if="fileSize(file.size)" class="text-muted-foreground"
                  >({{ fileSize(file.size) }})</span
                >
              </a>
              <span
                v-else
                class="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs"
                >{{ file.name }}</span
              >
            </li>
          </ul>
        </article>
      </li>
    </template>
  </ol>

  <p v-if="props.ticket.merged" class="text-muted-foreground border-t p-3 text-sm">
    {{ t('helpdesk.merged', {}, 'This ticket was merged into another one.') }}
  </p>

  <form
    v-if="props.ticket.canReply"
    data-slot="helpdesk-composer"
    :data-mode="state.composer.mode"
    class="data-[mode=note]:bg-warning/5 flex flex-col gap-2 border-t p-3"
    @submit.prevent="props.controller.send()"
  >
    <div class="flex items-center justify-between gap-2">
      <div
        role="radiogroup"
        :aria-label="t('helpdesk.mode', {}, 'Message type')"
        class="bg-muted inline-flex rounded-md p-0.5"
      >
        <button
          v-for="mode in ['reply', 'note'] as const"
          :key="mode"
          type="button"
          role="radio"
          :aria-checked="state.composer.mode === mode"
          class="aria-checked:bg-background aria-checked:text-foreground text-muted-foreground rounded px-2.5 py-1 text-xs font-medium aria-checked:shadow-xs"
          @click="props.controller.setMode(mode)"
        >
          {{
            mode === 'reply'
              ? t('helpdesk.mode_reply', {}, 'Reply')
              : t('helpdesk.mode_note', {}, 'Internal note')
          }}
        </button>
      </div>
      <p
        v-if="state.requesterTyping"
        class="text-muted-foreground animate-pulse text-xs"
        role="status"
      >
        {{
          t('helpdesk.requester_typing', { name: props.ticket.requester.name }, ':name is typing…')
        }}
      </p>
    </div>
    <label :for="composerId" class="sr-only">
      {{
        state.composer.mode === 'note'
          ? t('helpdesk.mode_note', {}, 'Internal note')
          : t('helpdesk.mode_reply', {}, 'Reply')
      }}
    </label>
    <Textarea
      :id="composerId"
      ref="composer"
      rows="3"
      :model-value="state.composer.text"
      :aria-describedby="hintId"
      :aria-invalid="state.composer.error ? true : undefined"
      :placeholder="
        state.composer.mode === 'note'
          ? t('helpdesk.note_placeholder', {}, 'Add a note only agents can see…')
          : t(
              'helpdesk.reply_placeholder',
              { name: props.ticket.requester.name },
              'Reply to :name…',
            )
      "
      class="max-h-48 min-h-20 resize-y"
      @update:model-value="props.controller.setText($event)"
      @keydown="onKeyDown"
    />
    <p v-if="state.composer.error" role="alert" class="text-destructive text-xs">
      {{ state.composer.error }}
    </p>
    <div class="flex items-center justify-between gap-2">
      <p :id="hintId" class="text-muted-foreground text-xs max-sm:hidden">
        {{ t('helpdesk.send_hint', {}, 'Enter to send, Shift+Enter for a new line') }}
      </p>
      <Button
        type="submit"
        size="sm"
        class="ms-auto"
        :variant="state.composer.mode === 'note' ? 'secondary' : 'default'"
        :disabled="state.composer.sending || state.composer.text.trim() === ''"
      >
        <Spinner v-if="state.composer.sending" />
        <SendIcon v-else class="rtl:-scale-x-100" />
        {{
          state.composer.sending
            ? t('helpdesk.sending', {}, 'Sending…')
            : state.composer.mode === 'note'
              ? t('helpdesk.add_note', {}, 'Add note')
              : t('helpdesk.send', {}, 'Send')
        }}
      </Button>
    </div>
  </form>
</template>
