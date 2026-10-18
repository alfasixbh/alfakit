import {
  type AiMessageSchema,
  type AiSetupNoticeSchema,
  type CopilotController,
  copilotBlocks,
} from '@alfakit/core'
import { router } from '@inertiajs/react'
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
} from 'lucide-react'
import { type KeyboardEvent, useEffect, useRef } from 'react'
import { useDirection, useFormatter, useT } from '../../context'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet'
import { Spinner } from '../ui/spinner'
import { Textarea } from '../ui/textarea'
import { useCopilotState } from './copilot'

export function CopilotPanel({ controller }: { controller: CopilotController }) {
  const t = useT()
  const direction = useDirection()
  const format = useFormatter()
  const state = useCopilotState(controller)
  const end = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const totals = controller.totals()
  const currency = controller.schema.currency

  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' })
  }, [state.messages.length, state.sending, state.streaming?.text])

  useEffect(() => {
    if (state.open && state.view === 'chat') input.current?.focus()
  }, [state.open, state.view])

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void controller.send()
    }
  }

  const usage = (message: AiMessageSchema) =>
    message.usage
      ? [
          t(
            'ai.tokens',
            { count: format.number(message.usage.inputTokens + message.usage.outputTokens) },
            ':count tokens',
          ),
          message.usage.cost !== undefined && currency
            ? t(
                'ai.cost',
                { cost: format.money(message.usage.cost, currency, { maximumFractionDigits: 4 }) },
                '≈ :cost',
              )
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null

  return (
    <Sheet open={state.open} onOpenChange={(open) => controller.setOpen(open)}>
      <SheetContent
        side={direction === 'rtl' ? 'left' : 'right'}
        data-slot="ai-copilot-panel"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b pe-12">
          <div className="flex items-center gap-2">
            <SparklesIcon className="text-primary size-4" aria-hidden="true" />
            <SheetTitle className="flex-1 truncate">
              {state.view === 'history'
                ? t('ai.history', {}, 'Conversations')
                : state.conversation?.title || t('ai.title', {}, 'Copilot')}
            </SheetTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={
                state.view === 'history'
                  ? t('ai.back', {}, 'Back to the conversation')
                  : t('ai.history', {}, 'Conversations')
              }
              aria-pressed={state.view === 'history'}
              onClick={() =>
                state.view === 'history' ? controller.showChat() : void controller.showHistory()
              }
            >
              <HistoryIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('ai.new', {}, 'New conversation')}
              onClick={() => controller.newConversation()}
            >
              <MessageSquarePlusIcon aria-hidden="true" />
            </Button>
          </div>
          <SheetDescription className="text-xs" data-slot="ai-disclaimer">
            {t('ai.disclaimer', {}, 'AI can make mistakes. Check important information.')}
          </SheetDescription>
        </SheetHeader>

        {controller.schema.notice && <CopilotNotice notice={controller.schema.notice} />}

        {state.view === 'history' ? (
          <div className="flex-1 overflow-y-auto p-2" data-slot="ai-history">
            {state.loading ? (
              <div className="flex justify-center p-6">
                <Spinner />
                <span className="sr-only">{t('ai.loading', {}, 'Loading')}</span>
              </div>
            ) : state.conversations.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-sm">
                {t('ai.no_conversations', {}, 'No conversations yet.')}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {state.conversations.map((conversation) => (
                  <li key={conversation.id} className="group flex items-center gap-1">
                    <button
                      type="button"
                      className="hover:bg-accent focus-visible:ring-ring flex min-w-0 flex-1 flex-col items-start rounded-md px-3 py-2 text-start outline-none focus-visible:ring-2"
                      onClick={() => void controller.openConversation(conversation.id)}
                    >
                      <span className="w-full truncate text-sm font-medium">
                        {conversation.title || t('ai.title', {}, 'Copilot')}
                      </span>
                      {conversation.updatedAt && (
                        <span className="text-muted-foreground text-xs">
                          {format.relative(conversation.updatedAt)}
                        </span>
                      )}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('ai.delete', {}, 'Delete conversation')}
                      onClick={() => void controller.deleteConversation(conversation.id)}
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div
            className="flex-1 overflow-y-auto px-4 py-4"
            role="log"
            aria-live="polite"
            aria-label={t('ai.messages', {}, 'Messages')}
            data-slot="ai-messages"
          >
            {state.loading && (
              <div className="flex justify-center p-6">
                <Spinner />
                <span className="sr-only">{t('ai.loading', {}, 'Loading')}</span>
              </div>
            )}
            {!state.loading && state.messages.length === 0 && (
              <div
                className="flex flex-col items-center gap-2 px-6 py-12 text-center"
                data-slot="ai-empty"
              >
                <SparklesIcon className="text-primary size-8" aria-hidden="true" />
                <p className="font-medium">{t('ai.empty_title', {}, 'How can I help?')}</p>
                <p className="text-muted-foreground text-sm">
                  {t(
                    'ai.empty_description',
                    {},
                    'Ask me to find or explain records, open pages or run actions. I always ask before changing anything.',
                  )}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-4">
              {state.messages.map((message) => (
                <CopilotMessage
                  key={message.id}
                  message={message}
                  controller={controller}
                  deciding={state.deciding[message.id]}
                  usage={usage(message)}
                />
              ))}
              {state.sending && state.streaming && state.streaming.text !== '' && (
                <div
                  className="bg-muted/60 rounded-lg px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap"
                  data-slot="ai-streaming"
                  aria-busy="true"
                >
                  {state.streaming.text}
                </div>
              )}
              {state.sending && (
                <div
                  className="text-muted-foreground flex items-center gap-2 text-sm"
                  data-slot="ai-thinking"
                >
                  <Spinner className="size-4" />
                  {state.streaming
                    ? t('ai.stream.writing', {}, 'Writing…')
                    : t('ai.thinking', {}, 'Thinking…')}
                  {state.streaming && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ms-auto"
                      data-slot="ai-stream-stop"
                      aria-label={t('ai.stream.stop_label', {}, 'Stop writing the answer')}
                      onClick={() => controller.cancel()}
                    >
                      <SquareIcon aria-hidden="true" className="size-3.5" />
                      {t('ai.stream.stop', {}, 'Stop')}
                    </Button>
                  )}
                </div>
              )}
              <div className="sr-only" aria-live="polite" aria-atomic="true">
                {state.streaming?.announcement ?? ''}
              </div>
            </div>
            <div ref={end} />
          </div>
        )}

        {state.view === 'chat' && (
          <form
            className="flex flex-col gap-2 border-t p-3"
            data-slot="ai-composer"
            onSubmit={(event) => {
              event.preventDefault()
              void controller.send()
            }}
          >
            {state.error && (
              <p role="alert" className="text-destructive flex items-start gap-2 text-sm">
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {state.error.message ?? t('ai.error', {}, 'Something went wrong. Try again.')}
              </p>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                ref={input}
                rows={2}
                value={state.draft}
                maxLength={4000}
                placeholder={t('ai.placeholder', {}, 'Ask about your data…')}
                aria-label={t('ai.placeholder', {}, 'Ask about your data…')}
                className="max-h-40 min-h-10 flex-1 resize-none"
                onChange={(event) => controller.setDraft(event.target.value)}
                onKeyDown={onKeyDown}
              />
              <Button
                type="submit"
                size="icon"
                disabled={state.sending || state.draft.trim() === ''}
                aria-label={t('ai.send', {}, 'Send')}
              >
                <ArrowUpIcon aria-hidden="true" />
              </Button>
            </div>
            {totals && (
              <p className="text-muted-foreground text-end text-xs" data-slot="ai-usage">
                {t(
                  'ai.tokens',
                  { count: format.number(totals.inputTokens + totals.outputTokens) },
                  ':count tokens',
                )}
                {totals.cost !== undefined && currency
                  ? ` · ${t('ai.cost', { cost: format.money(totals.cost, currency, { maximumFractionDigits: 4 }) }, '≈ :cost')}`
                  : ''}
              </p>
            )}
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}

function CopilotMessage({
  message,
  controller,
  deciding,
  usage,
}: {
  message: AiMessageSchema
  controller: CopilotController
  deciding?: 'confirm' | 'reject'
  usage: string | null
}) {
  const t = useT()

  if (message.role === 'user') {
    return (
      <div data-slot="ai-message" data-role="user" className="flex justify-end">
        <p className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-ee-sm px-3 py-2 text-sm whitespace-pre-wrap">
          <span className="sr-only">{t('ai.you', {}, 'You')}: </span>
          {message.content}
        </p>
      </div>
    )
  }

  if (message.role === 'error') {
    return (
      <p
        data-slot="ai-message"
        data-role="error"
        role="alert"
        className="text-destructive flex items-start gap-2 text-sm"
      >
        <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {message.content}
      </p>
    )
  }

  if (message.role === 'navigation') {
    return (
      <div data-slot="ai-message" data-role="navigation">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => message.url && router.visit(message.url)}
        >
          <ExternalLinkIcon className="rtl:-scale-x-100" aria-hidden="true" />
          {t('ai.open_link', {}, 'Open')}: {message.content}
        </Button>
      </div>
    )
  }

  if (message.role === 'action' && message.action) {
    const action = message.action
    const status = action.status

    return (
      <div
        data-slot="ai-action-card"
        data-status={status}
        className="bg-card rounded-lg border p-3 text-sm shadow-xs"
      >
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {t('ai.proposed_action', {}, 'Proposed action')}
        </p>
        <p className="mt-1 font-medium">
          {action.label}
          {action.record && (
            <span className="text-muted-foreground font-normal"> · {action.record}</span>
          )}
        </p>
        {message.content && <p className="text-muted-foreground mt-1">{message.content}</p>}
        {action.inputs && action.inputs.length > 0 && (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            {action.inputs.map((input, index) => (
              <div key={index} className="contents">
                <dt className="text-muted-foreground">{input.label}</dt>
                <dd className="break-words">{String(input.value ?? '—')}</dd>
              </div>
            ))}
          </dl>
        )}
        {action.error && <p className="text-destructive mt-2 text-xs">{action.error}</p>}
        <div className="mt-3 flex items-center gap-2">
          {status === 'pending' ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={deciding !== undefined}
                onClick={() => void controller.decide(message.id, 'confirm')}
              >
                {deciding === 'confirm' && <Spinner className="size-3" />}
                {t('ai.confirm', {}, 'Confirm')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={deciding !== undefined}
                onClick={() => void controller.decide(message.id, 'reject')}
              >
                {t('ai.cancel', {}, 'Cancel')}
              </Button>
              <span className="text-muted-foreground ms-auto text-xs">
                {t('ai.pending', {}, 'Waiting for your confirmation')}
              </span>
            </>
          ) : (
            <Badge
              variant={
                status === 'confirmed'
                  ? 'default'
                  : status === 'failed'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {status === 'confirmed'
                ? t('ai.confirmed', {}, 'Done')
                : status === 'failed'
                  ? t('ai.failed', {}, 'Failed')
                  : t('ai.rejected', {}, 'Cancelled')}
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="ai-message"
      data-role="assistant"
      data-demo={message.demo ? '' : undefined}
      className="flex flex-col gap-2"
    >
      {message.demo && (
        <Badge variant="outline" className="self-start font-normal" data-ai-sample="">
          {t('ai.sample', {}, "Sample answer — AI isn't configured")}
        </Badge>
      )}
      {message.activity && message.activity.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {message.activity.map((item, index) => (
            <Badge key={index} variant="secondary" className="font-normal">
              {item.label}
            </Badge>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2 text-sm leading-relaxed">
        <span className="sr-only">{t('ai.assistant', {}, 'Copilot')}: </span>
        {copilotBlocks(message.content).map((block, index) =>
          block.type === 'p' ? (
            <p key={index} className="whitespace-pre-wrap">
              {block.lines.join('\n')}
            </p>
          ) : (
            <MessageList key={index} ordered={block.type === 'ol'} items={block.lines} />
          ),
        )}
      </div>
      {usage && <p className="text-muted-foreground text-xs">{usage}</p>}
    </div>
  )
}

/** No provider key: sample answers (info) or "AI isn't available" (warning). */
function CopilotNotice({ notice }: { notice: AiSetupNoticeSchema }) {
  const Icon = notice.status === 'warning' ? TriangleAlertIcon : InfoIcon

  return (
    <div
      role="status"
      data-slot="ai-notice"
      data-status={notice.status}
      className="bg-muted/50 flex items-start gap-2 border-b px-4 py-3 text-sm"
    >
      <Icon
        className={cn(
          'mt-0.5 size-4 shrink-0',
          notice.status === 'warning' ? 'text-destructive' : 'text-primary',
        )}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-medium">{notice.heading}</p>
        {notice.description && (
          <p className="text-muted-foreground break-words">{notice.description}</p>
        )}
      </div>
    </div>
  )
}

function MessageList({ ordered, items }: { ordered: boolean; items: string[] }) {
  const className = cn('flex flex-col gap-1 ps-5', ordered ? 'list-decimal' : 'list-disc')

  return ordered ? (
    <ol className={className}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ol>
  ) : (
    <ul className={className}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  )
}
