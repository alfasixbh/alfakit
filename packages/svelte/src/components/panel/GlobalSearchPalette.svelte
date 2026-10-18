<script lang="ts">
  import { uniqueKey } from '../../lib/keys'
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
  import { router } from '@inertiajs/svelte'
  import { onDestroy, untrack } from 'svelte'
  import { useActionRunner, useChoice, usePageSchema, usePanel, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
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
  import Icon from '../../lib/Icon.svelte'
  import ShortcutKeys from './ShortcutKeys.svelte'
  import { installPwa } from './pwa'
  import Slot from './Slot.svelte'

  /**
   * The command palette behind `GlobalSearch`: global search results plus (with
   * `alfakit.commandPalette`) the page's header actions, panel commands, navigation,
   * "create" links, recent records, theme switching and the shortcuts overlay. Its code
   * loads the first time the palette opens (the trigger and `mod+k` stay in the shell).
   */
  let { open = $bindable(false) }: { open?: boolean } = $props()

  type SearchGroup = GlobalSearchGroupSchema

  /** Groups listed after the global search results. */
  const TRAILING_GROUPS = new Set(['theme', 'help'])

  // A URL action next to a search result (`getGlobalSearchResultActions()`); the item itself
  // navigates on select, so the click must not reach it.
  const visitAction = (event: MouseEvent, action: ActionSchema) => {
    event.stopPropagation()

    if (!action.url || action.openUrlInNewTab || event.metaKey || event.ctrlKey) return

    event.preventDefault()
    open = false
    router.visit(action.url)
  }

  const t = useT()
  const choice = useChoice()
  const runner = useActionRunner()
  const panel = $derived(usePanel())
  const page = $derived(usePageSchema())
  const config = $derived(panel.globalSearch)
  const palette = $derived(panel.commandPalette)
  const endpoint = $derived(config ? panel.endpoints.globalSearch : undefined)
  const placeholder = $derived(
    config?.placeholder ??
      palette?.placeholder ??
      t('palette.placeholder', {}, 'Type a command or search…'),
  )
  const overlay = $derived(
    panel.keyboardShortcuts !== false && panel.keyboardShortcuts !== undefined,
  )

  let query = $state('')
  let groups = $state<SearchGroup[]>([])
  let loading = $state(false)
  let loaded = $state<CommandPaletteResponse | null>(null)

  // Create links and recent records, loaded each time the palette opens. Keyed on strings, so
  // a reload that brings a new panel object doesn't fetch them again while it is open.
  const paletteUrl = $derived(palette ? panel.endpoints.commandPalette : undefined)

  $effect(() => {
    const url = paletteUrl

    if (!open || !url) return

    let active = true

    requestJson<CommandPaletteResponse>(url)
      .then((response) => {
        if (active) loaded = response
      })
      .catch(() => {
        if (active) loaded = { create: [], recent: [] }
      })

    return () => {
      active = false
    }
  })

  const latest = createLatestRequest()

  const search = debounce((term: string) => {
    const url = endpoint

    if (!url || term.trim() === '') {
      latest.cancel()
      groups = []
      loading = false

      return
    }

    // Only the newest request may update the results: older responses are aborted/dropped.
    void latest
      .run(
        (signal) =>
          requestJson<{ groups: SearchGroup[] }>(url, { query: { search: term }, signal }),
        (response) => (groups = response.groups),
        () => (loading = false),
      )
      .catch(() => (groups = []))
  }, globalSearchDebounce(usePanel().globalSearch))

  $effect(() => {
    loading = untrack(() => endpoint) !== undefined && query.trim() !== ''
    search(query)
  })

  onDestroy(() => {
    search.cancel()
    latest.cancel()
  })

  // Closing the palette (or navigating away) starts the next search from scratch.
  const reset = () => {
    search.cancel()
    latest.cancel()
    query = ''
    groups = []
    loading = false
    loaded = null
  }

  $effect(() => {
    if (!open) untrack(reset)
  })

  // Navigating away closes the palette (the trigger also does, when the code has not loaded yet).
  $effect(() =>
    router.on('navigate', () => {
      open = false
      reset()
    }),
  )

  // `Panel::pwa()`: "Install app" while the browser offers it (or on iOS Safari).
  const pwaState = useStore(pwaStore)
  const installable = $derived(Boolean(panel.pwa) && canInstallPwa(pwaState.current))

  const items = $derived(
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
  )
  const local = $derived(filterCommandPalette(items, query))
  const leading = $derived(local.filter((group) => !TRAILING_GROUPS.has(group.id)))
  const trailing = $derived(local.filter((group) => TRAILING_GROUPS.has(group.id)))

  // Announced by the `aria-live` region once a search has finished.
  const status = $derived(
    globalSearchStatus(
      query,
      loading,
      [...groups, ...local.map((group) => ({ results: group.items }))],
      { t, choice },
    ),
  )

  const defaultGroupLabels: Record<string, string> = {
    recent: 'Recent',
    actions: 'Actions',
    commands: 'Commands',
    create: 'Create',
    navigation: 'Go to',
    theme: 'Theme',
    help: 'Help',
  }

  const heading = (group: PaletteGroup) => {
    const id = group.id.startsWith('commands:') ? 'commands' : group.id

    return group.label ?? t(paletteGroupKey(group.id), {}, defaultGroupLabels[id] ?? id)
  }

  const subtitle = (group: PaletteGroup, item: PaletteItem) =>
    item.description ??
    (group.id === 'recent' || group.id === 'navigation' ? item.groupLabel : undefined)

  const run = (item: PaletteItem) => {
    open = false

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
      const id = item.shortcutId
      // After the dialog closed, so focus returns to the page before the overlay opens.
      setTimeout(() => shortcuts.trigger(id), 0)
    } else if (item.kind === 'install') {
      void installPwa(t)
    }
  }
