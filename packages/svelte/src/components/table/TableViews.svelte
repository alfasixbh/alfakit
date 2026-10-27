<script lang="ts">
  import type { TableSchema, TableViewItemSchema, TableViewOperation } from '@alfakit/core'
  import {
    activeTableView,
    groupTableViews,
    inertiaReload,
    requestTableView,
    tabKeyTarget,
    tableViewError,
    tableViewFollowUp,
    visitTableView,
  } from '@alfakit/core'
  import BookmarkIcon from '@lucide/svelte/icons/bookmark'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw'
  import StarIcon from '@lucide/svelte/icons/star'
  import UsersIcon from '@lucide/svelte/icons/users'
  import { useDirection, usePanel, useT } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { showToast } from '../notifications/toast'
  import Slot from '../panel/Slot.svelte'
  import { Button } from '../ui/button'
  import { Checkbox } from '../ui/checkbox'
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '../ui/dialog'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '../ui/dropdown-menu'
  import { Input } from '../ui/input'
  import { Label } from '../ui/label'

  /**
   * Saved views above a table (`Table::savedViews()` / `views()`): the views as tabs (or a
   * dropdown) and a menu to save the current state as a new view, update, rename, share
   * or delete the active one, pick a default and reset changes. Each view is a URL
   * (`?view=slug`), so it can be shared.
   */
  let { table, token, component }: { table: TableSchema; token: string; component: string } =
    $props()

  type NameDialog = { mode: 'create' } | { mode: 'rename'; view: TableViewItemSchema } | null

  const t = useT()
  const panel = usePanel()
  const direction = useDirection()

  let dialog = $state<NameDialog>(null)
  let confirmDelete = $state<TableViewItemSchema | null>(null)
  let name = $state('')
  let shared = $state(false)
  let error = $state<string | undefined>()
  let busy = $state(false)
  const tabs: Array<HTMLButtonElement | null> = []

  const views = $derived(table.views)
  const active = $derived(activeTableView(views))
  const groups = $derived(groupTableViews(views?.items ?? []))
  const activeKey = $derived(views?.active ?? null)
  const items = $derived<Array<TableViewItemSchema | null>>([null, ...(views?.items ?? [])])
  const focusable = $derived.by(() => {
    const index = items.findIndex((item) => (item?.key ?? null) === activeKey)

    return index === -1 ? 0 : index
  })
  const canUpdate = $derived(Boolean(active?.editable && views?.canSave))
  const hasMenu = $derived(Boolean(views?.canSave || views?.canSetDefault || views?.modified))
  const isDefault = $derived(Boolean(active?.default) || (!active && views?.userDefault === ''))
  const sections = $derived([
    ['preset', t('table.views.presets', {}, 'Views')],
    ['shared', t('table.views.shared', {}, 'Team views')],
    ['personal', t('table.views.personal', {}, 'My views')],
  ] as const)
  const nameId = $derived(`${component}-view-name`)
  const sharedId = $derived(`${component}-view-shared`)

  const open = (key: string | null) => visitTableView(table, key)

  async function run(operation: TableViewOperation, success?: string): Promise<boolean> {
    const endpoint = panel.endpoints.tableViews

    if (!endpoint) return false

    busy = true
    error = undefined

    try {
      const response = await requestTableView(endpoint, token, component, operation)
      const next = tableViewFollowUp(table, operation, response)

      if ('open' in next) {
        open(next.open)
      } else {
        inertiaReload()
      }

      if (success) {
        showToast({
          id: 'alfakit-table-view',
          title: success,
          status: 'success',
          format: 'alfakit',
        })
      }

      return true
    } catch (failure) {
      const message = tableViewError(failure)

      if (dialog) {
        error = message ?? t('table.views.failed', {}, "Couldn't save the view")
      } else {
        showToast({
          id: 'alfakit-table-view-failed',
          title: t('table.views.failed', {}, "Couldn't save the view"),
          body: message,
          status: 'danger',
          format: 'alfakit',
        })
      }

      return false
    } finally {
      busy = false
    }
  }

  function openDialog(next: NameDialog) {
    name = next?.mode === 'rename' ? next.view.label : ''
    shared = false
    error = undefined
    dialog = next
  }

  async function submitName(event: SubmitEvent) {
    event.preventDefault()

    const current = dialog

    if (!current) return

    const ok =
      current.mode === 'create'
        ? await run({ operation: 'create', name, shared }, t('table.views.saved', {}, 'View saved'))
        : await run({ operation: 'rename', view: current.view.key, name })

    if (ok) dialog = null
  }

  async function deleteView() {
    const view = confirmDelete

    if (!view) return

    if (
      await run(
        { operation: 'delete', view: view.key },
        t('table.views.deleted', {}, 'View deleted'),
      )
    ) {
      confirmDelete = null
    }
  }

  function onTabKeyDown(event: KeyboardEvent, index: number) {
    const target = tabKeyTarget(event.key, index, items.length, direction)

    if (target === null) return

    event.preventDefault()
    tabs[target]?.focus()
  }
