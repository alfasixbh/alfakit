<script lang="ts">
  import type {
    TreeDropPosition,
    TreeEnvironment,
    TreeMove,
    TreeRow,
    TreeSchema,
  } from '@alfakit/core'
  import { TreeController, clientErrorNotification, visibleTreeRows } from '@alfakit/core'
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down'
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import ChevronsDownUpIcon from '@lucide/svelte/icons/chevrons-down-up'
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
  import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical'
  import ListIndentDecreaseIcon from '@lucide/svelte/icons/list-indent-decrease'
  import ListIndentIncreaseIcon from '@lucide/svelte/icons/list-indent-increase'
  import { tick, untrack } from 'svelte'
  import { useActionRunner, useDirection, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { usePageActionContext } from '../actions/action-context'
  import ActionList from '../actions/ActionList.svelte'
  import { showToast } from '../notifications/toast'
  import { Button } from '../ui/button'
  import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

  /**
   * Nodes are rearranged with native drag and drop, the move buttons or Alt + arrow keys,
   * and the new structure is saved in one request.
   */
  let { tree }: { tree: TreeSchema } = $props()

  const DRAG_TYPE = 'application/x-alfakit-tree-node'
  const runner = useActionRunner()
  const page = usePageActionContext()
  const t = useT()
  const direction = $derived(useDirection())
  const labelId = $props.id()

  const environment = (): TreeEnvironment => ({
    runner,
    token: page.token,
    t,
    notify: (notifications) => notifications.forEach((notification) => showToast(notification)),
    error: (message) => showToast(clientErrorNotification('tree', message)),
  })

  const controller = new TreeController(
    untrack(() => $state.snapshot(tree) as TreeSchema),
    environment(),
  )
  const treeState = useStore(controller.store)
  const rows = $derived(visibleTreeRows(treeState.current.nodes, treeState.current.expanded))
  const hasParents = $derived(treeState.current.nodes.some((node) => node.children.length > 0))
  let focused = $state<string | null>(null)
  let drop = $state<{ key: string; position: TreeDropPosition } | null>(null)
  // Row elements by key, for moving the focus (not reactive state).
  const items: Record<string, HTMLElement> = {}
  const current = $derived(
    focused !== null && rows.some((row) => row.node.key === focused)
      ? focused
      : (rows[0]?.node.key ?? null),
  )

  // A new schema from the server (after an action ran): show it.
  let first = true

  $effect(() => {
    const next = $state.snapshot(tree) as TreeSchema

    if (first) {
      first = false

      return
    }

    untrack(() => controller.setTree(next))
  })

  const moves = (title: string): Array<{ name: TreeMove; label: string }> => [
    { name: 'up', label: t('tree.move_up', { title }, 'Move :title up') },
    { name: 'down', label: t('tree.move_down', { title }, 'Move :title down') },
    { name: 'outdent', label: t('tree.outdent', { title }, 'Move :title out of its parent') },
    { name: 'indent', label: t('tree.indent', { title }, 'Move :title into the item above') },
  ]

  // Reads the store so the buttons update after every move.
  function canMove(key: string, move: TreeMove): boolean {
    return treeState.current.nodes.length > 0 && controller.canMove(key, move)
  }

  function item(element: HTMLElement, key: string) {
    items[key] = element

    return {
      destroy: () => {
        if (items[key] === element) delete items[key]
      },
    }
  }

  function focus(key: string | undefined) {
    if (!key) return
    focused = key
    void tick().then(() => items[key]?.focus())
  }

  function onKeyDown(row: TreeRow, event: KeyboardEvent) {
    if (event.target !== event.currentTarget) return

    const result = controller.handleKey(row.node.key, event, direction)

    if (result.handled) {
      event.preventDefault()
      focus(result.focus)
    }
  }

  function position(event: DragEvent): TreeDropPosition {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const offset = box.height > 0 ? (event.clientY - box.top) / box.height : 0.5

    return offset < 0.25 ? 'before' : offset > 0.75 ? 'after' : 'inside'
  }

  function onDragStart(key: string, event: DragEvent) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData(DRAG_TYPE, key)
    }
    controller.startDrag(key)
  }

  function onDragEnd() {
    controller.endDrag()
    drop = null
  }

  function onDragOver(key: string, event: DragEvent) {
    const dragging = controller.state.dragging

    if (!dragging) return

    const at = position(event)

    if (controller.canDrop(dragging, key, at)) {
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
      drop = { key, position: at }
    } else if (drop?.key === key) {
      drop = null
    }
  }

  function onDragLeave(key: string, event: DragEvent) {
    const target = event.currentTarget as HTMLElement

    if (!target.contains(event.relatedTarget as Node | null) && drop?.key === key) {
      drop = null
    }
  }

  function onDrop(key: string, event: DragEvent) {
    event.preventDefault()
    const dragging = controller.state.dragging

    if (dragging) controller.drop(dragging, key, position(event))
    onDragEnd()
  }
</script>

