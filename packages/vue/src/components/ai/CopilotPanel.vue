<script setup lang="ts">
import { type AiMessageSchema, type CopilotController, copilotBlocks } from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import {
  ArrowUpIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  HistoryIcon,
  InfoIcon,
  MessageSquarePlusIcon,
  SparklesIcon,
  SquareIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useDirection, useFormatter, useT } from '../../context'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'
import Sheet from '../ui/Sheet.vue'
import SheetContent from '../ui/SheetContent.vue'
import SheetDescription from '../ui/SheetDescription.vue'
import SheetHeader from '../ui/SheetHeader.vue'
import SheetTitle from '../ui/SheetTitle.vue'
import Spinner from '../ui/Spinner.vue'
import Textarea from '../ui/Textarea.vue'

const props = defineProps<{ controller: CopilotController }>()
const t = useT()
const direction = useDirection()
const format = useFormatter()
const state = shallowRef(props.controller.state)
const end = ref<HTMLElement | null>(null)
const currency = props.controller.schema.currency
const notice = props.controller.schema.notice

const unsubscribe = props.controller.subscribe((next) => (state.value = next))
onBeforeUnmount(unsubscribe)

const totals = computed(() => props.controller.totals(state.value.messages))
const title = computed(() =>
  state.value.view === 'history'
    ? t('ai.history', {}, 'Conversations')
    : state.value.conversation?.title || t('ai.title', {}, 'Copilot'),
)

watch(
  () => [state.value.messages.length, state.value.sending, state.value.streaming?.text],
  () => nextTick(() => end.value?.scrollIntoView?.({ block: 'end' })),
)

function tokens(count: number): string {
  return t('ai.tokens', { count: format.value.number(count) }, ':count tokens')
}

function cost(value: number): string {
  return t(
    'ai.cost',
    { cost: format.value.money(value, currency, { maximumFractionDigits: 4 }) },
    '≈ :cost',
  )
}

function usage(message: AiMessageSchema): string | null {
  if (!message.usage) return null

  const parts = [tokens(message.usage.inputTokens + message.usage.outputTokens)]

  if (message.usage.cost !== undefined && currency) parts.push(cost(message.usage.cost))

  return parts.join(' · ')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void props.controller.send()
  }
}

function statusLabel(status: string): string {
  if (status === 'confirmed') return t('ai.confirmed', {}, 'Done')
  if (status === 'failed') return t('ai.failed', {}, 'Failed')

  return t('ai.rejected', {}, 'Cancelled')
}
</script>

