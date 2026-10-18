import type {
  ActionContext,
  RichEditorPanel,
  RichEditorSchema,
  RichEditorToolbarGroupSchema,
  SuggestionState,
  ToolbarCommand,
} from '@alfakit/core'
import {
  commandLabel,
  customBlockNodeConfig,
  EditorSuggestions,
  fieldActionContext,
  groupCustomBlocks,
  groupTriggerButton,
  isCustomBlockResult,
  mentionNodeConfig,
  mergeTagNodeConfig,
  mergeTagText,
  RichEditorRemote,
} from '@alfakit/core'
import { Node, type Editor, type Extensions } from '@tiptap/react'
import { BlocksIcon, BracesIcon, ChevronDownIcon, XIcon } from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import { useActionRunner, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { useOptionalFormStore } from '../form/form-context'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Input } from '../ui/input'

type NodeConfig = Parameters<typeof Node.create>[0]

export interface RichEditorExtensions {
  extensions: Extensions
  suggestions: EditorSuggestions
  /** Insert a custom block (opening its modal first when it has a form). */
  insertBlock: (id: string) => Promise<void>
  context: ActionContext
}

/**
 * Mentions, merge tags and custom blocks for a RichEditor. `editorRef` points at the live
 * editor, which the custom block node views and suggestions act on.
 */
export function useRichEditorExtensions(
  component: RichEditorSchema,
  editorRef: MutableRefObject<Editor | null>,
): RichEditorExtensions {
  const t = useT()
  const form = useOptionalFormStore()
  const page = usePageActionContext()
  const runner = useActionRunner()
  const context = useMemo(
    () => fieldActionContext({ token: page.token, form, key: component.key }),
    [page.token, form, component.key],
  )
  const contextRef = useRef(context)
  const componentRef = useRef(component)

  const [remote] = useState(() => new RichEditorRemote(form, component.statePath))
  const [suggestions] = useState(
    () =>
      new EditorSuggestions({
        mentions: component.mentions ?? [],
        mergeTags: component.mergeTags ?? [],
        search: (trigger, query) => remote.searchMentions(trigger, query),
      }),
  )

  useEffect(() => () => suggestions.destroy(), [suggestions])

  const runBlock = async (id: string, config?: Record<string, unknown>) => {
    const block = componentRef.current.customBlocks?.find((candidate) => candidate.id === id)

    if (!block) return null

    const result = await runner.runField(block.action, {
      ...contextRef.current,
      arguments: config ? { config, editing: true } : {},
    })

    if (!isCustomBlockResult(result)) return null

    if (result.preview !== undefined) {
      remote.primePreview(result.id, result.config, result.preview, result.prose === true)
    }

    return result
  }

  const runBlockRef = useRef(runBlock)

  useEffect(() => {
    contextRef.current = context
    componentRef.current = component
    runBlockRef.current = runBlock
  })

  // The editor is created once; the node views read the latest props through refs when
  // they run (on edit, on preview), never during render.
  // eslint-disable-next-line react-hooks/refs
  const [extensions] = useState<Extensions>(() => [
    Node.create(mentionNodeConfig() as NodeConfig),
    Node.create(mergeTagNodeConfig() as NodeConfig),
    Node.create(
      customBlockNodeConfig({
        get blocks() {
          return componentRef.current.customBlocks ?? []
        },
        loadPreview: (id, config) => remote.loadPreview(id, config),
        onEdit: ({ id, config, pos }) => {
          void runBlockRef.current(id, config).then((result) => {
            const editor = editorRef.current

            if (!result || !editor || editor.isDestroyed) return

            editor.view.dispatch(
              editor.state.tr.setNodeMarkup(pos, undefined, { id, config: result.config }),
            )
          })
        },
        labels: {
          edit: t('editor.edit_block', {}, 'Edit block'),
          remove: t('editor.remove_block', {}, 'Remove block'),
        },
        minimal: Boolean(component.minimalCustomBlockControls),
      }) as NodeConfig,
    ),
  ])

  const insertBlock = async (id: string) => {
    const result = await runBlock(id)
    const editor = editorRef.current

    if (!result || !editor || editor.isDestroyed) return

    editor
      .chain()
      .focus()
      .insertContent({ type: 'customBlock', attrs: { id: result.id, config: result.config } })
      .run()
  }

  return { extensions, suggestions, insertBlock, context }
}

