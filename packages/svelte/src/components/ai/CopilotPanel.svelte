<script lang="ts">
  import {
    type AiMessageSchema,
    type CopilotController,
    type CopilotState,
    copilotBlocks,
  } from '@alfakit/core'
  import { router } from '@inertiajs/svelte'
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up'
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert'
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link'
  import HistoryIcon from '@lucide/svelte/icons/history'
  import InfoIcon from '@lucide/svelte/icons/info'
  import MessageSquarePlusIcon from '@lucide/svelte/icons/message-square-plus'
  import SparklesIcon from '@lucide/svelte/icons/sparkles'
  import SquareIcon from '@lucide/svelte/icons/square'
  import Trash2Icon from '@lucide/svelte/icons/trash-2'
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
  import { onDestroy, tick, untrack } from 'svelte'
  import { useDirection, useFormatter, useT } from '../../context.svelte'
  import { Badge } from '../ui/badge'
  import { Button } from '../ui/button'
  import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet'
  import { Spinner } from '../ui/spinner'
  import { Textarea } from '../ui/textarea'

  let { controller }: { controller: CopilotController } = $props()
  const t = useT()
  const direction = $derived(useDirection())
  const format = useFormatter()
  const copilot = untrack(() => controller)
  let chat = $state<CopilotState>(copilot.state)
  let end = $state<HTMLElement | null>(null)
  const currency = copilot.schema.currency
  const notice = copilot.schema.notice

  const unsubscribe = copilot.subscribe((next) => (chat = next))
  onDestroy(unsubscribe)

  const totals = $derived(copilot.totals(chat.messages))
  const title = $derived(
    chat.view === 'history'
      ? t('ai.history', {}, 'Conversations')
      : chat.conversation?.title || t('ai.title', {}, 'Copilot'),
  )

  $effect(() => {
    void chat.messages.length
    void chat.sending
    void chat.streaming?.text
    void tick().then(() => end?.scrollIntoView?.({ block: 'end' }))
  })

  function tokens(count: number): string {
    return t('ai.tokens', { count: format.current.number(count) }, ':count tokens')
  }

  function cost(value: number): string {
    return t(
      'ai.cost',
      { cost: format.current.money(value, currency, { maximumFractionDigits: 4 }) },
      '≈ :cost',
    )
  }

  function usage(message: AiMessageSchema): string | null {
    if (!message.usage) return null

    const parts = [tokens(message.usage.inputTokens + message.usage.outputTokens)]

    if (message.usage.cost !== undefined && currency) parts.push(cost(message.usage.cost))

    return parts.join(' · ')
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      void copilot.send()
    }
  }

  function statusLabel(status: string): string {
    if (status === 'confirmed') return t('ai.confirmed', {}, 'Done')
    if (status === 'failed') return t('ai.failed', {}, 'Failed')

    return t('ai.rejected', {}, 'Cancelled')
  }
</script>

