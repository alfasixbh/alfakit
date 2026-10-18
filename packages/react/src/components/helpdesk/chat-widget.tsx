import { HelpdeskChatClient, type HelpdeskChatOptions } from '@alfakit/core'
import { MessageCircleIcon, XIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useHydrated } from '../../hooks/use-hydrated'
import { useStore } from '../../hooks/use-store'
import { lazyComponent } from '../../lib/lazy'
import { cn } from '../../lib/utils'
import type { HelpdeskChatPanelProps } from './chat-panel'

const ChatPanel = lazyComponent<HelpdeskChatPanelProps>(
  () => import('./chat-panel').then((module) => module.HelpdeskChatPanel),
  () => null,
)

export interface HelpdeskChatProps extends HelpdeskChatOptions {
  /** Which corner, in the reading direction (`end` by default: bottom right in LTR). */
  position?: 'start' | 'end'
  /** Open on load. */
  defaultOpen?: boolean
  /** The launcher's accessible name before the server's texts arrive. */
  label?: string
  className?: string
}

/**
 * The helpdesk's live chat widget for your public pages (alfasix/alfakit-helpdesk): a
 * launcher button that opens the chat. The chat's code loads when it is first opened;
 * nothing renders on the server. Works outside panels (no `AlfakitRoot` needed).
 *
 * ```tsx
 * <HelpdeskChat endpoint="/support/chat" />
 * ```
 */
export function HelpdeskChat({
  position = 'end',
  defaultOpen = false,
  label,
  className,
  ...options
}: HelpdeskChatProps) {
  const [client] = useState(() => new HelpdeskChatClient(options))
  const mounted = useHydrated()
  const state = useStore(client.store)
  const launcher = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    void client.load()

    if (defaultOpen) client.setOpen(true)

    return () => client.stop()
  }, [client, defaultOpen])

  if (!mounted || state.config?.enabled === false) return null

  const close = () => {
    client.setOpen(false)
    launcher.current?.focus()
  }
  const name = state.open ? client.t('close', 'Close chat') : client.t('open', label ?? 'Open chat')

  return (
    <div
      data-slot="helpdesk-chat-widget"
      className={cn(
        'fixed bottom-4 z-50 flex flex-col gap-3',
        position === 'end' ? 'end-4 items-end' : 'start-4 items-start',
        className,
      )}
    >
      {state.open && (
        <div id={panelId}>
          <ChatPanel client={client} onClose={close} />
        </div>
      )}
      <button
        ref={launcher}
        type="button"
        aria-expanded={state.open}
        aria-controls={state.open ? panelId : undefined}
        aria-label={name}
        title={name}
        onClick={() => (state.open ? close() : client.setOpen(true))}
        onMouseEnter={() => void ChatPanel.preload()}
        onFocus={() => void ChatPanel.preload()}
        className="bg-primary text-primary-foreground focus-visible:ring-ring/50 relative flex size-14 items-center justify-center rounded-full shadow-lg transition-transform outline-none hover:scale-105 focus-visible:ring-[3px]"
      >
        {state.open ? (
          <XIcon className="size-6" aria-hidden="true" />
        ) : (
          <MessageCircleIcon className="size-6 rtl:-scale-x-100" aria-hidden="true" />
        )}
        {!state.open && state.unread > 0 && (
          <span className="bg-destructive text-destructive-foreground absolute -end-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold">
            {new Intl.NumberFormat(document.documentElement.lang || undefined).format(state.unread)}
            <span className="sr-only">
              {client.t('new_message', 'New message from :name', {
                name: client.t('agent', 'Support'),
              })}
            </span>
          </span>
        )}
      </button>
    </div>
  )
}
