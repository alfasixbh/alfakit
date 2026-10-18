import type {
  ActionSchema,
  CommandPaletteResponse,
  GlobalSearchGroupSchema,
  PaletteGroup,
  PaletteItem,
} from '@alfakit/core'
import {
  canInstallPwa,
  commandPaletteItems,
  createLatestRequest,
  debounce,
  filterCommandPalette,
  globalSearchDebounce,
  globalSearchStatus,
  paletteGroupKey,
  pwaStore,
  requestJson,
  setAppearance,
  shortcuts,
} from '@alfakit/core'
import { router } from '@inertiajs/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useActionRunner, useChoice, usePageSchema, usePanel, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { Icon } from '../../lib/icons'
import { Button } from '../ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command'
import { Spinner } from '../ui/spinner'
import { installPwa } from './pwa'
import { ShortcutKeys } from './shortcut-keys'
import { Slot } from './slot'

type SearchGroup = GlobalSearchGroupSchema

/** Groups listed after the global search results. */
const TRAILING_GROUPS = new Set(['theme', 'help'])

/**
 * The command palette behind `GlobalSearch`: global search results plus (with
 * `alfakit.commandPalette`) the page's header actions, panel commands, navigation, "create"
 * links, recent records, theme switching and the shortcuts overlay. Its code loads the first
 * time the palette opens; the trigger and `mod+k` stay in the shell.
 */
