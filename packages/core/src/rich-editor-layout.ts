import {
  runEditorCommands,
  TOOLBAR_COMMANDS,
  type ToolbarCommand,
  type ToolbarEditor,
} from './rich-editor-toolbar'
import type {
  RichEditorCustomBlockSchema,
  RichEditorSchema,
  RichEditorToolSchema,
} from './schema/components'

/**
 * Framework-agnostic parts of the RichEditor layout: grouped toolbar dropdowns, floating
 * toolbars, the sticky offset, the custom block and merge tag panels, plugin tools and
 * resizable images. Renderers only draw what these return.
 */

// ---------------------------------------------------------------- Toolbar groups

/** Whether a toolbar entry is a `ToolbarButtonGroup` (`group:{n}`). */
export function isToolbarGroup(name: string): boolean {
  return name.startsWith('group:')
}

/**
 * Every button name the editor can show: the toolbar, its groups and the floating
 * toolbars. Decides which Tiptap extensions load.
 */
export function allToolbarButtons(
  component: Pick<RichEditorSchema, 'toolbarButtons' | 'toolbarButtonGroups' | 'floatingToolbars'>,
): string[] {
  const names = new Set<string>()
  const add = (buttons: string[]) => {
    for (const name of buttons) {
      if (isToolbarGroup(name)) {
        for (const inner of component.toolbarButtonGroups?.[name]?.buttons ?? []) names.add(inner)
      } else if (name !== '|') {
        names.add(name)
      }
    }
  }

  add(component.toolbarButtons)

  for (const buttons of Object.values(component.floatingToolbars ?? {})) add(buttons)

  return [...names]
}

/**
 * The button whose icon a group's trigger shows: the first active one, else the first.
 */
export function groupTriggerButton(
  buttons: string[],
  editor: ToolbarEditor | null,
  commands: Record<string, ToolbarCommand>,
): string | undefined {
  if (editor) {
    const active = buttons.find((name) => commands[name]?.active?.(editor))

    if (active) return active
  }

  return buttons[0]
}

// ---------------------------------------------------------------- Plugin tools

/** Context a plugin tool needs: how to open its editor action. */
export interface ToolCommandContext {
  /** Open the tool's editor action; resolves with the action's result. */
  runAction: (tool: RichEditorToolSchema, args: Record<string, unknown>) => Promise<unknown>
  /** The live editor, for applying the action's result. */
  editor: () => ActionResultEditor | null
}

/** The parts of a Tiptap editor an editor action's result is applied to. */
export interface ActionResultEditor extends ToolbarEditor {
  state: { selection: { from: number; to: number } }
  isDestroyed?: boolean
}

/** A toolbar command for a plugin tool (`RichEditorTool`). */
export function toolCommand(
  tool: RichEditorToolSchema,
  context: ToolCommandContext,
): ToolbarCommand {
  const active = tool.active

  return {
    key: tool.name,
    label: tool.label,
    run: (editor) => {
      if (tool.commands?.length) {
        runEditorCommands(editor, tool.commands)

        return
      }

      if (!tool.action) return

      const instance = editor as ActionResultEditor
      const { from, to } = instance.state.selection

      void context
        .runAction(tool, {
          editorSelection: { from, to },
          attributes: active ? editor.getAttributes(active.name) : {},
        })
        .then((result) => {
          const live = context.editor()

          if (live && !live.isDestroyed) applyEditorActionResult(live, result)
        })
    },
    active: active ? (editor) => editor.isActive(active.name, active.attributes ?? {}) : undefined,
  }
}

function isCommandList(value: unknown): value is Array<[string, ...unknown[]]> {
  return (
    Array.isArray(value) &&
    value.every((step) => Array.isArray(step) && typeof step[0] === 'string')
  )
}

/**
 * Apply what an editor action returned: `{ editorCommands, editorSelection }`
 * (`RichEditor::runCommands()`) or a list of commands. Commands run on the selection the
 * action was opened with. Returns whether anything ran.
 */
