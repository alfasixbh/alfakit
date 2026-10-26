import type {
  DashboardCustomizeSchema,
  WidgetsBlock as WidgetsBlockSchema,
  WidgetSchema,
} from '@alfakit/core'
import {
  columnSpanClasses,
  DashboardEditor,
  dashboardMoveForKey,
  gridColumnsClasses,
  isLazyPlaceholder,
} from '@alfakit/core'
import { router } from '@inertiajs/react'
import {
  CheckIcon,
  EyeOffIcon,
  GripVerticalIcon,
  LayoutDashboardIcon,
  PlusIcon,
  RotateCcwIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useId, useMemo, type ReactNode } from 'react'
import { useDirection, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { cn } from '../../lib/utils'
import { LazyWidgetPlaceholder } from '../panel/lazy-placeholder'
import { Button } from '../ui/button'

/**
 * A customizable dashboard (`Dashboard::customizable()`): the widget grid plus an "Edit
 * dashboard" mode where widgets are dragged (pointer) or moved with the arrow keys on their
 * handle, resized, hidden and added from the library. The layout is saved on the server.
 */
export function CustomizableWidgetGrid({
  block,
  customize,
  renderWidget,
}: {
  block: WidgetsBlockSchema
  customize: DashboardCustomizeSchema
  renderWidget: (widget: WidgetSchema) => ReactNode
}) {
  const t = useT()
  const dir = useDirection()
  const helpId = useId()
  const editor = useMemo(
    () => new DashboardEditor(customize, { t, onSaved: () => router.reload() }),
    // One editor per dashboard; `sync()` follows later schemas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customize.endpoint, customize.token],
  )

  useEffect(() => editor.sync(customize), [editor, customize])

  const state = useStore(editor.store)
  const widgets = new Map(block.widgets.map((widget) => [widget.id, widget]))
  const visible = state.layout.filter((entry) => !entry.hidden)
  const available = editor.available()

  return (
    <div
      data-slot="dashboard"
      data-editing={state.editing ? '' : undefined}
      className="flex flex-col gap-4"
    >
      <div
        data-slot="dashboard-toolbar"
        role="toolbar"
        aria-label={t('dashboard.customize.toolbar', {}, 'Dashboard layout')}
        className="flex flex-wrap items-center justify-end gap-2"
      >
        {state.editing ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={state.saving}
              onClick={() => {
                editor.resetDraft()
              }}
            >
              <RotateCcwIcon aria-hidden="true" />
              {t('dashboard.customize.reset', {}, 'Reset to default')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={state.saving}
              onClick={() => editor.cancel()}
            >
              <XIcon aria-hidden="true" />
              {t('dashboard.customize.cancel', {}, 'Cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={state.saving}
              onClick={() => void editor.save()}
            >
              <CheckIcon aria-hidden="true" />
              {t('dashboard.customize.save', {}, 'Save')}
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => editor.start()}>
            <LayoutDashboardIcon aria-hidden="true" />
            {t('dashboard.customize.edit', {}, 'Edit dashboard')}
          </Button>
        )}
      </div>

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      {state.editing && (
        <p id={helpId} className="sr-only">
          {t(
            'dashboard.customize.move_help',
            {},
            'Use the arrow keys to move the widget, Home or End to move it to the start or end.',
          )}
        </p>
      )}

      {visible.length === 0 ? (
        <p
          data-slot="dashboard-empty"
          className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm"
        >
          {t('dashboard.customize.empty', {}, 'No widgets on this dashboard yet.')}
        </p>
      ) : (
        <div data-slot="widgets" className={cn('grid gap-6', gridColumnsClasses(block.columns))}>
          {visible.map((entry) => {
            const widget = widgets.get(entry.id)
            const library = editor.widget(entry.id)
            const label = editor.label(entry.id)
            const span = editor.spanOf(entry.id)
            const columnSpan =
              state.editing && library
                ? (library.spans.find((option) => option.value === span)?.columnSpan ??
                  widget?.columnSpan)
                : widget?.columnSpan

            const content = widget ? (
              isLazyPlaceholder(widget) ? (
                <LazyWidgetPlaceholder widget={widget} />
              ) : (
                renderWidget(widget)
              )
            ) : (
              <div className="bg-card text-muted-foreground flex min-h-24 items-center justify-center rounded-xl border border-dashed p-6 text-sm">
                {t(
                  'dashboard.customize.pending',
                  { widget: label },
                  ':widget appears once you save.',
                )}
              </div>
            )

            if (!state.editing) {
              return (
                <div key={entry.id} className={cn('min-w-0', columnSpanClasses(columnSpan))}>
                  {content}
                </div>
              )
            }

            return (
              <div
                key={entry.id}
                data-slot="dashboard-widget"
                data-dragging={state.dragging === entry.id ? '' : undefined}
                role="group"
                aria-label={label}
                className={cn(
                  'relative min-w-0 rounded-xl border-2 border-dashed p-1',
                  state.dragging === entry.id && 'opacity-50',
                  columnSpanClasses(columnSpan),
                )}
                onDragOver={(event) => {
                  if (state.dragging !== null) event.preventDefault()
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  editor.dropOn(entry.id)
                }}
              >
                <div
                  data-slot="dashboard-widget-controls"
                  className="bg-background/95 absolute inset-x-2 top-2 z-10 flex items-center gap-1 rounded-md border p-1 shadow-sm"
                >
                  <button
                    type="button"
                    data-slot="dashboard-widget-handle"
                    draggable
                    aria-label={t('dashboard.customize.move', { widget: label }, 'Move :widget')}
                    aria-describedby={helpId}
                    aria-roledescription={t('dashboard.customize.sortable', {}, 'sortable')}
                    className="hover:bg-accent focus-visible:ring-ring/50 cursor-grab rounded p-1 outline-none focus-visible:ring-[3px] active:cursor-grabbing"
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData('text/plain', entry.id)
                      editor.dragStart(entry.id)
                    }}
                    onDragEnd={() => editor.dragEnd()}
                    onKeyDown={(event) => {
                      const move = dashboardMoveForKey(event.key, dir)

                      if (move !== null) {
                        event.preventDefault()
                        editor.move(entry.id, move)
                        // Keep focus on the moved widget's handle.
                        const target = event.currentTarget
                        requestAnimationFrame(() => target.focus())
                      }
                    }}
                  >
                    <GripVerticalIcon className="size-4" aria-hidden="true" />
                  </button>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
                  {library && library.spans.length > 1 && (
                    <select
                      data-slot="dashboard-widget-span"
                      aria-label={t(
                        'dashboard.customize.size',
                        { widget: label },
                        'Size of :widget',
                      )}
                      className="border-input bg-background h-7 rounded-md border px-1 text-xs"
                      value={span}
                      onChange={(event) => editor.setSpan(entry.id, Number(event.target.value))}
                    >
                      {library.spans.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t('dashboard.customize.hide', { widget: label }, 'Hide :widget')}
                    onClick={() => editor.hide(entry.id)}
                  >
                    <EyeOffIcon aria-hidden="true" />
                  </Button>
                </div>
                {/* The widget itself is inert while editing: focus stays on the controls. */}
                <div inert className="pointer-events-none pt-12 select-none" aria-hidden="true">
                  {content}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {state.editing && (
        <section
          data-slot="dashboard-library"
          aria-label={t('dashboard.customize.library', {}, 'Widget library')}
          className="bg-muted/40 flex flex-col gap-3 rounded-xl border p-4"
        >
          <h2 className="text-sm font-medium">{t('dashboard.customize.add', {}, 'Add widget')}</h2>
          {available.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('dashboard.customize.library_empty', {}, 'Every widget is on the dashboard.')}
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {available.map((widget) => (
                <li key={widget.id}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title={widget.description}
                    aria-label={t(
                      'dashboard.customize.add_widget',
                      { widget: widget.label },
                      'Add :widget',
                    )}
                    onClick={() => editor.add(widget.id)}
                  >
                    <PlusIcon aria-hidden="true" />
                    {widget.label}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div data-slot="dashboard-announcer" role="status" aria-live="polite" className="sr-only">
        {state.announcement}
      </div>
    </div>
  )
}
