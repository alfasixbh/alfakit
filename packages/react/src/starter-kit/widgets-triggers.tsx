import {
  formatKeyBinding,
  initials,
  registerStarterKitCopilotShortcut,
  registerStarterKitSearchShortcut,
  requestStarterKitCopilot,
  requestStarterKitSearch,
  tenantNameText,
  type StarterKitWidgets,
} from '@alfakit/core'
import { BellIcon, ChevronsUpDownIcon, SearchIcon, SparklesIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useHydrated } from '../hooks/use-hydrated'

/**
 * What the starter kit header components show until their code and the panel data have
 * loaded: the same look as the loaded triggers, from the shared prop alone.
 */
export interface WidgetProps {
  source: StarterKitWidgets
}

const triggerClasses =
  'border-input bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 inline-flex h-8 shrink-0 items-center rounded-md border text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

/** The search field until the palette has loaded: the same look, and it remembers a click. */
export function SearchTrigger({ source, onLoad }: WidgetProps & { onLoad?: () => void }) {
  const hydrated = useHydrated()
  const search = source.widgets.search
  const keys = JSON.stringify(search?.keyBindings ?? ['mod+k'])
  const placeholder = search?.placeholder ?? ''
  // `onLoad` is a stable function (it starts loading the palette's code).
  useEffect(
    () =>
      registerStarterKitSearchShortcut(JSON.parse(keys) as string[], placeholder, () => onLoad?.()),
    [keys, placeholder, onLoad],
  )

  const binding = search?.keyBindings[0]

  return (
    <button
      type="button"
      className={`${triggerClasses} text-muted-foreground size-8 justify-center gap-2 px-0 font-normal sm:w-56 sm:justify-start sm:px-2.5`}
      onPointerEnter={() => onLoad?.()}
      onClick={() => {
        requestStarterKitSearch()
        onLoad?.()
      }}
    >
      <SearchIcon className="size-4" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only sm:flex-1 sm:text-start">{placeholder}</span>
      {hydrated && binding && (
        <kbd dir="ltr" className="bg-muted hidden rounded px-1 font-mono text-[10px] sm:inline">
          {formatKeyBinding(binding)}
        </kbd>
      )}
    </button>
  )
}

/** The bell and its unread count until the menu has loaded. */
export function NotificationsTrigger({ source }: WidgetProps) {
  const notifications = source.widgets.notifications
  const count = notifications?.unreadCount ?? 0

  return (
    <button
      type="button"
      data-slot="notifications-trigger"
      aria-label={notifications?.label}
      className="hover:bg-accent hover:text-accent-foreground relative inline-flex size-9 items-center justify-center rounded-md"
    >
      <BellIcon className="size-4" aria-hidden="true" />
      {count > 0 && (
        <span className="bg-primary text-primary-foreground absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

/** The current tenant (or an empty avatar) until the switcher has loaded: a placeholder. */
export function TenantSwitcherTrigger({ source }: WidgetProps) {
  const current = source.widgets.tenancy?.current

  return (
    <button
      type="button"
      data-slot="tenant-menu"
      aria-hidden="true"
      tabIndex={-1}
      className="hover:bg-accent inline-flex h-9 max-w-60 shrink-0 items-center gap-2 rounded-md px-2 text-sm font-medium"
    >
      <span className="bg-muted flex size-6 items-center justify-center rounded-md text-[10px]">
        {current ? initials(tenantNameText(current)) : ''}
      </span>
      {current && (
        <span className="sr-only min-w-0 truncate lg:not-sr-only">{tenantNameText(current)}</span>
      )}
      <ChevronsUpDownIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
    </button>
  )
}

/**
 * The AI copilot's button until its code has loaded: the same look, and it remembers a
 * click or its key bindings (`mod+j`), so the copilot opens once loaded.
 */
export function CopilotTrigger({ source, onLoad }: WidgetProps & { onLoad?: () => void }) {
  const copilot = source.widgets.copilot
  const keys = JSON.stringify(copilot?.keyBindings ?? [])
  const label = copilot?.label ?? ''
  // `onLoad` is a stable function (it starts loading the copilot's code).
  useEffect(
    () => registerStarterKitCopilotShortcut(JSON.parse(keys) as string[], label, () => onLoad?.()),
    [keys, label, onLoad],
  )

  return (
    <button
      type="button"
      data-slot="ai-copilot-trigger"
      aria-label={label}
      aria-haspopup="dialog"
      title={label}
      className="hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md"
      onPointerEnter={() => onLoad?.()}
      onClick={() => {
        requestStarterKitCopilot()
        onLoad?.()
      }}
    >
      <SparklesIcon className="size-4" aria-hidden="true" />
    </button>
  )
}
