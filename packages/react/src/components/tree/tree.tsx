import type {
  TreeDropPosition,
  TreeEnvironment,
  TreeRow,
  TreeSchema,
  TreeWidgetSchema,
} from '@alfakit/core'
import { TreeController, clientErrorNotification, visibleTreeRows } from '@alfakit/core'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  GripVerticalIcon,
  ListIndentDecreaseIcon,
  ListIndentIncreaseIcon,
} from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useActionRunner, useDirection, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { ActionList } from '../actions/action-list'
import { showToast } from '../notifications/flash-toasts'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

const DRAG_TYPE = 'application/x-alfakit-tree-node'

/**
 * The tree of a `TreePage` (schema component `tree`) or a `TreeWidget` (alfasix/alfakit-tree).
 * Nodes are rearranged with native drag and drop, the move buttons or Alt + arrow keys,
 * and the new structure is saved in one request.
 */
export function Tree({ component, widget }: { component?: TreeSchema; widget?: TreeWidgetSchema }) {
  const tree = component ?? widget?.tree

  return tree ? <TreeView key={tree.actionComponent} tree={tree} /> : null
}

function TreeView({ tree }: { tree: TreeSchema }) {
  const runner = useActionRunner()
  const page = usePageActionContext()
  const t = useT()
  const direction = useDirection()
  const labelId = useId()
  const environment = (): TreeEnvironment => ({
    runner,
    token: page.token,
    t,
    notify: (notifications) => notifications.forEach((notification) => showToast(notification)),
    error: (message) => showToast(clientErrorNotification('tree', message)),
  })
  // One controller per tree (the parent keys this view by its action component).
  const [controller] = useState(() => new TreeController(tree, environment()))

  useEffect(() => {
    controller.setEnvironment(environment())
  })

  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false

      return
    }

    controller.setTree(tree)
  }, [controller, tree])

  const state = useStore(controller.store)
  const rows = visibleTreeRows(state.nodes, state.expanded)
  const [focused, setFocused] = useState<string | null>(null)
  const [drop, setDrop] = useState<{ key: string; position: TreeDropPosition } | null>(null)
  const items = useRef(new Map<string, HTMLLIElement>())
  const current =
    focused !== null && rows.some((row) => row.node.key === focused)
      ? focused
      : (rows[0]?.node.key ?? null)

  const focus = (key: string | undefined) => {
    if (!key) return
    setFocused(key)
    requestAnimationFrame(() => items.current.get(key)?.focus())
  }

  const onKeyDown = (row: TreeRow) => (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.target !== event.currentTarget) return

    const result = controller.handleKey(row.node.key, event, direction)

    if (result.handled) {
      event.preventDefault()
      focus(result.focus)
    }
  }

  const position = (event: DragEvent<HTMLElement>): TreeDropPosition => {
    const box = event.currentTarget.getBoundingClientRect()
    const offset = box.height > 0 ? (event.clientY - box.top) / box.height : 0.5

    return offset < 0.25 ? 'before' : offset > 0.75 ? 'after' : 'inside'
  }

  const hasParents = state.nodes.some((node) => node.children.length > 0)

  return (
    <Card className="gap-4 py-4" data-slot="tree-widget">
      <CardHeader className="px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {tree.heading ? (
            <CardTitle id={labelId} className="text-base">
              {tree.heading}
            </CardTitle>
          ) : (
            <span id={labelId} className="sr-only">
              {t('tree.label', {}, 'Tree')}
            </span>
          )}
          <div className="ms-auto flex flex-wrap items-center gap-1">
            {hasParents && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => controller.expandAll()}
                >
                  <ChevronsUpDownIcon aria-hidden="true" />
                  {t('tree.expand_all', {}, 'Expand all')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => controller.collapseAll()}
                >
                  <ChevronsDownUpIcon aria-hidden="true" />
                  {t('tree.collapse_all', {}, 'Collapse all')}
                </Button>
              </>
            )}
            {state.dirty && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={state.saving}
                  onClick={() => controller.reset()}
                >
                  {t('tree.discard', {}, 'Discard changes')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={state.saving}
                  onClick={() => void controller.save()}
                >
                  {state.saving
                    ? t('tree.saving', {}, 'Saving…')
                    : t('tree.save', {}, 'Save order')}
                </Button>
              </>
            )}
          </div>
        </div>
        {state.dirty && (
          <p className="text-muted-foreground text-sm">
            {t('tree.unsaved', {}, 'You have unsaved changes to the order.')}
          </p>
        )}
      </CardHeader>
      <CardContent className="px-5">
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {t('tree.empty', {}, 'No records yet')}
          </p>
        ) : (
          <ul
            role="tree"
            aria-labelledby={labelId}
            className="flex flex-col gap-1"
            data-slot="tree"
          >
            {rows.map((row) => {
              const { node } = row
              const title = node.title

              return (
                <li
                  key={node.key}
                  ref={(element) => {
                    if (element) items.current.set(node.key, element)
                    else items.current.delete(node.key)
                  }}
                  role="treeitem"
                  aria-level={row.level}
                  aria-setsize={row.siblings}
                  aria-posinset={row.index + 1}
                  aria-expanded={row.hasChildren ? row.expanded : undefined}
                  aria-selected={current === node.key}
                  aria-label={title}
                  tabIndex={current === node.key ? 0 : -1}
                  data-slot="tree-item"
                  data-key={node.key}
                  data-drop={drop?.key === node.key ? drop.position : undefined}
                  data-dragging={state.dragging === node.key ? '' : undefined}
                  draggable={tree.reorderable}
                  onFocus={(event) => event.target === event.currentTarget && setFocused(node.key)}
                  onKeyDown={onKeyDown(row)}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData(DRAG_TYPE, node.key)
                    controller.startDrag(node.key)
                  }}
                  onDragEnd={() => {
                    controller.endDrag()
                    setDrop(null)
                  }}
                  onDragOver={(event) => {
                    const dragging = controller.state.dragging

                    if (!dragging) return

                    const at = position(event)

                    if (controller.canDrop(dragging, node.key, at)) {
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                      setDrop({ key: node.key, position: at })
                    } else if (drop?.key === node.key) {
                      setDrop(null)
                    }
                  }}
                  onDragLeave={(event) => {
                    if (
                      !event.currentTarget.contains(event.relatedTarget as Node | null) &&
                      drop?.key === node.key
                    ) {
                      setDrop(null)
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    const dragging = controller.state.dragging

                    if (dragging) controller.drop(dragging, node.key, position(event))
                    controller.endDrag()
                    setDrop(null)
                  }}
                  className={cn(
                    'hover:bg-accent/50 focus-visible:ring-ring/50 flex items-center gap-2 rounded-md border px-2 py-1.5 outline-none focus-visible:ring-[3px]',
                    state.dragging === node.key && 'opacity-50',
                  )}
                  style={{ marginInlineStart: `${(row.level - 1) * 1.5}rem` }}
                >
                  {tree.reorderable && (
                    <GripVerticalIcon
                      className="text-muted-foreground size-4 shrink-0 cursor-grab"
                      aria-hidden="true"
                    />
                  )}
                  {row.hasChildren ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      tabIndex={-1}
                      aria-label={
                        row.expanded
                          ? t('tree.collapse', { title }, 'Collapse :title')
                          : t('tree.expand', { title }, 'Expand :title')
                      }
                      onClick={() => controller.toggle(node.key)}
                    >
                      <ChevronRightIcon
                        className={cn(
                          'transition-transform rtl:rotate-180',
                          row.expanded && 'rotate-90 rtl:rotate-90',
                        )}
                        aria-hidden="true"
                      />
                    </Button>
                  ) : (
                    <span className="size-6 shrink-0" aria-hidden="true" />
                  )}
                  {node.icon && (
                    <Icon name={node.icon} className="text-muted-foreground size-4 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
                  {tree.reorderable && (
                    <div className="flex shrink-0 items-center" data-slot="tree-move-buttons">
                      <MoveButton
                        label={t('tree.move_up', { title }, 'Move :title up')}
                        disabled={!controller.canMove(node.key, 'up')}
                        onClick={() => controller.move(node.key, 'up')}
                      >
                        <ArrowUpIcon aria-hidden="true" />
                      </MoveButton>
                      <MoveButton
                        label={t('tree.move_down', { title }, 'Move :title down')}
                        disabled={!controller.canMove(node.key, 'down')}
                        onClick={() => controller.move(node.key, 'down')}
                      >
                        <ArrowDownIcon aria-hidden="true" />
                      </MoveButton>
                      <MoveButton
                        label={t('tree.outdent', { title }, 'Move :title out of its parent')}
                        disabled={!controller.canMove(node.key, 'outdent')}
                        onClick={() => controller.move(node.key, 'outdent')}
                      >
                        <ListIndentDecreaseIcon className="rtl:rotate-180" aria-hidden="true" />
                      </MoveButton>
                      <MoveButton
                        label={t('tree.indent', { title }, 'Move :title into the item above')}
                        disabled={!controller.canMove(node.key, 'indent')}
                        onClick={() => controller.move(node.key, 'indent')}
                      >
                        <ListIndentIncreaseIcon className="rtl:rotate-180" aria-hidden="true" />
                      </MoveButton>
                    </div>
                  )}
                  {node.actions && node.actions.length > 0 && (
                    <ActionList
                      actions={node.actions}
                      context={{
                        token: page.token,
                        component: tree.actionComponent,
                        record: node.key,
                      }}
                      size="xs"
                      className="shrink-0 gap-1"
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <div className="sr-only" role="status" aria-live="polite">
          {state.announcement}
        </div>
      </CardContent>
    </Card>
  )
}

function MoveButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