<Card class="gap-4 py-4" data-slot="tree-widget">
  <CardHeader class="px-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      {#if tree.heading}
        <CardTitle id={labelId} class="text-base">{tree.heading}</CardTitle>
      {:else}
        <span id={labelId} class="sr-only">{t('tree.label', {}, 'Tree')}</span>
      {/if}
      <div class="ms-auto flex flex-wrap items-center gap-1">
        {#if hasParents}
          <Button type="button" variant="ghost" size="sm" onclick={() => controller.expandAll()}>
            <ChevronsUpDownIcon aria-hidden="true" />
            {t('tree.expand_all', {}, 'Expand all')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onclick={() => controller.collapseAll()}>
            <ChevronsDownUpIcon aria-hidden="true" />
            {t('tree.collapse_all', {}, 'Collapse all')}
          </Button>
        {/if}
        {#if treeState.current.dirty}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={treeState.current.saving}
            onclick={() => controller.reset()}
          >
            {t('tree.discard', {}, 'Discard changes')}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={treeState.current.saving}
            onclick={() => void controller.save()}
          >
            {treeState.current.saving
              ? t('tree.saving', {}, 'Saving…')
              : t('tree.save', {}, 'Save order')}
          </Button>
        {/if}
      </div>
    </div>
    {#if treeState.current.dirty}
      <p class="text-muted-foreground text-sm">
        {t('tree.unsaved', {}, 'You have unsaved changes to the order.')}
      </p>
    {/if}
  </CardHeader>
  <CardContent class="px-5">
    {#if rows.length === 0}
      <p class="text-muted-foreground py-6 text-center text-sm">
        {t('tree.empty', {}, 'No records yet')}
      </p>
    {:else}
      <ul role="tree" aria-labelledby={labelId} class="flex flex-col gap-1" data-slot="tree">
        {#each rows as row (row.node.key)}
          {@const title = row.node.title}
          <li
            use:item={row.node.key}
            role="treeitem"
            aria-level={row.level}
            aria-setsize={row.siblings}
            aria-posinset={row.index + 1}
            aria-expanded={row.hasChildren ? row.expanded : undefined}
            aria-selected={current === row.node.key}
            aria-label={title}
            tabindex={current === row.node.key ? 0 : -1}
            data-slot="tree-item"
            data-key={row.node.key}
            data-drop={drop?.key === row.node.key ? drop.position : undefined}
            data-dragging={treeState.current.dragging === row.node.key ? '' : undefined}
            draggable={tree.reorderable ? 'true' : 'false'}
            class={cn(
              'hover:bg-accent/50 focus-visible:ring-ring/50 flex items-center gap-2 rounded-md border px-2 py-1.5 outline-none focus-visible:ring-[3px]',
              treeState.current.dragging === row.node.key && 'opacity-50',
            )}
            style:margin-inline-start="{(row.level - 1) * 1.5}rem"
            onfocus={(event) => event.target === event.currentTarget && (focused = row.node.key)}
            onkeydown={(event) => onKeyDown(row, event)}
            ondragstart={(event) => onDragStart(row.node.key, event)}
            ondragend={onDragEnd}
            ondragover={(event) => onDragOver(row.node.key, event)}
            ondragleave={(event) => onDragLeave(row.node.key, event)}
            ondrop={(event) => onDrop(row.node.key, event)}
          >
            {#if tree.reorderable}
              <GripVerticalIcon
                class="text-muted-foreground size-4 shrink-0 cursor-grab"
                aria-hidden="true"
              />
            {/if}
            {#if row.hasChildren}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                tabindex={-1}
                aria-label={row.expanded
                  ? t('tree.collapse', { title }, 'Collapse :title')
                  : t('tree.expand', { title }, 'Expand :title')}
                onclick={() => controller.toggle(row.node.key)}
              >
                <ChevronRightIcon
                  class={cn(
                    'transition-transform rtl:rotate-180',
                    row.expanded && 'rotate-90 rtl:rotate-90',
                  )}
                  aria-hidden="true"
                />
              </Button>
            {:else}
              <span class="size-6 shrink-0" aria-hidden="true"></span>
            {/if}
            {#if row.node.icon}
              <Icon name={row.node.icon} class="text-muted-foreground size-4 shrink-0" />
            {/if}
            <span class="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
            {#if tree.reorderable}
              <div class="flex shrink-0 items-center" data-slot="tree-move-buttons">
                {#each moves(title) as move (move.name)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={move.label}
                    title={move.label}
                    disabled={!canMove(row.node.key, move.name)}
                    onclick={() => controller.move(row.node.key, move.name)}
                  >
                    {#if move.name === 'up'}
                      <ArrowUpIcon aria-hidden="true" />
                    {:else if move.name === 'down'}
                      <ArrowDownIcon aria-hidden="true" />
                    {:else if move.name === 'outdent'}
                      <ListIndentDecreaseIcon class="rtl:rotate-180" aria-hidden="true" />
                    {:else}
                      <ListIndentIncreaseIcon class="rtl:rotate-180" aria-hidden="true" />
                    {/if}
                  </Button>
                {/each}
              </div>
            {/if}
            {#if row.node.actions?.length}
              <ActionList
                actions={row.node.actions}
                context={{
                  token: page.token,
                  component: tree.actionComponent,
                  record: row.node.key,
                }}
                size="xs"
                class="shrink-0 gap-1"
              />
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
    <div class="sr-only" role="status" aria-live="polite">{treeState.current.announcement}</div>
  </CardContent>
</Card>