<Sheet open={chat.open} onOpenChange={(open) => copilot.setOpen(open)}>
  <SheetContent
    side={direction === 'rtl' ? 'left' : 'right'}
    data-slot="ai-copilot-panel"
    class="flex w-full flex-col gap-0 p-0 sm:max-w-md"
  >
    <SheetHeader class="border-b pe-12">
      <div class="flex items-center gap-2">
        <SparklesIcon class="text-primary size-4" aria-hidden="true" />
        <SheetTitle class="flex-1 truncate">{title}</SheetTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={chat.view === 'history'
            ? t('ai.back', {}, 'Back to the conversation')
            : t('ai.history', {}, 'Conversations')}
          aria-pressed={chat.view === 'history'}
          onclick={() =>
            chat.view === 'history' ? copilot.showChat() : void copilot.showHistory()}
        >
          <HistoryIcon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('ai.new', {}, 'New conversation')}
          onclick={() => copilot.newConversation()}
        >
          <MessageSquarePlusIcon aria-hidden="true" />
        </Button>
      </div>
      <SheetDescription class="text-xs" data-slot="ai-disclaimer">
        {t('ai.disclaimer', {}, 'AI can make mistakes. Check important information.')}
      </SheetDescription>
    </SheetHeader>

    {#if notice}
      <div
        role="status"
        data-slot="ai-notice"
        data-status={notice.status}
        class="bg-muted/50 flex items-start gap-2 border-b px-4 py-3 text-sm"
      >
        {#if notice.status === 'warning'}
          <TriangleAlertIcon class="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {:else}
          <InfoIcon class="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {/if}
        <div class="flex min-w-0 flex-col gap-0.5">
          <p class="font-medium">{notice.heading}</p>
          {#if notice.description}
            <p class="text-muted-foreground break-words">{notice.description}</p>
          {/if}
        </div>
      </div>
    {/if}

    {#if chat.view === 'history'}
      <div class="flex-1 overflow-y-auto p-2" data-slot="ai-history">
        {#if chat.loading}
          <div class="flex justify-center p-6">
            <Spinner />
            <span class="sr-only">{t('ai.loading', {}, 'Loading')}</span>
          </div>
        {:else if chat.conversations.length === 0}
          <p class="text-muted-foreground p-6 text-center text-sm">
            {t('ai.no_conversations', {}, 'No conversations yet.')}
          </p>
        {:else}
          <ul class="flex flex-col gap-1">
            {#each chat.conversations as conversation (conversation.id)}
              <li class="group flex items-center gap-1">
                <button
                  type="button"
                  class="hover:bg-accent focus-visible:ring-ring flex min-w-0 flex-1 flex-col items-start rounded-md px-3 py-2 text-start outline-none focus-visible:ring-2"
                  onclick={() => void copilot.openConversation(conversation.id)}
                >
                  <span class="w-full truncate text-sm font-medium"
                    >{conversation.title || t('ai.title', {}, 'Copilot')}</span
                  >
                  {#if conversation.updatedAt}
                    <span class="text-muted-foreground text-xs"
                      >{format.current.relative(conversation.updatedAt)}</span
                    >
                  {/if}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('ai.delete', {}, 'Delete conversation')}
                  onclick={() => void copilot.deleteConversation(conversation.id)}
                >
                  <Trash2Icon aria-hidden="true" />
                </Button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {:else}
      <div
        class="flex-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-label={t('ai.messages', {}, 'Messages')}
        data-slot="ai-messages"
      >
        {#if chat.loading}
          <div class="flex justify-center p-6">
            <Spinner />
            <span class="sr-only">{t('ai.loading', {}, 'Loading')}</span>
          </div>
        {:else if chat.messages.length === 0}
          <div class="flex flex-col items-center gap-2 px-6 py-12 text-center" data-slot="ai-empty">
            <SparklesIcon class="text-primary size-8" aria-hidden="true" />
            <p class="font-medium">{t('ai.empty_title', {}, 'How can I help?')}</p>
            <p class="text-muted-foreground text-sm">
              {t(
                'ai.empty_description',
                {},
                'Ask me to find or explain records, open pages or run actions. I always ask before changing anything.',
              )}
            </p>
          </div>
        {/if}
        <div class="flex flex-col gap-4">
          {#each chat.messages as message (message.id)}
            {#if message.role === 'user'}
              <div data-slot="ai-message" data-role="user" class="flex justify-end">
                <p
                  class="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-ee-sm px-3 py-2 text-sm whitespace-pre-wrap"
                >
                  <span class="sr-only">{t('ai.you', {}, 'You')}: </span>{message.content}
                </p>
              </div>
            {:else if message.role === 'error'}
              <p
                data-slot="ai-message"
                data-role="error"
                role="alert"
                class="text-destructive flex items-start gap-2 text-sm"
              >
                <CircleAlertIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {message.content}
              </p>
            {:else if message.role === 'navigation'}
              <div data-slot="ai-message" data-role="navigation">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onclick={() => message.url && router.visit(message.url)}
                >
                  <ExternalLinkIcon class="rtl:-scale-x-100" aria-hidden="true" />
                  {t('ai.open_link', {}, 'Open')}: {message.content}
                </Button>
              </div>
            {:else if message.role === 'action' && message.action}
              {@const action = message.action}
              <div
                data-slot="ai-action-card"
                data-status={action.status}
                class="bg-card rounded-lg border p-3 text-sm shadow-xs"
              >
                <p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {t('ai.proposed_action', {}, 'Proposed action')}
                </p>
                <p class="mt-1 font-medium">
                  {action.label}{#if action.record}<span class="text-muted-foreground font-normal">
                      · {action.record}</span
                    >{/if}
                </p>
                {#if message.content}
                  <p class="text-muted-foreground mt-1">{message.content}</p>
                {/if}
                {#if action.inputs && action.inputs.length > 0}
                  <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    {#each action.inputs as input, index (index)}
                      <div class="contents">
                        <dt class="text-muted-foreground">{input.label}</dt>
                        <dd class="break-words">{String(input.value ?? '—')}</dd>
                      </div>
                    {/each}
                  </dl>
                {/if}
                {#if action.error}
                  <p class="text-destructive mt-2 text-xs">{action.error}</p>
                {/if}
                <div class="mt-3 flex items-center gap-2">
                  {#if action.status === 'pending'}
                    <Button
                      type="button"
                      size="sm"
                      disabled={chat.deciding[message.id] !== undefined}
                      onclick={() => void copilot.decide(message.id, 'confirm')}
                    >
                      {#if chat.deciding[message.id] === 'confirm'}<Spinner class="size-3" />{/if}
                      {t('ai.confirm', {}, 'Confirm')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={chat.deciding[message.id] !== undefined}
                      onclick={() => void copilot.decide(message.id, 'reject')}
                    >
                      {t('ai.cancel', {}, 'Cancel')}
                    </Button>
                    <span class="text-muted-foreground ms-auto text-xs"
                      >{t('ai.pending', {}, 'Waiting for your confirmation')}</span
                    >
                  {:else}
                    <Badge
                      variant={action.status === 'confirmed'
                        ? 'default'
                        : action.status === 'failed'
                          ? 'destructive'
                          : 'secondary'}
                    >
                      {statusLabel(action.status)}
                    </Badge>
                  {/if}
                </div>
              </div>
            {:else}
              <div
                data-slot="ai-message"
                data-role="assistant"
                data-demo={message.demo ? '' : undefined}
                class="flex flex-col gap-2"
              >
                {#if message.demo}
                  <Badge variant="outline" class="self-start font-normal" data-ai-sample="">
                    {t('ai.sample', {}, "Sample answer — AI isn't configured")}
                  </Badge>
                {/if}
                {#if message.activity && message.activity.length > 0}
                  <div class="flex flex-wrap gap-1">
                    {#each message.activity as item, index (index)}
                      <Badge variant="secondary" class="font-normal">{item.label}</Badge>
                    {/each}
                  </div>
                {/if}
                <div class="flex flex-col gap-2 text-sm leading-relaxed">
                  <span class="sr-only">{t('ai.assistant', {}, 'Copilot')}: </span>
                  {#each copilotBlocks(message.content) as block, index (index)}
                    {#if block.type === 'p'}
                      <p class="whitespace-pre-wrap">{block.lines.join('\n')}</p>
                    {:else if block.type === 'ol'}
                      <ol class="flex list-decimal flex-col gap-1 ps-5">
                        {#each block.lines as line, item (item)}<li>{line}</li>{/each}
                      </ol>
                    {:else}
                      <ul class="flex list-disc flex-col gap-1 ps-5">
                        {#each block.lines as line, item (item)}<li>{line}</li>{/each}
                      </ul>
                    {/if}
                  {/each}
                </div>
                {#if usage(message)}
                  <p class="text-muted-foreground text-xs">{usage(message)}</p>
                {/if}
              </div>
            {/if}
          {/each}
          {#if chat.sending && chat.streaming && chat.streaming.text !== ''}
            <div
              class="bg-muted/60 rounded-lg px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap"
              data-slot="ai-streaming"
              aria-busy="true"
            >
              {chat.streaming.text}
            </div>
          {/if}
          {#if chat.sending}
            <div
              class="text-muted-foreground flex items-center gap-2 text-sm"
              data-slot="ai-thinking"
            >
              <Spinner class="size-4" />
              {chat.streaming
                ? t('ai.stream.writing', {}, 'Writing…')
                : t('ai.thinking', {}, 'Thinking…')}
              {#if chat.streaming}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="ms-auto"
                  data-slot="ai-stream-stop"
                  aria-label={t('ai.stream.stop_label', {}, 'Stop writing the answer')}
                  onclick={() => copilot.cancel()}
                >
                  <SquareIcon aria-hidden="true" class="size-3.5" />
                  {t('ai.stream.stop', {}, 'Stop')}
                </Button>
              {/if}
            </div>
          {/if}
          <div class="sr-only" aria-live="polite" aria-atomic="true">
            {chat.streaming?.announcement ?? ''}
          </div>
        </div>
        <div bind:this={end}></div>
      </div>
    {/if}

    {#if chat.view === 'chat'}
      <form
        class="flex flex-col gap-2 border-t p-3"
        data-slot="ai-composer"
        onsubmit={(event) => {
          event.preventDefault()
          void copilot.send()
        }}
      >
        {#if chat.error}
          <p role="alert" class="text-destructive flex items-start gap-2 text-sm">
            <CircleAlertIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {chat.error.message ?? t('ai.error', {}, 'Something went wrong. Try again.')}
          </p>
        {/if}
        <div class="flex items-end gap-2">
          <Textarea
            value={chat.draft}
            rows={2}
            maxlength={4000}
            placeholder={t('ai.placeholder', {}, 'Ask about your data…')}
            aria-label={t('ai.placeholder', {}, 'Ask about your data…')}
            class="max-h-40 min-h-10 flex-1 resize-none"
            oninput={(event) => copilot.setDraft(event.currentTarget.value)}
            {onkeydown}
          />
          <Button
            type="submit"
            size="icon"
            disabled={chat.sending || chat.draft.trim() === ''}
            aria-label={t('ai.send', {}, 'Send')}
          >
            <ArrowUpIcon aria-hidden="true" />
          </Button>
        </div>
        {#if totals}
          <p class="text-muted-foreground text-end text-xs" data-slot="ai-usage">
            {tokens(
              totals.inputTokens + totals.outputTokens,
            )}{#if totals.cost !== undefined && currency}&nbsp;·&nbsp;{cost(totals.cost)}{/if}
          </p>
        {/if}
      </form>
    {/if}
  </SheetContent>
</Sheet>
