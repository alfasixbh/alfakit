import type { HelpdeskChatClient } from '@alfakit/core'
import { SendIcon, XIcon } from 'lucide-react'
import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { useStore } from '../../hooks/use-store'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Spinner } from '../ui/spinner'
import { Textarea } from '../ui/textarea'

/**
 * The open live chat: the conversation (a polite live log), the visitor's contact details
 * before the first message, and the composer. Texts come from the server.
 */
export interface HelpdeskChatPanelProps {
  client: HelpdeskChatClient
  onClose: () => void
  className?: string
}

export function HelpdeskChatPanel({ client, onClose, className }: HelpdeskChatPanelProps) {
  const state = useStore(client.store)
  const titleId = useId()
  const composerId = useId()
  const emailHintId = useId()
  const logRef = useRef<HTMLOListElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const t = (key: string, fallback: string, replacements: Record<string, string> = {}) =>
    client.t(key, fallback, replacements)
  const conversation = state.conversation
  const started = Boolean(conversation?.key)
  const closed = Boolean(conversation?.closed)
  const config = state.config

  useEffect(() => {
    composerRef.current?.focus()
  }, [])

  useEffect(() => {
    const element = logRef.current

    if (element) element.scrollTop = element.scrollHeight
  }, [conversation?.messages.length, conversation?.agentTyping])

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void client.send()
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      data-slot="helpdesk-chat"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onClose()
        }
      }}
      className={cn(
        'bg-background text-foreground flex h-[min(36rem,calc(100svh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border shadow-xl',
        className,
      )}
    >
      <header className="bg-primary text-primary-foreground flex items-start gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-sm font-semibold">
            {t('title', 'Chat with us')}
          </h2>
          <p className="text-xs opacity-80">
            {t('subtitle', 'We usually reply in a few minutes.')}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label={t('close', 'Close chat')}
          className="hover:bg-primary-foreground/10 text-primary-foreground hover:text-primary-foreground -me-2"
        >
          <XIcon />
        </Button>
      </header>

      <ol
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label={t('messages', 'Messages')}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3"
      >
        {state.status === 'loading' && !config ? (
          <li className="m-auto">
            <Spinner />
          </li>
        ) : (
          <>
            {config?.greeting && (
              <li
                data-from="agent"
                className="bg-muted max-w-[85%] self-start rounded-2xl rounded-ss-sm px-3 py-2 text-sm"
              >
                {config.greeting}
              </li>
            )}
            {conversation?.messages.map((message) => (
              <li
                key={message.key}
                data-from={message.from}
                className={cn(
                  'flex max-w-[85%] flex-col gap-0.5',
                  message.from === 'visitor' ? 'items-end self-end' : 'items-start self-start',
                )}
              >
                <span className="text-muted-foreground px-1 text-xs">{message.name}</span>
                <div
                  className={cn(
                    'prose prose-sm dark:prose-invert max-w-none rounded-2xl px-3 py-2 break-words [&_p]:my-0',
                    message.from === 'visitor'
                      ? 'bg-primary text-primary-foreground prose-a:text-primary-foreground rounded-se-sm'
                      : 'bg-muted rounded-ss-sm',
                  )}
                  dangerouslySetInnerHTML={{ __html: message.html }}
                />
              </li>
            ))}
            {conversation?.agentTyping && (
              <li
                role="status"
                className="text-muted-foreground animate-pulse self-start px-1 text-xs"
              >
                {t('typing', ':name is typing…', { name: conversation.agentTyping })}
              </li>
            )}
          </>
        )}
      </ol>

      {closed ? (
        <div className="flex flex-col items-center gap-2 border-t p-3 text-center text-sm">
          <p className="text-muted-foreground">{t('closed', 'This chat has ended.')}</p>
          <Button type="button" size="sm" onClick={() => void client.startNew()}>
            {t('new_chat', 'Start a new chat')}
          </Button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-2 border-t p-3"
          onSubmit={(event) => {
            event.preventDefault()
            void client.send()
          }}
        >
          {!started && config?.askContact && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={state.name}
                onChange={(event) => client.setContact({ name: event.target.value })}
                placeholder={t('name', 'Your name')}
                aria-label={t('name', 'Your name')}
                autoComplete="name"
                maxLength={255}
              />
              <Input
                type="email"
                value={state.email}
                onChange={(event) => client.setContact({ email: event.target.value })}
                placeholder={t('email', 'Your email')}
                aria-label={t('email', 'Your email')}
                aria-describedby={emailHintId}
                autoComplete="email"
                required={config.requireEmail}
                maxLength={255}
              />
              <p id={emailHintId} className="sr-only">
                {t('email_hint', 'So we can follow up if you leave.')}
              </p>
              {/* People never see or fill this; bots that fill every input do. */}
              <input
                type="text"
                name={config.honeypot}
                value={state.trap}
                onChange={(event) => client.setContact({ trap: event.target.value })}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -start-[10000px] size-px overflow-hidden"
              />
            </div>
          )}
          <label htmlFor={composerId} className="sr-only">
            {t('message', 'Message')}
          </label>
          <div className="flex items-end gap-2">
            <Textarea
              ref={composerRef}
              id={composerId}
              rows={1}
              value={state.draft}
              maxLength={config?.maxLength}
              onChange={(event) => client.setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('placeholder', 'Write a message…')}
              aria-invalid={state.error ? true : undefined}
              className="max-h-32 min-h-10 flex-1 resize-none"
            />
            <Button
              type="submit"
              size="icon"
              disabled={state.sending || state.draft.trim() === ''}
              aria-label={
                state.sending
                  ? t('sending', 'Sending…')
                  : started
                    ? t('send', 'Send')
                    : t('start', 'Start chat')
              }
            >
              {state.sending ? <Spinner /> : <SendIcon className="rtl:-scale-x-100" />}
            </Button>
          </div>
          {state.error && (
            <p role="alert" className="text-destructive text-xs">
              {state.error}
            </p>
          )}
          {config?.contactUrl && !started && (
            <a
              href={config.contactUrl}
              className="text-muted-foreground self-center text-xs underline-offset-4 hover:underline"
            >
              {t('contact', 'Prefer email? Contact us')}
            </a>
          )}
        </form>
      )}
      {config?.poweredBy && (
        <div className="shrink-0" dangerouslySetInnerHTML={{ __html: config.poweredBy }} />
      )}
    </div>
  )
}
