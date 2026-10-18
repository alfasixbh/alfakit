<script lang="ts">
  import type {
    DashboardCustomizeSchema,
    LazyWidgetSchema,
    WidgetsBlock,
    WidgetSchema,
  } from '@alfakit/core'
  import {
    columnSpanClasses,
    DashboardEditor,
    dashboardMoveForKey,
    gridColumnsClasses,
    isLazyPlaceholder,
  } from '@alfakit/core'
  import { router } from '@inertiajs/svelte'
  import CheckIcon from '@lucide/svelte/icons/check'
  import EyeOffIcon from '@lucide/svelte/icons/eye-off'
  import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical'
  import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw'
  import XIcon from '@lucide/svelte/icons/x'
  import { tick, untrack } from 'svelte'
  import { useDirection, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { cn } from '../../lib/utils'
  import LazyPlaceholder from '../panel/LazyPlaceholder.svelte'
  import { Button } from '../ui/button'
  import WidgetRenderer from './WidgetRenderer.svelte'

  /**
   * A customizable dashboard (`Dashboard::customizable()`): the widget grid plus an "Edit
   * dashboard" mode (drag or arrow keys on the handle to move, resize, hide, add from the
   * library). Mirrors the React renderer.
   */
  let { block, customize }: { block: WidgetsBlock; customize: DashboardCustomizeSchema } = $props()

  const t = useT()
  const dir = $derived(useDirection())
  const uid = $props.id()
  const helpId = `dashboard-help-${uid}`
  const editor = untrack(
    () => new DashboardEditor(customize, { t, onSaved: () => router.reload() }),
  )

  $effect(() => editor.sync(customize))

  const state = useStore(editor.store)
  const widgets = $derived(new Map(block.widgets.map((widget) => [widget.id, widget])))

  interface Cell {
    id: string
    label: string
    widget: WidgetSchema | null
    lazy: LazyWidgetSchema | null
    columnSpan: WidgetSchema['columnSpan'] | undefined
  }

  const cells = $derived<Cell[]>(
    state.current.layout
      .filter((entry) => !entry.hidden)
      .map((entry) => {
        const widget = widgets.get(entry.id)
        const lazy = widget && isLazyPlaceholder(widget) ? (widget as LazyWidgetSchema) : null
        const library = editor.widget(entry.id)
        const span = entry.span ?? library?.span ?? 1

        return {
          id: entry.id,
          label: editor.label(entry.id),
          widget: widget && !lazy ? (widget as WidgetSchema) : null,
          lazy,
          columnSpan:
            state.current.editing && library
              ? (library.spans.find((option) => option.value === span)?.columnSpan ??
                widget?.columnSpan)
              : widget?.columnSpan,
        }
      }),
  )

  const available = $derived.by(() => {
    void state.current

    return editor.available()
  })

  async function onHandleKeydown(event: KeyboardEvent, id: string) {
    const move = dashboardMoveForKey(event.key, dir)

    if (move === null) return

    event.preventDefault()
    const target = event.currentTarget as HTMLElement
    editor.move(id, move)
    await tick()
    target.focus()
  }

  function onDragStart(event: DragEvent, id: string) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', id)
    }

    editor.dragStart(id)
  }
</script>

<div
  data-slot="dashboard"
  data-editing={state.current.editing ? '' : undefined}
  class="flex flex-col gap-4"
