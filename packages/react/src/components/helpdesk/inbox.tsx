import type {
  HelpdeskBadge,
  HelpdeskInboxSchema,
  HelpdeskMessage,
  HelpdeskSla,
  HelpdeskTicket,
  HelpdeskTicketSummary,
  LocaleFormatter,
} from '@alfakit/core'
import { HelpdeskInboxController, helpdeskFileSize, presenceInitials } from '@alfakit/core'
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  LockIcon,
  PaperclipIcon,
  SearchIcon,
  SendIcon,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { useActionRunner, useFormatter, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { ActionList } from '../actions/action-list'
import { RecordPresence } from '../realtime/record-presence'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Skeleton } from '../ui/skeleton'
import { Spinner } from '../ui/spinner'
import { Textarea } from '../ui/textarea'

type Translate = ReturnType<typeof useT>

/**
 * The helpdesk agent inbox (schema component `helpdesk:inbox`, alfasix/alfakit-helpdesk):
 * views, the ticket list and the conversation side by side, a quick composer, keyboard
 * shortcuts (`j` / `k`, `r`, `n`, `/`) and live updates.
 */
export function HelpdeskInbox({ component }: { component: HelpdeskInboxSchema }) {
  return <InboxView key={component.actionComponent} schema={component} />
}

function InboxView({ schema }: { schema: HelpdeskInboxSchema }) {
  const runner = useActionRunner()
  const page = usePageActionContext()
  const t = useT()
  const formatter = useFormatter()
  const [controller] = useState(
    () => new HelpdeskInboxController(schema, { runner, token: page.token, t }),
  )
  const state = useStore(controller.store)
  const searchRef = useRef<HTMLInputElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const first = useRef(true)

  useEffect(() => {
    controller.setEnvironment({ runner, token: page.token, t })
  })

  useEffect(() => {
    if (first.current) {
      first.current = false

      return
    }

    controller.setSchema(schema)
  }, [controller, schema])

  useEffect(() => controller.start(), [controller])

  useEffect(
    () =>
      controller.registerShortcuts({
        focusComposer: () => requestAnimationFrame(() => composerRef.current?.focus()),
        focusSearch: () => searchRef.current?.focus(),
        focusTicket: (key) =>
          requestAnimationFrame(() =>
            listRef.current
              ?.querySelector<HTMLElement>(`[data-ticket="${CSS.escape(key)}"]`)
              ?.focus(),
          ),
      }),
    [controller],
  )

  const ticket = state.ticket

  return (
    <Card
      data-slot="helpdesk-inbox"
      className="grid h-[calc(100svh-12rem)] min-h-[34rem] grid-cols-1 gap-0 overflow-hidden py-0 md:grid-cols-[18rem_1fr] xl:grid-cols-[13rem_20rem_1fr]"
    >
      <nav
        data-slot="helpdesk-views"
        aria-label={t('helpdesk.views', {}, 'Views')}
        className={cn(
          'flex gap-1 overflow-x-auto border-b p-2 md:col-span-2 xl:col-span-1 xl:flex-col xl:overflow-visible xl:border-e xl:border-b-0',
          state.selected !== null && 'max-md:hidden',
        )}
      >
        {state.list.views.map((view) => (
          <button
            key={view.key}
            type="button"
            aria-current={view.key === state.view ? 'page' : undefined}
            onClick={() => controller.setView(view.key)}
            className="hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:text-foreground text-muted-foreground flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-sm font-medium"
          >
            <Icon name={view.icon} className="size-4 shrink-0" />
            <span className="flex-1 truncate">{view.label}</span>
            {view.count !== undefined && view.count > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  view.color ? colorClass(badgeColorClasses, view.color) : 'bg-muted-foreground/10',
                )}
              >
                {formatter.number(view.count)}
              </span>
            )}
          </button>
        ))}
      </nav>

      <section
        data-slot="helpdesk-list"
        aria-label={t('helpdesk.tickets', {}, 'Tickets')}
        className={cn('flex min-h-0 flex-col border-e', state.selected !== null && 'max-md:hidden')}
      >
        <div className="relative border-b p-2">
          <SearchIcon
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2"
          />
          <Input
            ref={searchRef}
            type="search"
            value={state.search}
            onChange={(event) => controller.setSearch(event.target.value)}
            placeholder={t(
              'helpdesk.search_placeholder',
              {},
              'Search by subject, requester or #number…',
            )}
            aria-label={t('helpdesk.search', {}, 'Search tickets')}
            className="ps-8"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={state.loadingList || undefined}>
          {state.list.tickets.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-1 p-8 text-center text-sm">
              {state.loadingList ? (
                <Spinner />
              ) : (
                <>
                  <p className="text-foreground font-medium">
                    {t('helpdesk.empty', {}, 'No tickets here')}
                  </p>
                  <p>
                    {t(
                      'helpdesk.empty_description',
                      {},
                      'Nothing needs your attention in this view.',
                    )}
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul ref={listRef} className="divide-y">
              {state.list.tickets.map((item) => (
                <TicketRow
                  key={item.key}
                  ticket={item}
                  selected={item.key === state.selected}
                  formatter={formatter}
                  t={t}
                  onSelect={() => void controller.select(item.key)}
                />
              ))}
            </ul>
          )}
          {state.list.hasMore && (
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={state.loadingList}
                onClick={() => void controller.loadMore()}
              >
                {state.loadingList && <Spinner />}
                {t('helpdesk.load_more', {}, 'Load more')}
              </Button>
            </div>
          )}
        </div>
      </section>

      <section
        data-slot="helpdesk-ticket"
        aria-label={
          ticket
            ? `${ticket.reference} ${ticket.subject}`
            : t('helpdesk.conversation', {}, 'Conversation')
        }
        className={cn('flex min-h-0 min-w-0 flex-col', state.selected === null && 'max-md:hidden')}
      >
        {state.selected === null ? (
          <div className="text-muted-foreground m-auto flex max-w-xs flex-col items-center gap-1 p-8 text-center text-sm">
            <p className="text-foreground font-medium">
              {t('helpdesk.select', {}, 'Select a ticket')}
            </p>
            <p>
              {t(
                'helpdesk.select_description',
                {},
                'Pick a ticket on the list to read and answer it.',
              )}
            </p>
          </div>
        ) : ticket === null ? (
          <div className="flex flex-col gap-3 p-4" aria-busy="true">
            <span className="sr-only">{t('helpdesk.loading', {}, 'Loading…')}</span>
            {state.ticketError ? (
              <p role="alert" className="text-destructive text-sm">
                {t('helpdesk.load_failed', {}, 'The ticket could not be loaded.')}
              </p>
            ) : (
              <>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </>
            )}
          </div>
        ) : (
          <TicketPane
            ticket={ticket}
            controller={controller}
            token={page.token}
            actionComponent={schema.actionComponent}
            requesterTyping={state.requesterTyping}
            composerRef={composerRef}
            formatter={formatter}
            t={t}
          />
        )}
      </section>
      <div aria-live="polite" className="sr-only">
        {state.announcement}
      </div>
    </Card>
  )
}