export function applyEditorActionResult(editor: ToolbarEditor, result: unknown): boolean {
  let commands: unknown = result
  let selection: unknown = null

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    commands = (result as Record<string, unknown>).editorCommands
    selection = (result as Record<string, unknown>).editorSelection
  }

  if (!isCommandList(commands) || commands.length === 0) return false

  const steps: Array<[string, ...unknown[]]> = []

  if (
    selection &&
    typeof selection === 'object' &&
    typeof (selection as { from?: unknown }).from === 'number'
  ) {
    const { from, to } = selection as { from: number; to?: number }
    steps.push(['setTextSelection', { from, to: typeof to === 'number' ? to : from }])
  }

  return runEditorCommands(editor, [...steps, ...commands])
}

/**
 * The commands a toolbar can show: the built-in ones, the plugin tools and the commands
 * registered by plugin JavaScript extensions (`createAlfakit({ richEditorExtensions })`).
 */
export function toolbarCommands(
  tools: RichEditorToolSchema[] | null | undefined,
  context: ToolCommandContext,
  registered: Record<string, ToolbarCommand> = {},
): Record<string, ToolbarCommand> {
  const commands: Record<string, ToolbarCommand> = { ...TOOLBAR_COMMANDS }

  for (const tool of tools ?? []) {
    // A JavaScript command registered under the tool's name does the work; the tool
    // supplies the label and icon.
    commands[tool.name] = registered[tool.name]
      ? { ...registered[tool.name]!, label: tool.label }
      : toolCommand(tool, context)
  }

  for (const [name, command] of Object.entries(registered)) {
    commands[name] ??= command
  }

  return commands
}

/** The translated label of a button (built-in keys are translated; plugin labels come translated). */
export function commandLabel(
  name: string,
  commands: Record<string, ToolbarCommand>,
  t: (key: string, fallback: string) => string,
): string {
  const command = commands[name]

  if (!command) return name

  return TOOLBAR_COMMANDS[name] === command
    ? t(`editor.${command.key}`, command.label)
    : command.label
}

// ---------------------------------------------------------------- Floating toolbars

/** Text nodes whose floating toolbar only shows while text is selected. */
const TEXT_SELECTION_NODES = ['paragraph', 'heading']

interface ResolvedPosition {
  depth: number
  node(depth?: number): { type: { name: string } }
}

/** The parts of a Tiptap editor the floating toolbars use. */
export interface FloatingToolbarEditor {
  isEditable?: boolean
  state: {
    selection: {
      from: number
      to: number
      empty: boolean
      /** Set on node selections (an image, a custom block). */
      node?: { type: { name: string } } | null
      $from: ResolvedPosition
    }
  }
  view: { coordsAtPos(pos: number): { left: number; top: number; bottom: number } }
}

export interface FloatingToolbarState {
  /** The node the toolbar belongs to (a key of `floatingToolbars`). */
  node: string
  buttons: string[]
  /** Viewport coordinates of the selection start, for a `position: fixed` toolbar. */
  coords: { left: number; top: number; bottom: number } | null
}

/**
 * The floating toolbar for the current selection: a selected node's (image, custom
 * block), else the innermost node around the cursor that has one. Paragraph and heading
 * toolbars only show while text is selected.
 */
export function resolveFloatingToolbar(
  editor: FloatingToolbarEditor | null,
  toolbars: Record<string, string[]> | null | undefined,
): FloatingToolbarState | null {
  if (!editor || !toolbars || editor.isEditable === false) return null

  const { selection } = editor.state
  const coords = (): FloatingToolbarState['coords'] => {
    try {
      return editor.view.coordsAtPos(selection.from)
    } catch {
      return null
    }
  }

  const selected = selection.node?.type.name

  if (selected) {
    const buttons = toolbars[selected]

    return buttons?.length ? { node: selected, buttons, coords: coords() } : null
  }

  for (let depth = selection.$from.depth; depth > 0; depth--) {
    const name = selection.$from.node(depth).type.name
    const buttons = toolbars[name]

    if (!buttons?.length) continue
    if (TEXT_SELECTION_NODES.includes(name) && selection.empty) continue

    return { node: name, buttons, coords: coords() }
  }

  return null
}