/** The toolbar button that opens the custom blocks or merge tags panel. */
export function ExtensionToolbarButton({
  name,
  component,
  editable,
  open,
  onToggle,
}: {
  name: RichEditorPanel
  component: RichEditorSchema
  editable: boolean
  open: boolean
  onToggle: () => void
}) {
  const t = useT()
  const count =
    name === 'customBlocks'
      ? (component.customBlocks ?? []).length
      : (component.mergeTags ?? []).length

  if (count === 0) return null

  const label =
    name === 'customBlocks'
      ? t('editor.custom_blocks', {}, 'Insert block')
      : t('editor.merge_tags', {}, 'Insert merge tag')

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={open}
      aria-expanded={open}
      disabled={!editable}
      className={cn(open && 'bg-accent text-accent-foreground')}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onToggle}
    >
      {name === 'customBlocks' ? <BlocksIcon /> : <BracesIcon />}
    </Button>
  )
}

/**
 * The custom blocks or merge tags panel: beside the content on wide editors, above it on
 * narrow ones. Blocks are grouped, optionally searchable and shown as a grid.
 */
export function RichEditorSidePanel({
  panel,
  component,
  editable,
  sticky,
  onInsertBlock,
  onInsertMergeTag,
  onClose,
}: {
  panel: RichEditorPanel
  component: RichEditorSchema
  editable: boolean
  /** `top` of a sticky panel, or null. */
  sticky: string | null
  onInsertBlock: (id: string) => void
  onInsertMergeTag: (id: string) => void
  onClose: () => void
}) {
  const t = useT()
  const [search, setSearch] = useState('')
  const heading =
    panel === 'customBlocks'
      ? t('editor.custom_blocks_heading', {}, 'Custom blocks')
      : t('editor.merge_tags_heading', {}, 'Merge tags')
  const groups =
    panel === 'customBlocks' ? groupCustomBlocks(component.customBlocks ?? [], search) : []
  const grid = Boolean(component.customBlocksGrid)
  const itemClass =
    'hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/50 flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50'

  return (
    <aside
      aria-label={heading}
      data-slot="rich-editor-panel"
      data-panel={panel}
      className="bg-muted/20 shrink-0 border-b @2xl:w-64 @2xl:border-s @2xl:border-b-0"
    >
      <div
        className={cn('flex flex-col gap-2 p-2', sticky !== null && '@2xl:sticky')}
        // The offset is a runtime value: no Tailwind class can hold it.
        style={sticky !== null ? { top: sticky } : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs font-medium">{heading}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('editor.close_panel', {}, 'Close panel')}
            title={t('editor.close_panel', {}, 'Close panel')}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClose}
          >
            <XIcon />
          </Button>
        </div>
        {panel === 'customBlocks' && component.searchableCustomBlocks && (
          <Input
            type="search"
            value={search}
            aria-label={t('editor.search_blocks', {}, 'Search blocks')}
            placeholder={t('editor.search_blocks', {}, 'Search blocks')}
            className="h-8"
            onChange={(event) => setSearch(event.target.value)}
          />
        )}
        {panel === 'customBlocks' ? (
          groups.length === 0 ? (
            <p className="text-muted-foreground px-2 py-1.5 text-sm">
              {t('no_results', {}, 'No results.')}
            </p>
          ) : (
            groups.map(({ group, blocks }) => (
              <div key={group ?? ''} role="group" aria-label={group ?? heading}>
                {group && (
                  <div className="text-muted-foreground px-2 pt-1 pb-0.5 text-xs font-medium">
                    {group}
                  </div>
                )}
                <div className={cn(grid ? 'grid grid-cols-2 gap-1' : 'flex flex-col gap-0.5')}>
                  {blocks.map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      disabled={!editable}
                      className={cn(
                        itemClass,
                        grid && 'flex-col justify-center border py-3 text-center',
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onInsertBlock(block.id)}
                    >
                      {block.icon ? (
                        <Icon name={block.icon} className="size-4 shrink-0" />
                      ) : (
                        <BlocksIcon className="size-4 shrink-0" />
                      )}
                      <span className="truncate">{block.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )
        ) : (
          <div className="flex flex-col gap-0.5">
            {(component.mergeTags ?? []).map((tag) => (
              <button
                key={tag.id}
                type="button"
                disabled={!editable}
                className={itemClass}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onInsertMergeTag(tag.id)}
              >
                <span className="truncate">{tag.label}</span>
                <span className="text-muted-foreground ms-auto font-mono text-xs" dir="ltr">
                  {mergeTagText({ id: tag.id })}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

/** A `ToolbarButtonGroup`: a dropdown of buttons (icons, or labels with `textualButtons()`). */
export function ToolbarGroupButton({
  group,
  editor,
  editable,
  commands,
  icons,
  translate,
  onRun,
}: {
  group: RichEditorToolbarGroupSchema
  editor: Editor
  editable: boolean
  commands: Record<string, ToolbarCommand>
  icons: (name: string) => ReactNode
  translate: (key: string, fallback: string) => string
  onRun: (name: string) => void
}) {
  const buttons = group.buttons.filter((name) => commands[name])

  if (buttons.length === 0) return null

  const trigger = groupTriggerButton(buttons, editor, commands)
  const active = buttons.some((name) => commands[name]?.active?.(editor))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={group.label}
          title={group.label}
          disabled={!editable}
          className={cn('h-8 gap-0.5 px-1.5', active && 'bg-accent text-accent-foreground')}
          onMouseDown={(event) => event.preventDefault()}
        >
          {group.icon ? <Icon name={group.icon} /> : trigger ? icons(trigger) : group.label}
          <ChevronDownIcon className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        aria-label={group.label}
        className={cn(!group.textual && 'flex min-w-0 flex-row gap-0.5')}
      >
        {buttons.map((name) => {
          const label = commandLabel(name, commands, translate)
          const pressed = commands[name]?.active?.(editor)

          return (
            <DropdownMenuItem
              key={name}
              aria-label={group.textual ? undefined : label}
              title={label}
              className={cn(pressed && 'bg-accent text-accent-foreground')}
              onSelect={() => onRun(name)}
            >
              {icons(name)}
              {group.textual && <span>{label}</span>}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Inline style of a sticky toolbar. */
export function stickyStyle(top: string | null): CSSProperties | undefined {
  return top === null ? undefined : { top }
}

/** The mention / merge tag listbox under the trigger. */
export function SuggestionPopup({
  suggestions,
  editor,
  id,
}: {
  suggestions: EditorSuggestions
  editor: Editor | null
  id: string
}) {
  const t = useT()
  const state: SuggestionState = useStore(suggestions.store)

  if (!state.open || !editor) return null

  return (
    <div
      id={id}
      role="listbox"
      aria-label={t('editor.suggestions', {}, 'Suggestions')}
      data-slot="rich-editor-suggestions"
      className="bg-popover text-popover-foreground fixed z-50 min-w-48 overflow-hidden rounded-md border p-1 shadow-md"
      // Runtime coordinates cannot be Tailwind classes.
      style={state.coords ? { left: state.coords.left, top: state.coords.bottom + 4 } : undefined}
    >
      {state.loading && state.items.length === 0 ? (
        <div className="text-muted-foreground px-2 py-1.5 text-sm">
          {t('loading', {}, 'Loading…')}
        </div>
      ) : state.items.length === 0 ? (
        <div className="text-muted-foreground px-2 py-1.5 text-sm">
          {t('no_results', {}, 'No results.')}
        </div>
      ) : (
        state.items.map((item, index) => (
          <div
            key={item.id}
            id={`${id}-${index}`}
            role="option"
            aria-selected={index === state.index}
            className={cn(
              'cursor-pointer rounded-sm px-2 py-1.5 text-sm',
              index === state.index && 'bg-accent text-accent-foreground',
            )}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => suggestions.highlight(index)}
            onClick={() => suggestions.select(index, editor)}
          >
            {state.kind === 'mention' ? `${state.trigger}${item.label}` : item.label}
          </div>
        ))
      )}
    </div>
  )
}