function SlaBadge({
  sla,
  formatter,
  t,
}: {
  sla: HelpdeskSla
  formatter: LocaleFormatter
  t: Translate
}) {
  if (sla.state === 'none') return null

  return (
    <Badge
      variant="outline"
      className={colorClass(badgeColorClasses, sla.color, 'gray')}
      title={sla.dueAt ? formatter.dateTime(sla.dueAt) : undefined}
    >
      {sla.label}
      {sla.dueAt &&
        (sla.state === 'due_soon' || sla.state === 'breached' || sla.state === 'on_track') && (
          <span className="font-normal opacity-80">
            · {t('helpdesk.due', { time: formatter.relative(sla.dueAt) }, 'Due :time')}
          </span>
        )}
    </Badge>
  )
}

function StatusBadge({ badge }: { badge: HelpdeskBadge }) {
  return (
    <Badge variant="outline" className={colorClass(badgeColorClasses, badge.color, 'gray')}>
      {badge.label}
    </Badge>
  )
}

function TicketRow({
  ticket,
  selected,
  formatter,
  t,
  onSelect,
}: {
  ticket: HelpdeskTicketSummary
  selected: boolean
  formatter: LocaleFormatter
  t: Translate
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        data-ticket={ticket.key}
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
        className="hover:bg-muted/60 aria-[current=true]:bg-muted focus-visible:ring-ring/50 flex w-full flex-col gap-1 px-3 py-2.5 text-start outline-none focus-visible:ring-[3px]"
      >
        <span className="flex items-center gap-2">
          {ticket.awaitingReply && (
            <span className="bg-primary size-2 shrink-0 rounded-full" aria-hidden="true" />
          )}
          {ticket.awaitingReply && (
            <span className="sr-only">
              {t('helpdesk.awaiting_reply', {}, 'Awaiting your reply')}
            </span>
          )}
          <span className="text-muted-foreground text-xs tabular-nums">{ticket.reference}</span>
          <span className="truncate text-sm font-medium">{ticket.subject}</span>
          {ticket.lastActivityAt && (
            <time
              dateTime={ticket.lastActivityAt}
              className="text-muted-foreground ms-auto shrink-0 text-xs"
            >
              {formatter.relative(ticket.lastActivityAt)}
            </time>
          )}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <Icon name={ticket.channelIcon} className="size-3 shrink-0" />
          <span className="truncate">{ticket.requester}</span>
          {ticket.assignee && <span className="truncate">· {ticket.assignee}</span>}
        </span>
        {ticket.excerpt && (
          <span
            className={cn(
              'text-muted-foreground line-clamp-2 text-xs',
              ticket.excerptInternal && 'italic',
            )}
          >
            {ticket.excerptInternal && (
              <LockIcon
                aria-label={t('helpdesk.internal', {}, 'Internal note')}
                className="me-1 inline size-3"
              />
            )}
            {ticket.excerpt}
          </span>
        )}
        <span className="flex flex-wrap gap-1">
          <StatusBadge badge={ticket.status} />
          {ticket.priority.value !== 'normal' && <StatusBadge badge={ticket.priority} />}
          <SlaBadge sla={ticket.sla} formatter={formatter} t={t} />
        </span>
      </button>
    </li>
  )
}