</script>

{#snippet paletteGroup(group: PaletteGroup)}
  <CommandGroup heading={heading(group)} data-group={group.id}>
    {#each group.items as item (item.id)}
      <CommandItem value={item.id} data-kind={item.kind} onSelect={() => run(item)}>
        {#if item.icon}<Icon name={item.icon} class="size-4" />{/if}
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="truncate">{item.label}</span>
          {#if subtitle(group, item)}
            <span class="text-muted-foreground truncate text-xs">{subtitle(group, item)}</span>
          {/if}
        </div>
        {#if item.shortcut}<ShortcutKeys binding={item.shortcut} class="ms-auto" />{/if}
      </CommandItem>
    {/each}
  </CommandGroup>
{/snippet}

<CommandDialog
  bind:open
  title={palette ? t('command_palette', {}, 'Command palette') : t('search', {}, 'Search')}
  description={placeholder}
  shouldFilter={false}
>
  <Slot name="global-search.start" />
  <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">{status}</div>
  <CommandInput {placeholder} bind:value={query} />
  <CommandList>
    {#if !loading}
      <CommandEmpty>{query ? t('no_results', {}, 'No results.') : placeholder}</CommandEmpty>
    {/if}
    {#each leading as group (group.id)}
      {@render paletteGroup(group)}
    {/each}
    {#if loading}
      <div class="flex justify-center py-6"><Spinner /></div>
    {/if}
    {#each groups as group, groupIndex (uniqueKey(groups, groupIndex, (item) => item.label))}
      <CommandGroup heading={group.label} data-group="search">
        {#each group.results as result, resultIndex (uniqueKey(group.results, resultIndex, (item) => item.url))}
          <CommandItem
            value={`search:${group.label}:${result.url}`}
            onSelect={() => {
              open = false
              router.visit(result.url)
            }}
          >
            <div class="flex min-w-0 flex-1 flex-col">
              <span>{result.title}</span>
              {#if result.details}
                <span class="text-muted-foreground text-xs">
                  {Object.entries(result.details)
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(' · ')}
                </span>
              {/if}
            </div>
            {#if result.actions?.length}
              <div data-slot="global-search-actions" class="ms-auto flex shrink-0 gap-1">
                {#each result.actions.filter((item) => item.url) as action (action.name)}
                  <Button
                    href={action.url}
                    external
                    variant="ghost"
                    size="xs"
                    class="h-6 px-2 text-xs"
                    target={action.openUrlInNewTab ? '_blank' : undefined}
                    rel={action.openUrlInNewTab ? 'noopener noreferrer' : undefined}
                    aria-label={action.label ? undefined : (action.tooltip ?? action.name)}
                    onpointerdown={(event: PointerEvent) => event.stopPropagation()}
                    onclick={(event: MouseEvent) => visitAction(event, action)}
                  >
                    {#if action.icon}<Icon name={action.icon} class="size-3.5" />{/if}
                    {action.label}
                  </Button>
                {/each}
              </div>
            {/if}
          </CommandItem>
        {/each}
      </CommandGroup>
    {/each}
    {#each trailing as group (group.id)}
      {@render paletteGroup(group)}
    {/each}
  </CommandList>
  <Slot name="global-search.end" />
</CommandDialog>
