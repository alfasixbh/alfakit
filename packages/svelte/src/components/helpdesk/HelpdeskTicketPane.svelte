<script lang="ts">
  import type { HelpdeskInboxController, HelpdeskTicket } from '@alfakit/core'
  import { helpdeskFileSize, presenceInitials } from '@alfakit/core'
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left'
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link'
  import LockIcon from '@lucide/svelte/icons/lock'
  import PaperclipIcon from '@lucide/svelte/icons/paperclip'
  import SendIcon from '@lucide/svelte/icons/send'
  import { tick, untrack } from 'svelte'
  import { useFormatter, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { cn } from '../../lib/utils'
  import ActionList from '../actions/ActionList.svelte'
  import RecordPresence from '../realtime/RecordPresence.svelte'
  import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
  import { Badge } from '../ui/badge'
  import { Button, buttonVariants } from '../ui/button'
  import { Spinner } from '../ui/spinner'
  import { Textarea } from '../ui/textarea'
  import HelpdeskBadge from './HelpdeskBadge.svelte'

  let {
    ticket,
    controller,
    token,
    actionComponent,
  }: {
    ticket: HelpdeskTicket
    controller: HelpdeskInboxController
    token: string
    actionComponent: string
  } = $props()

  const t = useT()
  const formatter = useFormatter()
  const inbox = useStore(untrack(() => controller.store))
  const id = $props.id()
  const composerId = `${id}-composer`
  const hintId = `${id}-hint`
  let messages = $state<HTMLOListElement | null>(null)
  let composer = $state<HTMLTextAreaElement | null>(null)

  const composerState = $derived(inbox.current.composer)

  /** Focus the composer (the `r` / `n` shortcuts). */
  export function focusComposer(): void {
    composer?.focus()
  }

  $effect(() => {
    void ticket.key
    void ticket.messages.length

    void tick().then(() => {
      if (messages) messages.scrollTop = messages.scrollHeight
    })
  })

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      void controller.send()
    }

    if (event.key === 'Escape') {
      ;(event.currentTarget as HTMLElement | null)?.blur()
    }
  }

  const fileSize = (bytes: number | null | undefined) =>
    helpdeskFileSize(bytes, (value) => formatter.current.number(value))
</script>

