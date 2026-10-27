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
import { BookmarkIcon, ChevronDownIcon, RotateCcwIcon, StarIcon, UsersIcon } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { useDirection, usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { showToast } from '../notifications/flash-toasts'
import { Slot } from '../panel/slot'
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

type NameDialog = { mode: 'create' } | { mode: 'rename'; view: TableViewItemSchema } | null

/**
 * Saved views above a table (`Table::savedViews()` / `views()`): the views as tabs (or a
 * dropdown) and a menu to save the current state as a new view, update, rename, share
 * or delete the active one, pick a default and reset changes. Each view is a URL
 * (`?view=slug`), so it can be shared.
 */
export function TableViews({
  table,
  token,
  component,
}: {
  table: TableSchema
  token: string
  component: string
}) {
  const t = useT()
  const panel = usePanel()
  const direction = useDirection()
  const views = table.views
  const [dialog, setDialog] = useState<NameDialog>(null)
  const [confirmDelete, setConfirmDelete] = useState<TableViewItemSchema | null>(null)
  const [name, setName] = useState('')
  const [shared, setShared] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const tabs = useRef<Array<HTMLButtonElement | null>>([])

  if (!views) return null

  const active = activeTableView(views)
  const groups = groupTableViews(views.items)
  const endpoint = panel.endpoints.tableViews

  const run = async (operation: TableViewOperation, success?: string): Promise<boolean> => {
    if (!endpoint) return false

    setBusy(true)
    setError(undefined)

    try {
      const response = await requestTableView(endpoint, token, component, operation)
      const next = tableViewFollowUp(table, operation, response)

      if ('open' in next) {
        visitTableView(table, next.open)
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
        setError(message ?? t('table.views.failed', {}, "Couldn't save the view"))
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
      setBusy(false)
    }
  }

  const openDialog = (next: NameDialog) => {
    setName(next?.mode === 'rename' ? next.view.label : '')
    setShared(false)
    setError(undefined)
    setDialog(next)
  }

  const submitName = async () => {
    if (!dialog) return

    const ok =
      dialog.mode === 'create'
        ? await run({ operation: 'create', name, shared }, t('table.views.saved', {}, 'View saved'))
        : await run({ operation: 'rename', view: dialog.view.key, name })

    if (ok) setDialog(null)
  }

  const allLabel = t('table.views.all', {}, 'All')
  const items: Array<TableViewItemSchema | null> = [null, ...views.items]
  const activeKey = views.active ?? null
  const focusable = items.findIndex((item) => (item?.key ?? null) === activeKey)

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = tabKeyTarget(event.key, index, items.length, direction)

    if (target === null) return

    event.preventDefault()
    tabs.current[target]?.focus()
  }

  const viewLabel = (item: TableViewItemSchema) => (
    <>
      {item.icon && <Icon name={item.icon} className="size-4" />}
      <span className="truncate">{item.label}</span>
      {item.type === 'shared' && (
        <Icon
          name="alfakit::tables.views.shared"
          fallback={UsersIcon}
          className="text-muted-foreground size-3.5"
          aria-label={t('table.views.shared_badge', {}, 'Shared')}
        />
      )}
      {item.default && (
        <Icon
          name="alfakit::tables.views.default"
          fallback={StarIcon}
          className="text-muted-foreground size-3.5"
          aria-label={t('table.views.default_badge', {}, 'Default')}
        />
      )}
    </>
  )

  const switcher =
    views.layout === 'dropdown' ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" data-slot="table-views-trigger">
            <Icon name="alfakit::tables.views.trigger" fallback={BookmarkIcon} />
            <span className="max-w-48 truncate">{active?.label ?? allLabel}</span>
            <ChevronDownIcon className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuRadioGroup
            value={activeKey ?? ''}
            onValueChange={(key) => visitTableView(table, key === '' ? null : key)}
          >
            <DropdownMenuRadioItem value="">{allLabel}</DropdownMenuRadioItem>
            {(
              [
                ['preset', t('table.views.presets', {}, 'Views')],
                ['shared', t('table.views.shared', {}, 'Team views')],
                ['personal', t('table.views.personal', {}, 'My views')],
              ] as const
            ).map(([type, label]) =>
              groups[type].length > 0 ? (
                <div key={type} role="group" aria-label={label}>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    {label}
                  </DropdownMenuLabel>
                  {groups[type].map((item) => (
                    <DropdownMenuRadioItem key={item.key} value={item.key} className="gap-2">
                      {viewLabel(item)}
                    </DropdownMenuRadioItem>
                  ))}
                </div>
              ) : null,
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <div
        role="tablist"
        aria-label={t('table.views.label', {}, 'Views')}
        data-slot="table-views-tabs"
        className="bg-muted text-muted-foreground inline-flex h-9 w-fit max-w-full items-center overflow-x-auto rounded-lg p-[3px]"
      >
        {items.map((item, index) => {
          const selected = (item?.key ?? null) === activeKey

          return (
            <button
              key={item?.key ?? ''}
              ref={(element) => {
                tabs.current[index] = element
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={index === (focusable === -1 ? 0 : focusable) ? 0 : -1}
              data-state={selected ? 'active' : 'inactive'}
              className={cn(
                'inline-flex h-[calc(100%-1px)] shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-none',
                'focus-visible:border-ring focus-visible:ring-ring/50',
                selected
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-foreground/70 hover:text-foreground',
              )}
              onClick={() => !selected && visitTableView(table, item?.key ?? null)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              {item ? viewLabel(item) : allLabel}
            </button>
          )
        })}
      </div>
    )

  const canUpdate = Boolean(active?.editable && views.canSave)
  const hasMenu = Boolean(views.canSave || views.canSetDefault || views.modified)

  return (
    <div data-slot="table-views" className="flex flex-wrap items-center gap-2">
      <Slot name="table.views.before" scope={component} />
      {switcher}
      {views.modified && (
        <span data-slot="table-views-modified" className="text-muted-foreground text-xs italic">
          {t('table.views.modified', {}, 'Modified')}
        </span>
      )}
      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              aria-label={t('table.views.actions', {}, 'View options')}
            >
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-52">
            {views.canSave && (
              <DropdownMenuItem onSelect={() => openDialog({ mode: 'create' })}>
                {t('table.views.save_new', {}, 'Save as new view')}
              </DropdownMenuItem>
            )}
            {canUpdate && active && views.modified && (
              <DropdownMenuItem
                onSelect={() =>
                  void run(
                    { operation: 'update', view: active.key },
                    t('table.views.saved', {}, 'View saved'),
                  )
                }
              >
                {t('table.views.update', {}, 'Update view')}
              </DropdownMenuItem>
            )}
            {views.modified && (
              <DropdownMenuItem onSelect={() => visitTableView(table, activeKey)}>
                <RotateCcwIcon />
                {t('table.views.reset', {}, 'Reset changes')}
              </DropdownMenuItem>
            )}
            {canUpdate && active && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => openDialog({ mode: 'rename', view: active })}>
                  {t('table.views.rename', {}, 'Rename view')}
                </DropdownMenuItem>
                {views.canShare && (
                  <DropdownMenuItem
                    onSelect={() =>
                      void run({
                        operation: 'share',
                        view: active.key,
                        shared: active.type !== 'shared',
                      })
                    }
                  >
                    {active.type === 'shared'
                      ? t('table.views.unshare', {}, 'Stop sharing')
                      : t('table.views.share', {}, 'Share with team')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(active)}>
                  {t('table.views.delete', {}, 'Delete view')}
                </DropdownMenuItem>
              </>
            )}
            {views.canSetDefault && (
              <>
                <DropdownMenuSeparator />
                {(active?.default ?? false) || (!active && views.userDefault === '') ? (
                  <DropdownMenuItem onSelect={() => void run({ operation: 'default', view: null })}>
                    {t('table.views.clear_default', {}, 'Clear my default')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onSelect={() => void run({ operation: 'default', view: active?.key ?? '' })}
                  >
                    {t('table.views.set_default', {}, 'Set as my default')}
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Slot name="table.views.after" scope={component} />

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <form
            data-slot="table-view-form"
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void submitName()
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {dialog?.mode === 'rename'
                  ? t('table.views.rename', {}, 'Rename view')
                  : t('table.views.save_new', {}, 'Save as new view')}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t(
                  'table.views.name_help',
                  {},
                  'Saves the filters, search, sort, columns and grouping.',
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${component}-view-name`}>{t('table.views.name', {}, 'Name')}</Label>
              <Input
                id={`${component}-view-name`}
                value={name}
                maxLength={120}
                autoFocus
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${component}-view-name-error` : undefined}
                onChange={(event) => setName(event.target.value)}
              />
              {error && (
                <p id={`${component}-view-name-error`} className="text-destructive text-sm">
                  {error}
                </p>
              )}
            </div>
            {dialog?.mode === 'create' && views.canShare && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${component}-view-shared`}
                  checked={shared}
                  onCheckedChange={(checked) => setShared(checked === true)}
                />
                <Label htmlFor={`${component}-view-shared`}>
                  {t('table.views.share', {}, 'Share with team')}
                </Label>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>
                {t('cancel', {}, 'Cancel')}
              </Button>
              <Button type="submit" disabled={busy || name.trim() === ''}>
                {t('save', {}, 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
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
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)}>
              {t('cancel', {}, 'Cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (!confirmDelete) return

                if (
                  await run(
                    { operation: 'delete', view: confirmDelete.key },
                    t('table.views.deleted', {}, 'View deleted'),
                  )
                ) {
                  setConfirmDelete(null)
                }
              }}
            >
              {t('table.views.delete', {}, 'Delete view')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