</script>

{#snippet viewLabel(item: TableViewItemSchema)}
  {#if item.icon}<Icon name={item.icon} class="size-4" />{/if}
  <span class="truncate">{item.label}</span>
  {#if item.type === 'shared'}
    <Icon
      name="alfakit::tables.views.shared"
      fallback={UsersIcon}
      class="text-muted-foreground size-3.5"
      aria-label={t('table.views.shared_badge', {}, 'Shared')}
    />
  {/if}
  {#if item.default}
    <Icon
      name="alfakit::tables.views.default"
      fallback={StarIcon}
      class="text-muted-foreground size-3.5"
      aria-label={t('table.views.default_badge', {}, 'Default')}
    />
  {/if}
{/snippet}

{#if views}
  <div data-slot="table-views" class="flex flex-wrap items-center gap-2">
    <Slot name="table.views.before" scope={component} />
    {#if views.layout === 'dropdown'}
      <DropdownMenu>
        <DropdownMenuTrigger>
          {#snippet child({ props })}
            <Button
              {...props}
              type="button"
              variant="outline"
              size="sm"
              data-slot="table-views-trigger"
            >
              <Icon name="alfakit::tables.views.trigger" fallback={BookmarkIcon} />
              <span class="max-w-48 truncate"
                >{active?.label ?? t('table.views.all', {}, 'All')}</span
              >
              <ChevronDownIcon class="opacity-60" />
            </Button>
          {/snippet}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="min-w-56">
          <DropdownMenuRadioGroup
            value={activeKey ?? ''}
            onValueChange={(key) => open(key === '' ? null : key)}
          >
            <DropdownMenuRadioItem value="">{t('table.views.all', {}, 'All')}</DropdownMenuRadioItem
            >
            {#each sections as [type, label] (type)}
              {#if groups[type].length > 0}
                <div role="group" aria-label={label}>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel class="text-muted-foreground text-xs"
                    >{label}</DropdownMenuLabel
                  >
                  {#each groups[type] as item (item.key)}
                    <DropdownMenuRadioItem value={item.key} class="gap-2">
                      {@render viewLabel(item)}
                    </DropdownMenuRadioItem>
                  {/each}
                </div>
              {/if}
            {/each}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    {:else}
      <div
        role="tablist"
        aria-label={t('table.views.label', {}, 'Views')}
        data-slot="table-views-tabs"
        class="bg-muted text-muted-foreground inline-flex h-9 w-fit max-w-full items-center overflow-x-auto rounded-lg p-[3px]"
      >
        {#each items as item, index (item?.key ?? '')}
          {@const selected = (item?.key ?? null) === activeKey}
          <button
            bind:this={tabs[index]}
            type="button"
            role="tab"
            aria-selected={selected}
            tabindex={index === focusable ? 0 : -1}
            data-state={selected ? 'active' : 'inactive'}
            class={cn(
              'inline-flex h-[calc(100%-1px)] shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-none',
              'focus-visible:border-ring focus-visible:ring-ring/50',
              selected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-foreground/70 hover:text-foreground',
            )}
            onclick={() => !selected && open(item?.key ?? null)}
            onkeydown={(event) => onTabKeyDown(event, index)}
          >
            {#if item}{@render viewLabel(item)}{:else}{t('table.views.all', {}, 'All')}{/if}
          </button>
        {/each}
      </div>
    {/if}
    {#if views.modified}
      <span data-slot="table-views-modified" class="text-muted-foreground text-xs italic">
        {t('table.views.modified', {}, 'Modified')}
      </span>
    {/if}
    {#if hasMenu}
      <DropdownMenu>
        <DropdownMenuTrigger>
          {#snippet child({ props })}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              aria-label={t('table.views.actions', {}, 'View options')}
              {...props}
            >
              <ChevronDownIcon />
            </Button>
          {/snippet}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="min-w-52">
          {#if views.canSave}
            <DropdownMenuItem onSelect={() => openDialog({ mode: 'create' })}>
              {t('table.views.save_new', {}, 'Save as new view')}
            </DropdownMenuItem>
          {/if}
          {#if canUpdate && active && views.modified}
            {@const view = active}
            <DropdownMenuItem
              onSelect={() =>
                void run(
                  { operation: 'update', view: view.key },
                  t('table.views.saved', {}, 'View saved'),
                )}
            >
              {t('table.views.update', {}, 'Update view')}
            </DropdownMenuItem>
          {/if}
          {#if views.modified}
            <DropdownMenuItem onSelect={() => open(activeKey)}>
              <RotateCcwIcon />
              {t('table.views.reset', {}, 'Reset changes')}
            </DropdownMenuItem>
          {/if}
          {#if canUpdate && active}
            {@const view = active}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => openDialog({ mode: 'rename', view })}>
              {t('table.views.rename', {}, 'Rename view')}
            </DropdownMenuItem>
            {#if views.canShare}
              <DropdownMenuItem
                onSelect={() =>
                  void run({ operation: 'share', view: view.key, shared: view.type !== 'shared' })}
              >
                {view.type === 'shared'
                  ? t('table.views.unshare', {}, 'Stop sharing')
                  : t('table.views.share', {}, 'Share with team')}
              </DropdownMenuItem>
            {/if}
            <DropdownMenuItem variant="destructive" onSelect={() => (confirmDelete = view)}>
              {t('table.views.delete', {}, 'Delete view')}
            </DropdownMenuItem>
          {/if}
          {#if views.canSetDefault}
            <DropdownMenuSeparator />
            {#if isDefault}
              <DropdownMenuItem onSelect={() => void run({ operation: 'default', view: null })}>
                {t('table.views.clear_default', {}, 'Clear my default')}
              </DropdownMenuItem>
            {:else}
              <DropdownMenuItem
                onSelect={() => void run({ operation: 'default', view: active?.key ?? '' })}
              >
                {t('table.views.set_default', {}, 'Set as my default')}
              </DropdownMenuItem>
            {/if}
          {/if}
        </DropdownMenuContent>
      </DropdownMenu>
    {/if}
    <Slot name="table.views.after" scope={component} />

    <Dialog open={dialog !== null} onOpenChange={(value) => !value && (dialog = null)}>
      <DialogContent class="sm:max-w-md">
        <form data-slot="table-view-form" class="flex flex-col gap-4" onsubmit={submitName}>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === 'rename'
                ? t('table.views.rename', {}, 'Rename view')
                : t('table.views.save_new', {}, 'Save as new view')}
            </DialogTitle>
            <DialogDescription class="sr-only">
              {t(
                'table.views.name_help',
                {},
                'Saves the filters, search, sort, columns and grouping.',
              )}
            </DialogDescription>
          </DialogHeader>
          <div class="flex flex-col gap-2">
            <Label for={nameId}>{t('table.views.name', {}, 'Name')}</Label>
            <Input
              id={nameId}
              bind:value={name}
              maxlength={120}
              autofocus
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${nameId}-error` : undefined}
            />
            {#if error}
              <p id={`${nameId}-error`} class="text-destructive text-sm">{error}</p>
            {/if}
          </div>
          {#if dialog?.mode === 'create' && views.canShare}
            <div class="flex items-center gap-2">
              <Checkbox
                id={sharedId}
                checked={shared}
                onCheckedChange={(checked) => (shared = checked === true)}
              />
              <Label for={sharedId}>{t('table.views.share', {}, 'Share with team')}</Label>
            </div>
          {/if}
          <DialogFooter>
            <Button type="button" variant="outline" onclick={() => (dialog = null)}>
              {t('cancel', {}, 'Cancel')}
            </Button>
            <Button type="submit" disabled={busy || name.trim() === ''}
              >{t('save', {}, 'Save')}</Button
            >
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog
      open={confirmDelete !== null}
      onOpenChange={(value) => !value && (confirmDelete = null)}
    >
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('table.views.delete', {}, 'Delete view')}</DialogTitle>
          <DialogDescription>
            {t(
              'table.views.delete_confirm',
              { name: confirmDelete?.label ?? '' },
              'Delete the view ":name"?',
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onclick={() => (confirmDelete = null)}>
            {t('cancel', {}, 'Cancel')}
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onclick={deleteView}>
            {t('table.views.delete', {}, 'Delete view')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
{/if}