function TicketPane({
  ticket,
  controller,
  token,
  actionComponent,
  requesterTyping,
  composerRef,
  formatter,
  t,
}: {
  ticket: HelpdeskTicket
  controller: HelpdeskInboxController
  token: string
  actionComponent: string
  requesterTyping: boolean
  composerRef: RefObject<HTMLTextAreaElement | null>
  formatter: LocaleFormatter
  t: Translate
}) {
  const state = useStore(controller.store)
  const composer = state.composer
  const messagesRef = useRef<HTMLOListElement>(null)
  const composerId = useId()
  const hintId = useId()

  useEffect(() => {
    const element = messagesRef.current

    if (element) element.scrollTop = element.scrollHeight
  }, [ticket.key, ticket.messages.length])

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void controller.send()
    }

    if (event.key === 'Escape') {
      event.currentTarget.blur()
    }
  }

  return (
    <>
      <header className="flex flex-col gap-2 border-b p-3">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label={t('helpdesk.back', {}, 'Back to the list')}
            onClick={() => void controller.select(null)}
          >
            <ArrowLeftIcon className="rtl:rotate-180" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold">
              <span className="text-muted-foreground me-1.5 font-normal tabular-nums">
                {ticket.reference}
              </span>
              {ticket.subject}
            </h2>
            <p className="text-muted-foreground truncate text-xs">
              {ticket.requester.name}
              {ticket.requester.email && ` · ${ticket.requester.email}`}
            </p>
          </div>
          {ticket.presence && <RecordPresence presence={ticket.presence} />}
          {ticket.url && (
            <Button asChild variant="ghost" size="icon-sm">
              <a
                href={ticket.url}
                aria-label={t('helpdesk.open_page', {}, 'Open the ticket page')}
                title={t('helpdesk.open_page', {}, 'Open the ticket page')}
              >
                <ExternalLinkIcon className="rtl:-scale-x-100" />
              </a>
            </Button>
          )}
        </div>
        <dl className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <div className="flex items-center gap-1">
            <dt className="sr-only">{t('helpdesk.status', {}, 'Status')}</dt>
            <dd>
              <StatusBadge badge={ticket.status} />
            </dd>
          </div>
          <div className="flex items-center gap-1">
            <dt className="sr-only">{t('helpdesk.priority', {}, 'Priority')}</dt>
            <dd>
              <StatusBadge badge={ticket.priority} />
            </dd>
          </div>
          <div className="flex items-center gap-1">
            <dt>{t('helpdesk.assignee', {}, 'Assignee')}:</dt>
            <dd className="text-foreground">
              {ticket.assignee?.name ?? t('helpdesk.unassigned', {}, 'Unassigned')}
            </dd>
          </div>
          {ticket.group && (
            <div className="flex items-center gap-1">
              <dt>{t('helpdesk.group', {}, 'Group')}:</dt>
              <dd className="text-foreground">{ticket.group.name}</dd>
            </div>
          )}
          {ticket.sla.firstResponse && (
            <div className="flex items-center gap-1">
              <dt>{t('helpdesk.first_response', {}, 'First response')}:</dt>
              <dd>
                <SlaBadge sla={ticket.sla.firstResponse} formatter={formatter} t={t} />
              </dd>
            </div>
          )}
          {ticket.sla.resolution && (
            <div className="flex items-center gap-1">
              <dt>{t('helpdesk.resolution', {}, 'Resolution')}:</dt>
              <dd>
                <SlaBadge sla={ticket.sla.resolution} formatter={formatter} t={t} />
              </dd>
            </div>
          )}
          {ticket.satisfaction?.rating !== undefined && (
            <div className="flex items-center gap-1">
              <dt>{t('helpdesk.satisfaction', {}, 'Satisfaction')}:</dt>
              <dd className="text-foreground">
                {t('helpdesk.rating', { rating: ticket.satisfaction.rating }, ':rating / 5')}
              </dd>
            </div>
          )}
          {ticket.tags && ticket.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <dt className="sr-only">{t('helpdesk.tags', {}, 'Tags')}</dt>
              <dd className="flex flex-wrap gap-1">
                {ticket.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </dd>
            </div>
          )}
        </dl>
        {ticket.actions.length > 0 && (
          <div role="group" aria-label={t('helpdesk.actions', {}, 'Ticket actions')}>
            <ActionList
              actions={ticket.actions}
              context={{ token, component: actionComponent, record: ticket.key }}
              size="xs"
            />
          </div>
        )}
      </header>

      <ol
        ref={messagesRef}
        aria-label={t('helpdesk.conversation', {}, 'Conversation')}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
      >
        {ticket.messages.map((message) => (
          <Message key={message.key} message={message} formatter={formatter} t={t} />
        ))}
      </ol>

      {ticket.merged && (
        <p className="text-muted-foreground border-t p-3 text-sm">
          {t('helpdesk.merged', {}, 'This ticket was merged into another one.')}
        </p>
      )}

      {ticket.canReply && (
        <form
          data-slot="helpdesk-composer"
          data-mode={composer.mode}
          className="data-[mode=note]:bg-warning/5 flex flex-col gap-2 border-t p-3"
          onSubmit={(event) => {
            event.preventDefault()
            void controller.send()
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div
              role="radiogroup"
              aria-label={t('helpdesk.mode', {}, 'Message type')}
              className="bg-muted inline-flex rounded-md p-0.5"
            >
              {(['reply', 'note'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={composer.mode === mode}
                  onClick={() => controller.setMode(mode)}
                  className="aria-checked:bg-background aria-checked:text-foreground text-muted-foreground rounded px-2.5 py-1 text-xs font-medium aria-checked:shadow-xs"
                >
                  {mode === 'reply'
                    ? t('helpdesk.mode_reply', {}, 'Reply')
                    : t('helpdesk.mode_note', {}, 'Internal note')}
                </button>
              ))}
            </div>
            {requesterTyping && (
              <p className="text-muted-foreground animate-pulse text-xs" role="status">
                {t(
                  'helpdesk.requester_typing',
                  { name: ticket.requester.name },
                  ':name is typing…',
                )}
              </p>
            )}
          </div>
          <label htmlFor={composerId} className="sr-only">
            {composer.mode === 'note'
              ? t('helpdesk.mode_note', {}, 'Internal note')
              : t('helpdesk.mode_reply', {}, 'Reply')}
          </label>
          <Textarea
            ref={composerRef}
            id={composerId}
            rows={3}
            value={composer.text}
            onChange={(event) => controller.setText(event.target.value)}
            onKeyDown={onKeyDown}
            aria-describedby={hintId}
            aria-invalid={composer.error ? true : undefined}
            placeholder={
              composer.mode === 'note'
                ? t('helpdesk.note_placeholder', {}, 'Add a note only agents can see…')
                : t(
                    'helpdesk.reply_placeholder',
                    { name: ticket.requester.name },
                    'Reply to :name…',
                  )
            }
            className="max-h-48 min-h-20 resize-y"
          />
          {composer.error && (
            <p role="alert" className="text-destructive text-xs">
              {composer.error}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <p id={hintId} className="text-muted-foreground text-xs max-sm:hidden">
              {t('helpdesk.send_hint', {}, 'Enter to send, Shift+Enter for a new line')}
            </p>
            <Button
              type="submit"
              size="sm"
              className="ms-auto"
              variant={composer.mode === 'note' ? 'secondary' : 'default'}
              disabled={composer.sending || composer.text.trim() === ''}
            >
              {composer.sending ? <Spinner /> : <SendIcon className="rtl:-scale-x-100" />}
              {composer.sending
                ? t('helpdesk.sending', {}, 'Sending…')
                : composer.mode === 'note'
                  ? t('helpdesk.add_note', {}, 'Add note')
                  : t('helpdesk.send', {}, 'Send')}
            </Button>
          </div>
        </form>
      )}
    </>
  )
}

function Message({
  message,
  formatter,
  t,
}: {
  message: HelpdeskMessage
  formatter: LocaleFormatter
  t: Translate
}) {
  if (message.kind === 'event') {
    return (
      <li
        data-slot="helpdesk-message"
        data-kind="event"
        className="text-muted-foreground flex items-center gap-2 self-center text-xs"
      >
        <span className="sr-only">{t('helpdesk.activity', {}, 'Activity')}:</span>
        <span dangerouslySetInnerHTML={{ __html: message.html }} className="[&_p]:inline" />
        {message.createdAt && (
          <time dateTime={message.createdAt}>· {formatter.relative(message.createdAt)}</time>
        )}
      </li>
    )
  }

  const note = message.kind === 'note'

  return (
    <li
      data-slot="helpdesk-message"
      data-kind={message.kind}
      data-from={message.fromRequester ? 'requester' : 'agent'}
      className={cn(
        'flex max-w-[48rem] gap-2.5',
        !message.fromRequester && 'flex-row-reverse self-end text-start',
      )}
    >
      <Avatar className="size-8 shrink-0">
        {message.author.avatar && <AvatarImage src={message.author.avatar} alt="" />}
        <AvatarFallback aria-hidden="true">{presenceInitials(message.author.name)}</AvatarFallback>
      </Avatar>
      <article
        className={cn(
          'min-w-0 rounded-lg border px-3 py-2',
          note
            ? 'border-warning/40 bg-warning/10'
            : message.fromRequester
              ? 'bg-muted/50'
              : 'bg-primary/5 border-primary/20',
        )}
      >
        <header className="mb-1 flex flex-wrap items-center gap-x-2 text-xs">
          <span className="font-medium">{message.author.name}</span>
          {note && (
            <span className="text-warning inline-flex items-center gap-1 font-medium">
              <LockIcon className="size-3" aria-hidden="true" />
              {t('helpdesk.internal', {}, 'Internal note')}
            </span>
          )}
          {message.createdAt && (
            <time
              dateTime={message.createdAt}
              title={formatter.dateTime(message.createdAt)}
              className="text-muted-foreground"
            >
              {formatter.relative(message.createdAt)}
            </time>
          )}
        </header>
        <div
          className="prose prose-sm dark:prose-invert max-w-none break-words"
          dangerouslySetInnerHTML={{ __html: message.html }}
        />
        {message.attachments && message.attachments.length > 0 && (
          <ul
            aria-label={t('helpdesk.attachments', {}, 'Attachments')}
            className="mt-2 flex flex-wrap gap-1.5"
          >
            {message.attachments.map((file, index) => {
              const size = helpdeskFileSize(file.size, (value) => formatter.number(value))

              return (
                <li key={index}>
                  {file.url ? (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener"
                      className="hover:bg-muted inline-flex items-center gap-1 rounded border px-2 py-1 text-xs"
                    >
                      <PaperclipIcon className="size-3" aria-hidden="true" />
                      {file.name}
                      {size && <span className="text-muted-foreground">({size})</span>}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs">
                      {file.name}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </article>
    </li>
  )
}