/** Inline style of a floating toolbar: above the selection start. */
export function floatingToolbarStyle(
  coords: FloatingToolbarState['coords'],
): Record<string, string> | undefined {
  if (!coords) return undefined

  return {
    left: `${Math.max(8, coords.left)}px`,
    top: `${Math.max(8, coords.top - 8)}px`,
    transform: 'translateY(-100%)',
  }
}

// ---------------------------------------------------------------- Sticky toolbar and panels

/**
 * The `top` of the sticky toolbar and panels: `stickyOffset()`, else the height of the
 * panel's topbar when it sticks to the top of the viewport.
 */
export function resolveStickyOffset(
  offset: string | null | undefined,
  root: Pick<Document, 'querySelector'> | null = typeof document === 'undefined' ? null : document,
): string {
  if (offset) return offset

  const topbar = root?.querySelector<HTMLElement>('[data-slot="topbar"]')

  if (!topbar || typeof getComputedStyle === 'undefined') return '0px'

  const position = getComputedStyle(topbar).position

  return position === 'sticky' || position === 'fixed'
    ? `${Math.round(topbar.getBoundingClientRect().height)}px`
    : '0px'
}

/**
 * The `collisionPadding` of a popover that must stay clear of the panel's sticky topbar
 * (the Builder's block picker): `padding` on every side, plus the topbar's height at the
 * top, so a popover that opens upwards near the top of the page never covers it.
 */
export function stickyCollisionPadding(
  padding = 16,
  root: Pick<Document, 'querySelector'> | null = typeof document === 'undefined' ? null : document,
): { top: number; right: number; bottom: number; left: number } {
  const top = Number.parseInt(resolveStickyOffset(null, root), 10) || 0

  return { top: top + padding, right: padding, bottom: padding, left: padding }
}

// ---------------------------------------------------------------- Panels

export type RichEditorPanel = 'customBlocks' | 'mergeTags'

/** The panel a toolbar button opens, or null. */
export function toolbarPanel(name: string): RichEditorPanel | null {
  return name === 'customBlocks' || name === 'mergeTags' ? name : null
}

export interface CustomBlockGroup {
  /** Null for blocks without a group (listed first). */
  group: string | null
  blocks: RichEditorCustomBlockSchema[]
}

/**
 * Custom blocks for the panel: ungrouped blocks first, then each group in order, filtered
 * by `query` (matches labels and group names, ignoring case and surrounding whitespace).
 */
export function groupCustomBlocks(
  blocks: RichEditorCustomBlockSchema[],
  query = '',
): CustomBlockGroup[] {
  const needle = query.trim().toLocaleLowerCase()
  const groups = new Map<string | null, RichEditorCustomBlockSchema[]>([[null, []]])

  for (const block of blocks) {
    const group = block.group ?? null
    const matches =
      needle === '' ||
      block.label.toLocaleLowerCase().includes(needle) ||
      (group ?? '').toLocaleLowerCase().includes(needle)

    if (!matches) continue

    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(block)
  }

  return [...groups.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([group, items]) => ({ group, blocks: items }))
}

// ---------------------------------------------------------------- Resizable images

/** `Image.configure(resizableImageOptions())`: corner handles, aspect ratio kept. */
export function resizableImageOptions() {
  return {
    resize: {
      enabled: true,
      directions: ['bottom-left', 'bottom-right', 'top-left', 'top-right'] as Array<
        'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
      >,
      minWidth: 48,
      minHeight: 24,
      alwaysPreserveAspectRatio: true,
    },
  }
}

/**
 * Attributes for `Image.extend({ addAttributes })`: the width is stored as a whole pixel
 * size; the height isn't stored (it follows the width, so images still shrink on narrow
 * screens).
 */
export function resizableImageAttributes(parent: Record<string, unknown> = {}) {
  const pixels = (value: unknown): number | null => {
    const number = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)

    return Number.isFinite(number) && number > 0 ? Math.min(Math.round(number), 10000) : null
  }

  return {
    ...parent,
    width: {
      default: null,
      parseHTML: (element: HTMLElement) => pixels(element.getAttribute('width')),
      renderHTML: (attributes: Record<string, unknown>) => {
        const width = pixels(attributes.width)

        return width ? { width: String(width) } : {}
      },
    },
    height: {
      default: null,
      parseHTML: () => null,
      renderHTML: () => ({}),
    },
  }
}