>
  <div
    data-slot="dashboard-toolbar"
    role="toolbar"
    aria-label={t('dashboard.customize.toolbar', {}, 'Dashboard layout')}
    class="flex flex-wrap items-center justify-end gap-2"
  >
    {#if state.current.editing}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={state.current.saving}
        onclick={() => editor.resetDraft()}
      >
        <RotateCcwIcon aria-hidden="true" />
        {t('dashboard.customize.reset', {}, 'Reset to default')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={state.current.saving}
        onclick={() => editor.cancel()}
      >
        <XIcon aria-hidden="true" />
        {t('dashboard.customize.cancel', {}, 'Cancel')}
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={state.current.saving}
        onclick={() => void editor.save()}
      >
        <CheckIcon aria-hidden="true" />
        {t('dashboard.customize.save', {}, 'Save')}
      </Button>
    {:else}
      <Button type="button" variant="outline" size="sm" onclick={() => editor.start()}>
        <LayoutDashboardIcon aria-hidden="true" />
        {t('dashboard.customize.edit', {}, 'Edit dashboard')}
      </Button>
    {/if}
  </div>

  {#if state.current.error}
    <p role="alert" class="text-destructive text-sm">{state.current.error}</p>
  {/if}

  {#if state.current.editing}
    <p id={helpId} class="sr-only">
      {t(
        'dashboard.customize.move_help',
        {},
        'Use the arrow keys to move the widget, Home or End to move it to the start or end.',
      )}
    </p>
  {/if}

  {#if cells.length === 0}
    <p
      data-slot="dashboard-empty"
      class="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm"
    >
      {t('dashboard.customize.empty', {}, 'No widgets on this dashboard yet.')}
    </p>
  {:else}
    <div data-slot="widgets" class={cn('grid gap-6', gridColumnsClasses(block.columns))}>
      {#each cells as cell (cell.id)}
        {#if !state.current.editing}
          <div class={cn('min-w-0', columnSpanClasses(cell.columnSpan))}>
            {#if cell.widget}
              <WidgetRenderer widget={cell.widget} />
            {:else if cell.lazy}
              <LazyPlaceholder variant={cell.lazy.type === 'TableWidget' ? 'table' : 'widget'} />
            {/if}
          </div>
        {:else}
          <div
            data-slot="dashboard-widget"
            data-dragging={state.current.dragging === cell.id ? '' : undefined}
            role="group"
            aria-label={cell.label}
            class={cn(
              'relative min-w-0 rounded-xl border-2 border-dashed p-1',
              state.current.dragging === cell.id && 'opacity-50',
              columnSpanClasses(cell.columnSpan),
            )}
            ondragover={(event) => {
              if (state.current.dragging !== null) event.preventDefault()
            }}
            ondrop={(event) => {
              event.preventDefault()
              editor.dropOn(cell.id)
            }}
          >
            <div
              data-slot="dashboard-widget-controls"
              class="bg-background/95 absolute inset-x-2 top-2 z-10 flex items-center gap-1 rounded-md border p-1 shadow-sm"
            >
              <button
                type="button"
                data-slot="dashboard-widget-handle"
                draggable="true"
                aria-label={t('dashboard.customize.move', { widget: cell.label }, 'Move :widget')}
                aria-describedby={helpId}
                aria-roledescription={t('dashboard.customize.sortable', {}, 'sortable')}
                class="hover:bg-accent focus-visible:ring-ring/50 cursor-grab rounded p-1 outline-none focus-visible:ring-[3px] active:cursor-grabbing"
                ondragstart={(event) => onDragStart(event, cell.id)}
                ondragend={() => editor.dragEnd()}
                onkeydown={(event) => void onHandleKeydown(event, cell.id)}
              >
                <GripVerticalIcon class="size-4" aria-hidden="true" />
              </button>
              <span class="min-w-0 flex-1 truncate text-sm font-medium">{cell.label}</span>
              {#if (editor.widget(cell.id)?.spans.length ?? 0) > 1}
                <select
                  data-slot="dashboard-widget-span"
                  aria-label={t(
                    'dashboard.customize.size',
                    { widget: cell.label },
                    'Size of :widget',
                  )}
                  class="border-input bg-background h-7 rounded-md border px-1 text-xs"
                  value={editor.spanOf(cell.id)}
                  onchange={(event) =>
                    editor.setSpan(
                      cell.id,
                      Number((event.currentTarget as HTMLSelectElement).value),
                    )}
                >
                  {#each editor.widget(cell.id)?.spans ?? [] as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              {/if}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t('dashboard.customize.hide', { widget: cell.label }, 'Hide :widget')}
                onclick={() => editor.hide(cell.id)}
              >
                <EyeOffIcon aria-hidden="true" />
              </Button>
            </div>
            <!-- The widget itself is inert while editing: focus stays on the controls. -->
            <div inert class="pointer-events-none pt-12 select-none" aria-hidden="true">
              {#if cell.widget}
                <WidgetRenderer widget={cell.widget} />
              {:else if cell.lazy}
                <LazyPlaceholder variant={cell.lazy.type === 'TableWidget' ? 'table' : 'widget'} />
              {:else}
                <div
                  class="bg-card text-muted-foreground flex min-h-24 items-center justify-center rounded-xl border border-dashed p-6 text-sm"
                >
                  {t(
                    'dashboard.customize.pending',
                    { widget: cell.label },
                    ':widget appears once you save.',
                  )}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  {#if state.current.editing}
    <section
      data-slot="dashboard-library"
      aria-label={t('dashboard.customize.library', {}, 'Widget library')}
      class="bg-muted/40 flex flex-col gap-3 rounded-xl border p-4"
    >
      <h2 class="text-sm font-medium">{t('dashboard.customize.add', {}, 'Add widget')}</h2>
      {#if available.length === 0}
        <p class="text-muted-foreground text-sm">
          {t('dashboard.customize.library_empty', {}, 'Every widget is on the dashboard.')}
        </p>
      {:else}
        <ul class="flex flex-wrap gap-2">
          {#each available as widget (widget.id)}
            <li>
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
                onclick={() => editor.add(widget.id)}
              >
                <PlusIcon aria-hidden="true" />
                {widget.label}
              </Button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  <div data-slot="dashboard-announcer" role="status" aria-live="polite" class="sr-only">
    {state.current.announcement}
  </div>
</div>