<header class="flex flex-col gap-2 border-b p-3">
  <div class="flex items-start gap-2">
    <Button
      variant="ghost"
      size="icon-sm"
      class="md:hidden"
      aria-label={t('helpdesk.back', {}, 'Back to the list')}
      onclick={() => void controller.select(null)}
    >
      <ArrowLeftIcon class="rtl:rotate-180" />
    </Button>
    <div class="min-w-0 flex-1">
      <h2 class="truncate text-base font-semibold">
        <span class="text-muted-foreground me-1.5 font-normal tabular-nums">{ticket.reference}</span
        >{ticket.subject}
      </h2>
      <p class="text-muted-foreground truncate text-xs">
        {ticket.requester.name}{#if ticket.requester.email}
          · {ticket.requester.email}{/if}
      </p>
    </div>
    {#if ticket.presence}
      <RecordPresence presence={ticket.presence} />
    {/if}
    {#if ticket.url}
      <a
        href={ticket.url}
        class={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
        aria-label={t('helpdesk.open_page', {}, 'Open the ticket page')}
        title={t('helpdesk.open_page', {}, 'Open the ticket page')}
      >
        <ExternalLinkIcon class="rtl:-scale-x-100" />
      </a>
    {/if}
  </div>
  <dl class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
    <div class="flex items-center gap-1">
      <dt class="sr-only">{t('helpdesk.status', {}, 'Status')}</dt>
      <dd><HelpdeskBadge badge={ticket.status} /></dd>
    </div>
    <div class="flex items-center gap-1">
      <dt class="sr-only">{t('helpdesk.priority', {}, 'Priority')}</dt>
      <dd><HelpdeskBadge badge={ticket.priority} /></dd>
    </div>
    <div class="flex items-center gap-1">
      <dt>{t('helpdesk.assignee', {}, 'Assignee')}:</dt>
      <dd class="text-foreground">
        {ticket.assignee?.name ?? t('helpdesk.unassigned', {}, 'Unassigned')}
      </dd>
    </div>
    {#if ticket.group}
      <div class="flex items-center gap-1">
        <dt>{t('helpdesk.group', {}, 'Group')}:</dt>
        <dd class="text-foreground">{ticket.group.name}</dd>
      </div>
    {/if}
    {#if ticket.sla.firstResponse}
      <div class="flex items-center gap-1">
        <dt>{t('helpdesk.first_response', {}, 'First response')}:</dt>
        <dd><HelpdeskBadge sla={ticket.sla.firstResponse} formatter={formatter.current} /></dd>
      </div>
    {/if}
    {#if ticket.sla.resolution}
      <div class="flex items-center gap-1">
        <dt>{t('helpdesk.resolution', {}, 'Resolution')}:</dt>
        <dd><HelpdeskBadge sla={ticket.sla.resolution} formatter={formatter.current} /></dd>
      </div>
    {/if}
    {#if ticket.satisfaction?.rating !== undefined}
      <div class="flex items-center gap-1">
        <dt>{t('helpdesk.satisfaction', {}, 'Satisfaction')}:</dt>
        <dd class="text-foreground">
          {t('helpdesk.rating', { rating: ticket.satisfaction.rating }, ':rating / 5')}
        </dd>
      </div>
    {/if}
    {#if ticket.tags?.length}
      <div class="flex items-center gap-1">
        <dt class="sr-only">{t('helpdesk.tags', {}, 'Tags')}</dt>
        <dd class="flex flex-wrap gap-1">
          {#each ticket.tags as tag (tag)}
            <Badge variant="secondary">{tag}</Badge>
          {/each}
        </dd>
      </div>
    {/if}
  </dl>
  {#if ticket.actions.length > 0}
    <div role="group" aria-label={t('helpdesk.actions', {}, 'Ticket actions')}>
      <ActionList
        actions={ticket.actions}
        context={{ token, component: actionComponent, record: ticket.key }}
        size="xs"
      />
    </div>
  {/if}
</header>

<ol
  bind:this={messages}
  aria-label={t('helpdesk.conversation', {}, 'Conversation')}
  class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
>
  {#each ticket.messages as message (message.key)}
    {#if message.kind === 'event'}
      <li
        data-slot="helpdesk-message"
        data-kind="event"
        class="text-muted-foreground flex items-center gap-2 self-center text-xs"
      >
        <span class="sr-only">{t('helpdesk.activity', {}, 'Activity')}:</span>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised on the server (Html::sanitize) -->
        <span class="[&_p]:inline">{@html message.html}</span>
        {#if message.createdAt}<time datetime={message.createdAt}
            >· {formatter.current.relative(message.createdAt)}</time
          >{/if}
      </li>
    {:else}
      <li
        data-slot="helpdesk-message"
        data-kind={message.kind}
        data-from={message.fromRequester ? 'requester' : 'agent'}
        class={cn(
          'flex max-w-[48rem] gap-2.5',
          !message.fromRequester && 'flex-row-reverse self-end text-start',
        )}
      >
        <Avatar class="size-8 shrink-0">
          {#if message.author.avatar}<AvatarImage src={message.author.avatar} alt="" />{/if}
          <AvatarFallback aria-hidden="true">{presenceInitials(message.author.name)}</AvatarFallback
          >
        </Avatar>
        <article
          class={cn(
            'min-w-0 rounded-lg border px-3 py-2',
            message.kind === 'note'
              ? 'border-warning/40 bg-warning/10'
              : message.fromRequester
                ? 'bg-muted/50'
                : 'bg-primary/5 border-primary/20',
          )}
        >
          <header class="mb-1 flex flex-wrap items-center gap-x-2 text-xs">
            <span class="font-medium">{message.author.name}</span>
            {#if message.kind === 'note'}
              <span class="text-warning inline-flex items-center gap-1 font-medium">
                <LockIcon class="size-3" aria-hidden="true" />
                {t('helpdesk.internal', {}, 'Internal note')}
              </span>
            {/if}
            {#if message.createdAt}
              <time
                datetime={message.createdAt}
                title={formatter.current.dateTime(message.createdAt)}
                class="text-muted-foreground">{formatter.current.relative(message.createdAt)}</time
              >
            {/if}
          </header>
          <div class="prose prose-sm dark:prose-invert max-w-none break-words">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised on the server (Html::sanitize) -->
            {@html message.html}
          </div>
          {#if message.attachments?.length}
            <ul
              aria-label={t('helpdesk.attachments', {}, 'Attachments')}
              class="mt-2 flex flex-wrap gap-1.5"
            >
              {#each message.attachments as file, index (index)}
                <li>
                  {#if file.url}
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener"
                      class="hover:bg-muted inline-flex items-center gap-1 rounded border px-2 py-1 text-xs"
                    >
                      <PaperclipIcon class="size-3" aria-hidden="true" />
                      {file.name}
                      {#if fileSize(file.size)}<span class="text-muted-foreground"
                          >({fileSize(file.size)})</span
                        >{/if}
                    </a>
                  {:else}
                    <span class="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs"
                      >{file.name}</span
                    >
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </article>
      </li>
    {/if}
  {/each}
</ol>

{#if ticket.merged}
  <p class="text-muted-foreground border-t p-3 text-sm">
    {t('helpdesk.merged', {}, 'This ticket was merged into another one.')}
  </p>
{/if}

{#if ticket.canReply}
  <form
    data-slot="helpdesk-composer"
    data-mode={composerState.mode}
    class="data-[mode=note]:bg-warning/5 flex flex-col gap-2 border-t p-3"
    onsubmit={(event) => {
      event.preventDefault()
      void controller.send()
    }}
  >
    <div class="flex items-center justify-between gap-2">
      <div
        role="radiogroup"
        aria-label={t('helpdesk.mode', {}, 'Message type')}
        class="bg-muted inline-flex rounded-md p-0.5"
      >
        {#each ['reply', 'note'] as const as mode (mode)}
          <button
            type="button"
            role="radio"
            aria-checked={composerState.mode === mode}
            class="aria-checked:bg-background aria-checked:text-foreground text-muted-foreground rounded px-2.5 py-1 text-xs font-medium aria-checked:shadow-xs"
            onclick={() => controller.setMode(mode)}
          >
            {mode === 'reply'
              ? t('helpdesk.mode_reply', {}, 'Reply')
              : t('helpdesk.mode_note', {}, 'Internal note')}
          </button>
        {/each}
      </div>
      {#if inbox.current.requesterTyping}
        <p class="text-muted-foreground animate-pulse text-xs" role="status">
          {t('helpdesk.requester_typing', { name: ticket.requester.name }, ':name is typing…')}
        </p>
      {/if}
    </div>
    <label for={composerId} class="sr-only">
      {composerState.mode === 'note'
        ? t('helpdesk.mode_note', {}, 'Internal note')
        : t('helpdesk.mode_reply', {}, 'Reply')}
    </label>
    <Textarea
      bind:ref={composer}
      id={composerId}
      rows={3}
      value={composerState.text}
      oninput={(event) => controller.setText(event.currentTarget.value)}
      onkeydown={onKeyDown}
      aria-describedby={hintId}
      aria-invalid={composerState.error ? true : undefined}
      placeholder={composerState.mode === 'note'
        ? t('helpdesk.note_placeholder', {}, 'Add a note only agents can see…')
        : t('helpdesk.reply_placeholder', { name: ticket.requester.name }, 'Reply to :name…')}
      class="max-h-48 min-h-20 resize-y"
    />
    {#if composerState.error}
      <p role="alert" class="text-destructive text-xs">{composerState.error}</p>
    {/if}
    <div class="flex items-center justify-between gap-2">
      <p id={hintId} class="text-muted-foreground text-xs max-sm:hidden">
        {t('helpdesk.send_hint', {}, 'Enter to send, Shift+Enter for a new line')}
      </p>
      <Button
        type="submit"
        size="sm"
        class="ms-auto"
        variant={composerState.mode === 'note' ? 'secondary' : 'default'}
        disabled={composerState.sending || composerState.text.trim() === ''}
      >
        {#if composerState.sending}<Spinner />{:else}<SendIcon class="rtl:-scale-x-100" />{/if}
        {composerState.sending
          ? t('helpdesk.sending', {}, 'Sending…')
          : composerState.mode === 'note'
            ? t('helpdesk.add_note', {}, 'Add note')
            : t('helpdesk.send', {}, 'Send')}
      </Button>
    </div>
  </form>
{/if}