export function GlobalSearchPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const choice = useChoice()
  const panel = usePanel()
  const page = usePageSchema()
  const runner = useActionRunner()
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState<CommandPaletteResponse | null>(null)
  const config = panel.globalSearch
  const palette = panel.commandPalette
  const endpoint = config ? panel.endpoints.globalSearch : undefined
  const paletteEndpoint = panel.endpoints.commandPalette
  const wait = globalSearchDebounce(config)
  const placeholder =
    config?.placeholder ??
    palette?.placeholder ??
    t('palette.placeholder', {}, 'Type a command or search…')
  const overlay = panel.keyboardShortcuts !== false && panel.keyboardShortcuts !== undefined
  // `Panel::pwa()`: "Install app" while the browser offers it (or on iOS Safari).
  const installable = canInstallPwa(useStore(pwaStore)) && Boolean(panel.pwa)

  // Create links and recent records, loaded each time the palette opens.
  useEffect(() => {
    if (!open || !palette || !paletteEndpoint) return

    let active = true

    requestJson<CommandPaletteResponse>(paletteEndpoint)
      .then((response) => active && setLoaded(response))
      .catch(() => active && setLoaded({ create: [], recent: [] }))

    return () => {
      active = false
    }
  }, [open, palette, paletteEndpoint])

  const latest = useMemo(() => createLatestRequest(), [])

  const search = useMemo(
    () =>
      debounce((term: string) => {
        if (!endpoint || term.trim() === '') {
          latest.cancel()
          setGroups([])
          setLoading(false)

          return
        }

        // Only the newest request may update the results (B32): a slow response for an
        // older term is aborted and dropped.
        void latest
          .run(
            (signal) =>
              requestJson<{ groups: SearchGroup[] }>(endpoint, {
                query: { search: term },
                signal,
              }),
            (response) => setGroups(response.groups),
            () => setLoading(false),
          )
          .catch(() => setGroups([]))
      }, wait),
    [endpoint, latest, wait],
  )

  useEffect(
    () => () => {
      search.cancel()
      latest.cancel()
    },
    [search, latest],
  )

  // Closing the palette (or navigating away) starts the next search from scratch.
  const reset = useCallback(() => {
    search.cancel()
    latest.cancel()
    setQuery('')
    setGroups([])
    setLoading(false)
    setLoaded(null)
  }, [search, latest])

  const changeOpen = (next: boolean) => {
    onOpenChange(next)

    if (!next) reset()
  }

  useEffect(
    () =>
      router.on('navigate', () => {
        onOpenChange(false)
        reset()
      }),
    [onOpenChange, reset],
  )

  const items = useMemo(
    () =>
      commandPaletteItems({
        panel,
        page,
        loaded,
        shortcutsOverlay: overlay,
        ...(installable ? { install: t('pwa.install', {}, 'Install app') } : {}),
        labels: {
          light: t('palette.theme.light', {}, 'Light theme'),
          dark: t('palette.theme.dark', {}, 'Dark theme'),
          system: t('palette.theme.system', {}, 'System theme'),
          shortcuts: t('palette.shortcuts', {}, 'Keyboard shortcuts'),
        },
      }),
    [panel, page, loaded, overlay, installable, t],
  )
  const local = useMemo(() => filterCommandPalette(items, query), [items, query])
  const leading = local.filter((group) => !TRAILING_GROUPS.has(group.id))
  const trailing = local.filter((group) => TRAILING_GROUPS.has(group.id))

  const status = globalSearchStatus(
    query,
    loading,
    [...groups, ...local.map((group) => ({ results: group.items }))],
    { t, choice },
  )

  const updateQuery = (term: string) => {
    setQuery(term)
    setLoading(endpoint !== undefined && term.trim() !== '')
    search(term)
  }

  const run = (item: PaletteItem) => {
    changeOpen(false)

    if (item.kind === 'action' && item.action && item.context) {
      void runner.trigger(item.action, item.context)
    } else if (item.kind === 'url' && item.url) {
      if (item.openInNewTab) {
        window.open(item.url, '_blank', 'noopener,noreferrer')
      } else {
        router.visit(item.url)
      }
    } else if (item.kind === 'theme' && item.appearance) {
      setAppearance(item.appearance, panel)
    } else if (item.kind === 'shortcut' && item.shortcutId) {
      // After the dialog closed, so focus returns to the page before the overlay opens.
      setTimeout(() => shortcuts.trigger(item.shortcutId!), 0)
    } else if (item.kind === 'install') {
      void installPwa(t)
    }
  }

  const groupHeading = (group: PaletteGroup) =>
    group.label ?? t(paletteGroupKey(group.id), {}, defaultGroupLabel(group.id))

  return (
    <CommandDialog
      open={open}
      onOpenChange={changeOpen}
      title={palette ? t('command_palette', {}, 'Command palette') : t('search', {}, 'Search')}
      description={placeholder}
      shouldFilter={false}
    >
      <Slot name="global-search.start" />
      {/* Announces the result count (or "No results.") once a search has finished. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {status}
      </div>
      <CommandInput placeholder={placeholder} value={query} onValueChange={updateQuery} />
      <CommandList>
        {!loading && (
          <CommandEmpty>{query ? t('no_results', {}, 'No results.') : placeholder}</CommandEmpty>
        )}
        {leading.map((group) => (
          <PaletteGroupItems
            key={group.id}
            group={group}
            heading={groupHeading(group)}
            onRun={run}
          />
        ))}
        {loading && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}
        {groups.map((group) => (
          <CommandGroup key={group.label} heading={group.label} data-group="search">
            {group.results.map((result) => (
              <CommandItem
                key={result.url}
                value={`search:${group.label}:${result.url}`}
                onSelect={() => {
                  changeOpen(false)
                  router.visit(result.url)
                }}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span>{result.title}</span>
                  {result.details && (
                    <span className="text-muted-foreground text-xs">
                      {Object.entries(result.details)
                        .map(([key, value]) => `${key}: ${String(value)}`)
                        .join(' · ')}
                    </span>
                  )}
                </div>
                {result.actions && result.actions.length > 0 && (
                  <div data-slot="global-search-actions" className="ms-auto flex shrink-0 gap-1">
                    {result.actions.map((action) => (
                      <ResultAction
                        key={action.name}
                        action={action}
                        onNavigate={() => changeOpen(false)}
                      />
                    ))}
                  </div>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        {trailing.map((group) => (
          <PaletteGroupItems
            key={group.id}
            group={group}
            heading={groupHeading(group)}
            onRun={run}
          />
        ))}
      </CommandList>
      <Slot name="global-search.end" />
    </CommandDialog>
  )
}

function defaultGroupLabel(group: string): string {
  const id = group.startsWith('commands:') ? 'commands' : group

  return (
    {
      recent: 'Recent',
      actions: 'Actions',
      commands: 'Commands',
      create: 'Create',
      navigation: 'Go to',
      theme: 'Theme',
      help: 'Help',
    }[id] ?? id
  )
}

/** One palette group: page actions, commands, links, theme and help items. */
function PaletteGroupItems({
  group,
  heading,
  onRun,
}: {
  group: PaletteGroup
  heading: string
  onRun: (item: PaletteItem) => void
}) {
  return (
    <CommandGroup heading={heading} data-group={group.id}>
      {group.items.map((item) => (
        <CommandItem
          key={item.id}
          value={item.id}
          onSelect={() => onRun(item)}
          data-kind={item.kind}
        >
          {item.icon && <Icon name={item.icon} className="size-4" />}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate">{item.label}</span>
            {(item.description ??
              (group.id === 'recent' || group.id === 'navigation'
                ? item.groupLabel
                : undefined)) && (
              <span className="text-muted-foreground truncate text-xs">
                {item.description ?? item.groupLabel}
              </span>
            )}
          </div>
          {item.shortcut && <ShortcutKeys binding={item.shortcut} className="ms-auto" />}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}

/** A URL action next to a search result (`getGlobalSearchResultActions()`). */
function ResultAction({ action, onNavigate }: { action: ActionSchema; onNavigate: () => void }) {
  if (!action.url) return null

  const url = action.url

  return (
    <Button
      asChild
      variant="ghost"
      size="xs"
      className="h-6 px-2 text-xs"
      aria-label={action.label ? undefined : (action.tooltip ?? action.name)}
    >
      <a
        href={url}
        target={action.openUrlInNewTab ? '_blank' : undefined}
        rel={action.openUrlInNewTab ? 'noopener noreferrer' : undefined}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          // The item itself navigates on select; this button goes somewhere else.
          event.stopPropagation()

          if (action.openUrlInNewTab || event.metaKey || event.ctrlKey) return

          event.preventDefault()
          onNavigate()
          router.visit(url)
        }}
      >
        {action.icon && <Icon name={action.icon} className="size-3.5" />}
        {action.label}
      </a>
    </Button>
  )
}