<template>
  <Sheet :open="state.open" @update:open="(open: boolean) => controller.setOpen(open)">
    <SheetContent
      :side="direction === 'rtl' ? 'left' : 'right'"
      data-slot="ai-copilot-panel"
      class="flex w-full flex-col gap-0 p-0 sm:max-w-md"
    >
      <SheetHeader class="border-b pe-12">
        <div class="flex items-center gap-2">
          <SparklesIcon class="text-primary size-4" aria-hidden="true" />
          <SheetTitle class="flex-1 truncate">{{ title }}</SheetTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            :aria-label="
              state.view === 'history'
                ? t('ai.back', {}, 'Back to the conversation')
                : t('ai.history', {}, 'Conversations')
            "
            :aria-pressed="state.view === 'history'"
            @click="state.view === 'history' ? controller.showChat() : controller.showHistory()"
          >
            <HistoryIcon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            :aria-label="t('ai.new', {}, 'New conversation')"
            @click="controller.newConversation()"
          >
            <MessageSquarePlusIcon aria-hidden="true" />
          </Button>
        </div>
        <SheetDescription class="text-xs" data-slot="ai-disclaimer">
          {{ t('ai.disclaimer', {}, 'AI can make mistakes. Check important information.') }}
        </SheetDescription>
      </SheetHeader>

      <div
        v-if="notice"
        role="status"
        data-slot="ai-notice"
        :data-status="notice.status"
        class="bg-muted/50 flex items-start gap-2 border-b px-4 py-3 text-sm"
      >
        <TriangleAlertIcon
          v-if="notice.status === 'warning'"
          class="text-destructive mt-0.5 size-4 shrink-0"
          aria-hidden="true"
        />
        <InfoIcon v-else class="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div class="flex min-w-0 flex-col gap-0.5">
          <p class="font-medium">{{ notice.heading }}</p>
          <p v-if="notice.description" class="text-muted-foreground break-words">
            {{ notice.description }}
          </p>
        </div>
      </div>

      <div
        v-if="state.view === 'history'"
        class="flex-1 overflow-y-auto p-2"
        data-slot="ai-history"
      >
        <div v-if="state.loading" class="flex justify-center p-6">
          <Spinner />
          <span class="sr-only">{{ t('ai.loading', {}, 'Loading') }}</span>
        </div>
        <p
          v-else-if="state.conversations.length === 0"
          class="text-muted-foreground p-6 text-center text-sm"
        >
          {{ t('ai.no_conversations', {}, 'No conversations yet.') }}
        </p>
        <ul v-else class="flex flex-col gap-1">
          <li
            v-for="conversation in state.conversations"
            :key="conversation.id"
            class="group flex items-center gap-1"
          >
            <button
              type="button"
              class="hover:bg-accent focus-visible:ring-ring flex min-w-0 flex-1 flex-col items-start rounded-md px-3 py-2 text-start outline-none focus-visible:ring-2"
              @click="controller.openConversation(conversation.id)"
            >
              <span class="w-full truncate text-sm font-medium">{{
                conversation.title || t('ai.title', {}, 'Copilot')
              }}</span>
              <span v-if="conversation.updatedAt" class="text-muted-foreground text-xs">{{
                format.relative(conversation.updatedAt)
              }}</span>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              :aria-label="t('ai.delete', {}, 'Delete conversation')"
              @click="controller.deleteConversation(conversation.id)"
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
          </li>
        </ul>
      </div>

      <div
        v-else
        class="flex-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        :aria-label="t('ai.messages', {}, 'Messages')"
        data-slot="ai-messages"
      >
        <div v-if="state.loading" class="flex justify-center p-6">
          <Spinner />
          <span class="sr-only">{{ t('ai.loading', {}, 'Loading') }}</span>
        </div>
        <div
          v-if="!state.loading && state.messages.length === 0"
          class="flex flex-col items-center gap-2 px-6 py-12 text-center"
          data-slot="ai-empty"
        >
          <SparklesIcon class="text-primary size-8" aria-hidden="true" />
          <p class="font-medium">{{ t('ai.empty_title', {}, 'How can I help?') }}</p>
          <p class="text-muted-foreground text-sm">
            {{
              t(
                'ai.empty_description',
                {},
                'Ask me to find or explain records, open pages or run actions. I always ask before changing anything.',
              )
            }}
          </p>
        </div>
        <div class="flex flex-col gap-4">
          <template v-for="message in state.messages" :key="message.id">
            <div
              v-if="message.role === 'user'"
              data-slot="ai-message"
              data-role="user"
              class="flex justify-end"
            >
              <p
                class="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-ee-sm px-3 py-2 text-sm whitespace-pre-wrap"
              >
                <span class="sr-only">{{ t('ai.you', {}, 'You') }}: </span>{{ message.content }}
              </p>
            </div>

            <p
              v-else-if="message.role === 'error'"
              data-slot="ai-message"
              data-role="error"
              role="alert"
              class="text-destructive flex items-start gap-2 text-sm"
            >
              <CircleAlertIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {{ message.content }}
            </p>

            <div
              v-else-if="message.role === 'navigation'"
              data-slot="ai-message"
              data-role="navigation"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                @click="message.url && router.visit(message.url)"
              >
                <ExternalLinkIcon class="rtl:-scale-x-100" aria-hidden="true" />
                {{ t('ai.open_link', {}, 'Open') }}: {{ message.content }}
              </Button>
            </div>

            <div
              v-else-if="message.role === 'action' && message.action"
              data-slot="ai-action-card"
              :data-status="message.action.status"
              class="bg-card rounded-lg border p-3 text-sm shadow-xs"
            >
              <p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {{ t('ai.proposed_action', {}, 'Proposed action') }}
              </p>
              <p class="mt-1 font-medium">
                {{ message.action.label
                }}<span v-if="message.action.record" class="text-muted-foreground font-normal">
                  · {{ message.action.record }}</span
                >
              </p>
              <p v-if="message.content" class="text-muted-foreground mt-1">{{ message.content }}</p>
              <dl
                v-if="message.action.inputs && message.action.inputs.length > 0"
                class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs"
              >
                <div v-for="(input, index) in message.action.inputs" :key="index" class="contents">
                  <dt class="text-muted-foreground">{{ input.label }}</dt>
                  <dd class="break-words">{{ String(input.value ?? '—') }}</dd>
                </div>
              </dl>
              <p v-if="message.action.error" class="text-destructive mt-2 text-xs">
                {{ message.action.error }}
              </p>
              <div class="mt-3 flex items-center gap-2">
                <template v-if="message.action.status === 'pending'">
                  <Button
                    type="button"
                    size="sm"
                    :disabled="state.deciding[message.id] !== undefined"
                    @click="controller.decide(message.id, 'confirm')"
                  >
                    <Spinner v-if="state.deciding[message.id] === 'confirm'" class="size-3" />
                    {{ t('ai.confirm', {}, 'Confirm') }}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    :disabled="state.deciding[message.id] !== undefined"
                    @click="controller.decide(message.id, 'reject')"
                  >
                    {{ t('ai.cancel', {}, 'Cancel') }}
                  </Button>
                  <span class="text-muted-foreground ms-auto text-xs">{{
                    t('ai.pending', {}, 'Waiting for your confirmation')
                  }}</span>
                </template>
                <Badge
                  v-else
                  :variant="
                    message.action.status === 'confirmed'
                      ? 'default'
                      : message.action.status === 'failed'
                        ? 'destructive'
                        : 'secondary'
                  "
                >
                  {{ statusLabel(message.action.status) }}
                </Badge>
              </div>
            </div>

            <div
              v-else
              data-slot="ai-message"
              data-role="assistant"
              :data-demo="message.demo ? '' : undefined"
              class="flex flex-col gap-2"
            >
              <Badge
                v-if="message.demo"
                variant="outline"
                class="self-start font-normal"
                data-ai-sample=""
              >
                {{ t('ai.sample', {}, "Sample answer — AI isn't configured") }}
              </Badge>
              <div
                v-if="message.activity && message.activity.length > 0"
                class="flex flex-wrap gap-1"
              >
                <Badge
                  v-for="(item, index) in message.activity"
                  :key="index"
                  variant="secondary"
                  class="font-normal"
                  >{{ item.label }}</Badge
                >
              </div>
              <div class="flex flex-col gap-2 text-sm leading-relaxed">
                <span class="sr-only">{{ t('ai.assistant', {}, 'Copilot') }}: </span>
                <template v-for="(block, index) in copilotBlocks(message.content)" :key="index">
                  <p v-if="block.type === 'p'" class="whitespace-pre-wrap">
                    {{ block.lines.join('\n') }}
                  </p>
                  <ol v-else-if="block.type === 'ol'" class="flex list-decimal flex-col gap-1 ps-5">
                    <li v-for="(line, item) in block.lines" :key="item">{{ line }}</li>
                  </ol>
                  <ul v-else class="flex list-disc flex-col gap-1 ps-5">
                    <li v-for="(line, item) in block.lines" :key="item">{{ line }}</li>
                  </ul>
                </template>
              </div>
              <p v-if="usage(message)" class="text-muted-foreground text-xs">
                {{ usage(message) }}
              </p>
            </div>
          </template>
          <div
            v-if="state.sending && state.streaming && state.streaming.text !== ''"
            class="bg-muted/60 rounded-lg px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap"
            data-slot="ai-streaming"
            aria-busy="true"
          >
            {{ state.streaming.text }}
          </div>
          <div
            v-if="state.sending"
            class="text-muted-foreground flex items-center gap-2 text-sm"
            data-slot="ai-thinking"
          >
            <Spinner class="size-4" />
            {{
              state.streaming
                ? t('ai.stream.writing', {}, 'Writing…')
                : t('ai.thinking', {}, 'Thinking…')
            }}
            <Button
              v-if="state.streaming"
              type="button"
              variant="ghost"
              size="sm"
              class="ms-auto"
              data-slot="ai-stream-stop"
              :aria-label="t('ai.stream.stop_label', {}, 'Stop writing the answer')"
              @click="controller.cancel()"
            >
              <SquareIcon aria-hidden="true" class="size-3.5" />
              {{ t('ai.stream.stop', {}, 'Stop') }}
            </Button>
          </div>
          <div class="sr-only" aria-live="polite" aria-atomic="true">
            {{ state.streaming?.announcement ?? '' }}
          </div>
        </div>
        <div ref="end" />
      </div>

      <form
        v-if="state.view === 'chat'"
        class="flex flex-col gap-2 border-t p-3"
        data-slot="ai-composer"
        @submit.prevent="controller.send()"
      >
        <p v-if="state.error" role="alert" class="text-destructive flex items-start gap-2 text-sm">
          <CircleAlertIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {{ state.error.message ?? t('ai.error', {}, 'Something went wrong. Try again.') }}
        </p>
        <div class="flex items-end gap-2">
          <Textarea
            :model-value="state.draft"
            :rows="2"
            :maxlength="4000"
            autofocus
            :placeholder="t('ai.placeholder', {}, 'Ask about your data…')"
            :aria-label="t('ai.placeholder', {}, 'Ask about your data…')"
            class="max-h-40 min-h-10 flex-1 resize-none"
            @update:model-value="(value: string) => controller.setDraft(value)"
            @keydown="onKeydown"
          />
          <Button
            type="submit"
            size="icon"
            :disabled="state.sending || state.draft.trim() === ''"
            :aria-label="t('ai.send', {}, 'Send')"
          >
            <ArrowUpIcon aria-hidden="true" />
          </Button>
        </div>
        <p v-if="totals" class="text-muted-foreground text-end text-xs" data-slot="ai-usage">
          {{ tokens(totals.inputTokens + totals.outputTokens)
          }}<template v-if="totals.cost !== undefined && currency">
            · {{ cost(totals.cost) }}</template
          >
        </p>
      </form>
    </SheetContent>
  </Sheet>
</template>
