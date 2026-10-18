<script lang="ts">
  import type { HelpdeskChatClient } from '@alfakit/core'
  import SendIcon from '@lucide/svelte/icons/send'
  import XIcon from '@lucide/svelte/icons/x'
  import { onMount, tick, untrack } from 'svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { cn } from '../../lib/utils'
  import { Button } from '../ui/button'
  import { Input } from '../ui/input'
  import { Spinner } from '../ui/spinner'
  import { Textarea } from '../ui/textarea'

  /**
   * The open live chat: the conversation (a polite live log), the visitor's contact details
   * before the first message, and the composer. Texts come from the server.
   */
  let { client, onclose }: { client: HelpdeskChatClient; onclose: () => void } = $props()

  const chat = useStore(untrack(() => client.store))
  const id = $props.id()
  const titleId = `${id}-title`
  const composerId = `${id}-composer`
  const emailHintId = `${id}-email`
  let log = $state<HTMLOListElement | null>(null)
  let composer = $state<HTMLTextAreaElement | null>(null)

  const t = (key: string, fallback: string, replacements: Record<string, string> = {}) =>
    client.t(key, fallback, replacements)

  const ui = $derived(chat.current)
  const conversation = $derived(ui.conversation)
  const started = $derived(Boolean(conversation?.key))
  const closed = $derived(Boolean(conversation?.closed))

  onMount(() => composer?.focus())

  $effect(() => {
    void conversation?.messages.length
    void conversation?.agentTyping

    void tick().then(() => {
      if (log) log.scrollTop = log.scrollHeight
    })
  })

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      void client.send()
    }
  }
</script>

<div
  role="dialog"
  aria-modal="false"
  aria-labelledby={titleId}
  tabindex="-1"
  data-slot="helpdesk-chat"
  class="bg-background text-foreground flex h-[min(36rem,calc(100svh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border shadow-xl"
  onkeydown={(event) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onclose()
    }
  }}
>
  <header class="bg-primary text-primary-foreground flex items-start gap-2 px-4 py-3">
    <div class="min-w-0 flex-1">
      <h2 id={titleId} class="text-sm font-semibold">{t('title', 'Chat with us')}</h2>
      <p class="text-xs opacity-80">{t('subtitle', 'We usually reply in a few minutes.')}</p>
    </div>
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={t('close', 'Close chat')}
      class="hover:bg-primary-foreground/10 text-primary-foreground hover:text-primary-foreground -me-2"
      onclick={onclose}
    >
      <XIcon />
    </Button>
  </header>

  <ol
    bind:this={log}
    role="log"
    aria-live="polite"
    aria-label={t('messages', 'Messages')}
    class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3"
  >
    {#if ui.status === 'loading' && !ui.config}
      <li class="m-auto"><Spinner /></li>
    {:else}
      {#if ui.config?.greeting}
        <li
          data-from="agent"
          class="bg-muted max-w-[85%] self-start rounded-2xl rounded-ss-sm px-3 py-2 text-sm"
        >
          {ui.config.greeting}
        </li>
      {/if}
      {#each conversation?.messages ?? [] as message (message.key)}
        <li
          data-from={message.from}
          class={cn(
            'flex max-w-[85%] flex-col gap-0.5',
            message.from === 'visitor' ? 'items-end self-end' : 'items-start self-start',
          )}
        >
          <span class="text-muted-foreground px-1 text-xs">{message.name}</span>
          <div
            class={cn(
              'prose prose-sm dark:prose-invert max-w-none rounded-2xl px-3 py-2 break-words [&_p]:my-0',
              message.from === 'visitor'
                ? 'bg-primary text-primary-foreground prose-a:text-primary-foreground rounded-se-sm'
                : 'bg-muted rounded-ss-sm',
            )}
          >
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised on the server (Html::sanitize) -->
            {@html message.html}
          </div>
        </li>
      {/each}
      {#if conversation?.agentTyping}
        <li role="status" class="text-muted-foreground animate-pulse self-start px-1 text-xs">
          {t('typing', ':name is typing…', { name: conversation.agentTyping })}
        </li>
      {/if}
    {/if}
  </ol>

  {#if closed}
    <div class="flex flex-col items-center gap-2 border-t p-3 text-center text-sm">
      <p class="text-muted-foreground">{t('closed', 'This chat has ended.')}</p>
      <Button type="button" size="sm" onclick={() => void client.startNew()}
        >{t('new_chat', 'Start a new chat')}</Button
      >
    </div>
  {:else}
    <form
      class="flex flex-col gap-2 border-t p-3"
      onsubmit={(event) => {
        event.preventDefault()
        void client.send()
      }}
    >
      {#if !started && ui.config?.askContact}
        <div class="grid grid-cols-2 gap-2">
          <Input
            value={ui.name}
            oninput={(event) => client.setContact({ name: event.currentTarget.value })}
            placeholder={t('name', 'Your name')}
            aria-label={t('name', 'Your name')}
            autocomplete="name"
            maxlength={255}
          />
          <Input
            type="email"
            value={ui.email}
            oninput={(event) => client.setContact({ email: event.currentTarget.value })}
            placeholder={t('email', 'Your email')}
            aria-label={t('email', 'Your email')}
            aria-describedby={emailHintId}
            autocomplete="email"
            required={ui.config.requireEmail}
            maxlength={255}
          />
          <p id={emailHintId} class="sr-only">
            {t('email_hint', 'So we can follow up if you leave.')}
          </p>
          <!-- People never see or fill this; bots that fill every input do. -->
          <input
            type="text"
            name={ui.config.honeypot}
            value={ui.trap}
            oninput={(event) => client.setContact({ trap: event.currentTarget.value })}
            tabindex="-1"
            autocomplete="off"
            aria-hidden="true"
            class="absolute -start-[10000px] size-px overflow-hidden"
          />
        </div>
      {/if}
      <label for={composerId} class="sr-only">{t('message', 'Message')}</label>
      <div class="flex items-end gap-2">
        <Textarea
          bind:ref={composer}
          id={composerId}
          rows={1}
          value={ui.draft}
          maxlength={ui.config?.maxLength}
          oninput={(event) => client.setDraft(event.currentTarget.value)}
          onkeydown={onKeyDown}
          placeholder={t('placeholder', 'Write a message…')}
          aria-invalid={ui.error ? true : undefined}
          class="max-h-32 min-h-10 flex-1 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={ui.sending || ui.draft.trim() === ''}
          aria-label={ui.sending
            ? t('sending', 'Sending…')
            : started
              ? t('send', 'Send')
              : t('start', 'Start chat')}
        >
          {#if ui.sending}<Spinner />{:else}<SendIcon class="rtl:-scale-x-100" />{/if}
        </Button>
      </div>
      {#if ui.error}
        <p role="alert" class="text-destructive text-xs">{ui.error}</p>
      {/if}
      {#if ui.config?.contactUrl && !started}
        <a
          href={ui.config.contactUrl}
          class="text-muted-foreground self-center text-xs underline-offset-4 hover:underline"
          >{t('contact', 'Prefer email? Contact us')}</a
        >
      {/if}
    </form>
  {/if}
  {#if ui.config?.poweredBy}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- built on the server (Credit::poweredBy) -->
    <div class="shrink-0">{@html ui.config.poweredBy}</div>
  {/if}
</div>
