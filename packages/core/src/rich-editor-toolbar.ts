/**
 * Framework-agnostic parts of the RichEditor / MarkdownEditor toolbar: what each button
 * does (renderers only add icons), Tiptap configurations for the marks and nodes the
 * extra buttons need (pass them to `Mark.create()`, `Node.create()`, `Extension.create()`),
 * and the HTML → Markdown conversion of the MarkdownEditor.
 *
 * Stored formats (the server's sanitiser keeps exactly these):
 * - text colour: `<span data-color="#dc2626" style="color: #dc2626">`
 * - highlight: `<mark>`; subscript / superscript: `<sub>` / `<sup>`; inline code: `<code>`
 * - alignment: `<p style="text-align: center">` (`start`, `center`, `end`, `justify`)
 * - table: `<table><tbody><tr><th|td colspan rowspan><p>…` (from `@tiptap/extension-table`)
 * - details: `<details><summary>…</summary><div data-type="detailsContent">…</div></details>`
 * - grid: `<div data-type="grid" class="alfakit-grid alfakit-grid-cols-2"><div data-type="gridColumn"
 *   class="alfakit-grid-column">…</div>…</div>` (2–6 columns, stacked on small screens)
 * - lead paragraph: `<p class="alfakit-lead">`; small text: `<small>`
 */

// ---------------------------------------------------------------- Editor surface

/** The parts of a Tiptap editor the toolbar uses (`Editor` satisfies it). */
export interface ToolbarEditor {
  chain(): unknown
  isActive(
    nameOrAttributes: string | Record<string, unknown>,
    attributes?: Record<string, unknown>,
  ): boolean
  getAttributes(name: string): Record<string, unknown>
}

type Step = [command: string, ...args: unknown[]]

type CommandChain = Record<string, (...args: unknown[]) => unknown>

/** Run `focus()` and then each command of a Tiptap chain. False when a command is missing. */
export function runEditorCommands(editor: ToolbarEditor, steps: Step[]): boolean {
  let chain = editor.chain() as CommandChain

  for (const [name, ...args] of [['focus'] as Step, ...steps]) {
    const command = chain[name]

    if (typeof command !== 'function') return false

    chain = command.apply(chain, args) as CommandChain
  }

  return (chain.run as () => boolean)()
}

// ---------------------------------------------------------------- Buttons

export interface ToolbarContext {
  /** Ask for a value: a link URL (null: cancelled, '': remove the link), grid columns. */
  prompt: (message: string) => string | null
  /** Open the file picker of `attachFiles`. */
  pickImage: () => void
  /** Show or hide a toolbar panel (the `textColor` palette). */
  togglePanel: (panel: 'textColor') => void
  /** Translate a UI string. */
  t: (key: string, fallback: string) => string
}

export interface ToolbarCommand {
  /** English label; the translation key is `editor.{key}`. */
  label: string
  key: string
  run: (editor: ToolbarEditor, context: ToolbarContext) => void
  active?: (editor: ToolbarEditor) => boolean
}

const command = (
  key: string,
  label: string,
  steps: Step[],
  active?: (editor: ToolbarEditor) => boolean,
): ToolbarCommand => ({
  key,
  label,
  run: (editor) => void runEditorCommands(editor, steps),
  active,
})

const mark = (name: string, key: string, label: string, toggle: string): ToolbarCommand =>
  command(key, label, [[toggle]], (editor) => editor.isActive(name))

export type TextAlignment = 'start' | 'center' | 'end' | 'justify'

const ALIGNMENTS: TextAlignment[] = ['start', 'center', 'end', 'justify']

const align = (alignment: TextAlignment, label: string): ToolbarCommand => ({
  key: `align_${alignment}`,
  label,
  run: (editor) => {
    // Pressing the active alignment again goes back to the default.
    const value = editor.isActive({ textAlign: alignment }) ? null : alignment

    runEditorCommands(editor, [
      ['updateAttributes', 'paragraph', { textAlign: value }],
      ['updateAttributes', 'heading', { textAlign: value }],
    ])
  },
  active: (editor) => editor.isActive({ textAlign: alignment }),
})

/** Buttons shown in an extra row while the cursor is in a table (and usable by name). */
export const TABLE_TOOLBAR_BUTTONS = [
  'tableAddColumnBefore',
  'tableAddColumnAfter',
  'tableDeleteColumn',
  'tableAddRowBefore',
  'tableAddRowAfter',
  'tableDeleteRow',
  'tableMergeCells',
  'tableSplitCell',
  'tableToggleHeaderRow',
  'tableToggleHeaderCell',
  'tableDelete',
] as const

const tableCommand = (key: string, label: string, name: string): ToolbarCommand =>
  command(key, label, [[name]])

export const TOOLBAR_COMMANDS: Record<string, ToolbarCommand> = {
  bold: mark('bold', 'bold', 'Bold', 'toggleBold'),
  italic: mark('italic', 'italic', 'Italic', 'toggleItalic'),
  underline: mark('underline', 'underline', 'Underline', 'toggleUnderline'),
  strike: mark('strike', 'strike', 'Strikethrough', 'toggleStrike'),
  subscript: command('subscript', 'Subscript', [['toggleMark', 'subscript']], (editor) =>
    editor.isActive('subscript'),
  ),
  superscript: command('superscript', 'Superscript', [['toggleMark', 'superscript']], (editor) =>
    editor.isActive('superscript'),
  ),
  code: mark('code', 'code', 'Code', 'toggleCode'),
  highlight: command('highlight', 'Highlight', [['toggleMark', 'highlight']], (editor) =>
    editor.isActive('highlight'),
  ),
  textColor: {
    key: 'text_color',
    label: 'Text color',
    run: (_editor, { togglePanel }) => togglePanel('textColor'),
    active: (editor) => editor.isActive('textColor'),
  },
  link: {
    key: 'link',
    label: 'Link',
    run: (editor, { prompt, t }) => {
      const url = prompt(t('form.link_prompt', 'URL'))

      if (url === null) return
      if (url === '') runEditorCommands(editor, [['unsetLink']])
      else
        runEditorCommands(editor, [
          ['extendMarkRange', 'link'],
          ['setLink', { href: url }],
        ])
    },
    active: (editor) => editor.isActive('link'),
  },
  h1: command('h1', 'Heading 1', [['toggleHeading', { level: 1 }]], (editor) =>
    editor.isActive('heading', { level: 1 }),
  ),
  h2: command('h2', 'Heading 2', [['toggleHeading', { level: 2 }]], (editor) =>
    editor.isActive('heading', { level: 2 }),
  ),
  h3: command('h3', 'Heading 3', [['toggleHeading', { level: 3 }]], (editor) =>
    editor.isActive('heading', { level: 3 }),
  ),
  h4: command('h4', 'Heading 4', [['toggleHeading', { level: 4 }]], (editor) =>
    editor.isActive('heading', { level: 4 }),
  ),
  h5: command('h5', 'Heading 5', [['toggleHeading', { level: 5 }]], (editor) =>
    editor.isActive('heading', { level: 5 }),
  ),
  h6: command('h6', 'Heading 6', [['toggleHeading', { level: 6 }]], (editor) =>
    editor.isActive('heading', { level: 6 }),
  ),
  heading: command('heading', 'Heading', [['toggleHeading', { level: 2 }]], (editor) =>
    editor.isActive('heading'),
  ),
  // Turns a heading (or another text block) back into a plain paragraph.
  paragraph: command(
    'paragraph',
    'Paragraph',
    [['setParagraph']],
    (editor) => editor.isActive('paragraph') && !editor.isActive('paragraph', { lead: true }),
  ),
  alignStart: align('start', 'Align to start'),
  alignCenter: align('center', 'Align center'),
  alignEnd: align('end', 'Align to end'),
  alignJustify: align('justify', 'Justify'),
  blockquote: command('blockquote', 'Quote', [['toggleBlockquote']], (editor) =>
    editor.isActive('blockquote'),
  ),
  codeBlock: command('code_block', 'Code block', [['toggleCodeBlock']], (editor) =>
    editor.isActive('codeBlock'),
  ),
  bulletList: command('bullet_list', 'Bullet list', [['toggleBulletList']], (editor) =>
    editor.isActive('bulletList'),
  ),
  orderedList: command('ordered_list', 'Numbered list', [['toggleOrderedList']], (editor) =>
    editor.isActive('orderedList'),
  ),
  horizontalRule: command('divider', 'Divider', [['setHorizontalRule']]),
  details: {
    key: 'details',
    label: 'Collapsible section',
    run: (editor, { t }) =>
      void runEditorCommands(editor, [
        [
          'insertContent',
          {
            type: 'details',
            content: [
              {
                type: 'detailsSummary',
                content: [{ type: 'text', text: t('editor.details_summary', 'Summary') }],
              },
              { type: 'detailsContent', content: [{ type: 'paragraph' }] },
            ],
          },
        ],
      ]),
    active: (editor) => editor.isActive('details'),
  },
  lead: {
    key: 'lead',
    label: 'Lead paragraph',
    run: (editor) =>
      void runEditorCommands(editor, [
        ['setParagraph'],
        ['updateAttributes', 'paragraph', { lead: !editor.isActive('paragraph', { lead: true }) }],
      ]),
    active: (editor) => editor.isActive('paragraph', { lead: true }),
  },
  small: command('small', 'Small text', [['toggleMark', 'small']], (editor) =>
    editor.isActive('small'),
  ),
  grid: {
    key: 'grid',
    label: 'Insert columns',
    run: (editor, { prompt, t }) => {
      const answer = prompt(t('editor.grid_columns', 'Number of columns (2–6)'))

      if (answer === null) return

      void runEditorCommands(editor, [['insertContent', gridContent(parseGridColumns(answer))]])
    },
    active: (editor) => editor.isActive('grid'),
  },
  gridAddColumnBefore: command('grid_add_column_before', 'Add column before', [
    ['addGridColumnBefore'],
  ]),
  gridAddColumnAfter: command('grid_add_column_after', 'Add column after', [
    ['addGridColumnAfter'],
  ]),
  gridDeleteColumn: command('grid_delete_column', 'Delete column', [['deleteGridColumn']]),
  gridDelete: command('grid_delete', 'Delete columns', [['deleteNode', 'grid']]),
  table: command(
    'table',
    'Insert table',
    [['insertTable', { rows: 3, cols: 3, withHeaderRow: true }]],
    (editor) => editor.isActive('table'),
  ),
  tableAddColumnBefore: tableCommand(
    'table_add_column_before',
    'Add column before',
    'addColumnBefore',
  ),
  tableAddColumnAfter: tableCommand('table_add_column_after', 'Add column after', 'addColumnAfter'),
  tableDeleteColumn: tableCommand('table_delete_column', 'Delete column', 'deleteColumn'),
  tableAddRowBefore: tableCommand('table_add_row_before', 'Add row above', 'addRowBefore'),
  tableAddRowAfter: tableCommand('table_add_row_after', 'Add row below', 'addRowAfter'),
  tableDeleteRow: tableCommand('table_delete_row', 'Delete row', 'deleteRow'),
  tableMergeCells: tableCommand('table_merge_cells', 'Merge cells', 'mergeCells'),
  tableSplitCell: tableCommand('table_split_cell', 'Split cell', 'splitCell'),
  tableToggleHeaderRow: tableCommand(
    'table_toggle_header_row',
    'Toggle header row',
    'toggleHeaderRow',
  ),
  tableToggleHeaderCell: tableCommand(
    'table_toggle_header_cell',
    'Toggle header cell',
    'toggleHeaderCell',
  ),
  tableDelete: tableCommand('table_delete', 'Delete table', 'deleteTable'),
  clearFormatting: command('clear_formatting', 'Clear formatting', [
    ['unsetAllMarks'],
    ['clearNodes'],
  ]),
  attachFiles: {
    key: 'image',
    label: 'Insert image',
    run: (_editor, { pickImage }) => pickImage(),
  },
  undo: command('undo', 'Undo', [['undo']]),
  redo: command('redo', 'Redo', [['redo']]),
}

/** Columns of a `grid` from the prompt's answer: 2 to 6 (2 when it isn't a number). */
export function parseGridColumns(answer: string): number {
  const columns = Number.parseInt(answer.trim(), 10)

  return Number.isFinite(columns) ? Math.min(6, Math.max(2, columns)) : 2
}

/** The Tiptap content the `grid` button inserts: `columns` columns with an empty paragraph. */
export function gridContent(columns: number) {
  return {
    type: 'grid',
    attrs: { columns },
    content: Array.from({ length: columns }, () => ({
      type: 'gridColumn',
      content: [{ type: 'paragraph' }],
    })),
  }
}

/** The translated label of a toolbar button. */
export function toolbarButtonLabel(
  name: string,
  t: (key: string, fallback: string) => string,
): string {
  const button = TOOLBAR_COMMANDS[name]

  return button ? t(`editor.${button.key}`, button.label) : name
}

/** Whether the table row of buttons should show: a `table` button and the cursor in a table. */
export function showsTableToolbar(buttons: string[], editor: ToolbarEditor | null): boolean {
  return Boolean(editor) && buttons.includes('table') && editor!.isActive('table')
}

/** Set (or with `null` remove) the text colour of the selection. */
export function setTextColor(editor: ToolbarEditor, color: string | null): boolean {
  return color
    ? runEditorCommands(editor, [['setMark', 'textColor', { color }]])
    : runEditorCommands(editor, [['unsetMark', 'textColor']])
}

// ---------------------------------------------------------------- Links

/** Whitespace, control and invisible format characters browsers ignore inside a scheme. */
const INVISIBLE_URL_CHARACTERS = new RegExp(
  // eslint-disable-next-line no-control-regex -- control characters are what it removes
  '[\\u0000-\\u0020\\u007F\\u0080-\\u00A0\\u200B-\\u200F\\u2028-\\u202F\\uFEFF]',
  'g',
)

/** Link schemes the editor allows without `linkProtocols()` (as the server's sanitiser). */
export const DEFAULT_LINK_PROTOCOLS = ['http', 'https', 'mailto', 'tel']

/**
 * Whether a link URL may be stored: relative URLs and fragments always, absolute ones when
 * their scheme is in `protocols` (`linkProtocols()`, else the defaults). Mirrors
 * `Support\Url::isSafe()`: whitespace and control characters inside the scheme are ignored.
 */
export function isAllowedLinkUrl(url: string, protocols?: string[] | null): boolean {
  const allowed = (protocols ?? DEFAULT_LINK_PROTOCOLS).map((protocol) =>
    protocol.toLowerCase().replace(/:$/, ''),
  )
  const probe = url.replace(INVISIBLE_URL_CHARACTERS, '')

  if (/^[/\\]{2}/.test(probe)) return allowed.includes('https') || allowed.includes('http')

  const scheme = /^([^/?#]*):/.exec(probe)?.[1]

  if (scheme === undefined) return true

  return /^[a-z][a-z0-9+.-]*$/i.test(scheme) && allowed.includes(scheme.toLowerCase())
}

/** Options of Tiptap's `Link` extension (`Link.configure(linkExtensionOptions(…))`). */
export function linkExtensionOptions(protocols?: string[] | null) {
  return {
    openOnClick: false,
    autolink: true,
    isAllowedUri: (url: string) => isAllowedLinkUrl(url, protocols),
  }
}

/** Mirrors `Html::isSafeColor()`: colours the server keeps. */
export function isSafeColor(color: string): boolean {
  const value = color.trim()

  return (
    /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ||
    /^(?:rgba?|hsla?)\(\s*[0-9.%\s,/deg+-]{1,60}\)$/i.test(value) ||
    /^[a-z]{3,20}$/i.test(value)
  )
}

// ---------------------------------------------------------------- Attachments

/** Why a picked file can't be inserted (`fileAttachmentsAcceptedFileTypes` / `MaxSize`), or null. */
export function fileAttachmentError(
  file: Pick<File, 'type' | 'size'>,
  options: { acceptedFileTypes?: string[]; maxSize?: number },
): 'invalid_type' | 'too_large' | null {
  const mime = file.type.toLowerCase()
  const accepted = options.acceptedFileTypes ?? [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
  ]
  const matches = accepted.some((type) => {
    const candidate = type.trim().toLowerCase()

    return (
      candidate === mime ||
      candidate === '*/*' ||
      (candidate.endsWith('/*') && mime.startsWith(candidate.slice(0, -1)))
    )
  })

  if (!mime.startsWith('image/') || mime.startsWith('image/svg') || !matches) {
    return 'invalid_type'
  }

  if (options.maxSize && file.size > options.maxSize * 1024) return 'too_large'

  return null
}

// ---------------------------------------------------------------- Tiptap configurations

type HTMLAttributes = Record<string, unknown>

const simpleMark = (name: string, tag: string, excludes?: string) => ({
  name,
  ...(excludes ? { excludes } : {}),
  parseHTML() {
    return [{ tag }]
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: HTMLAttributes }): [string, HTMLAttributes, 0] {
    return [tag, HTMLAttributes, 0]
  },
})

/** `Mark.create(highlightMarkConfig())`: `<mark>`. */
export function highlightMarkConfig() {
  return simpleMark('highlight', 'mark')
}

/** `Mark.create(subscriptMarkConfig())`: `<sub>`. */
export function subscriptMarkConfig() {
  return simpleMark('subscript', 'sub', 'superscript')
}

/** `Mark.create(superscriptMarkConfig())`: `<sup>`. */
export function superscriptMarkConfig() {
  return simpleMark('superscript', 'sup', 'subscript')
}

/** `Mark.create(smallMarkConfig())`: `<small>`. */
export function smallMarkConfig() {
  return simpleMark('small', 'small')
}

/** `Mark.create(textColorMarkConfig())`: `<span data-color style="color">`. */
export function textColorMarkConfig() {
  return {
    name: 'textColor',
    addAttributes() {
      return {
        color: {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const color = element.getAttribute('data-color') ?? element.style.color

            return color && isSafeColor(color) ? color : null
          },
          renderHTML: (attributes: HTMLAttributes) =>
            typeof attributes.color === 'string' && isSafeColor(attributes.color)
              ? { 'data-color': attributes.color, style: `color: ${attributes.color}` }
              : {},
        },
      }
    },
    parseHTML() {
      return [{ tag: 'span[data-color]' }]
    },
    renderHTML({
      HTMLAttributes,
    }: {
      HTMLAttributes: HTMLAttributes
    }): [string, HTMLAttributes, 0] {
      return ['span', HTMLAttributes, 0]
    },
  }
}

function normalizeAlignment(value: string | null | undefined): TextAlignment | null {
  if (!value) return null

  const alignment = value.trim().toLowerCase()

  return (ALIGNMENTS as string[]).includes(alignment) ? (alignment as TextAlignment) : null
}

/** `Extension.create(textAlignExtensionConfig())`: a `textAlign` attribute on paragraphs and headings. */
export function textAlignExtensionConfig() {
  return {
    name: 'textAlign',
    addGlobalAttributes() {
      return [
        {
          types: ['paragraph', 'heading'],
          attributes: {
            textAlign: {
              default: null,
              parseHTML: (element: HTMLElement) => normalizeAlignment(element.style.textAlign),
              renderHTML: (attributes: HTMLAttributes) => {
                const alignment = normalizeAlignment(attributes.textAlign as string | null)

                return alignment ? { style: `text-align: ${alignment}` } : {}
              },
            },
          },
        },
      ]
    },
  }
}

/** `Extension.create(leadExtensionConfig())`: a `lead` attribute on paragraphs (`<p class="alfakit-lead">`). */
export function leadExtensionConfig() {
  return {
    name: 'lead',
    addGlobalAttributes() {
      return [
        {
          types: ['paragraph'],
          attributes: {
            lead: {
              default: false,
              // Filament stores `<p class="lead">`.
              parseHTML: (element: HTMLElement) =>
                element.classList.contains('alfakit-lead') || element.classList.contains('lead'),
              renderHTML: (attributes: HTMLAttributes) =>
                attributes.lead === true ? { class: 'alfakit-lead' } : {},
            },
          },
        },
      ]
    },
  }
}

/** Columns of a stored grid: its `alfakit-grid-cols-N` class, else its column count. */
function gridColumnsOf(element: HTMLElement): number {
  const match = /\balfakit-grid-cols-(\d)\b/.exec(element.className)
  const columns = match
    ? Number(match[1])
    : element.querySelectorAll(':scope > [data-type="gridColumn"]').length

  return Math.min(6, Math.max(2, columns || 2))
}

/** Most columns a grid can have (`alfakit-grid-cols-2` … `-6`). */
export const GRID_MAX_COLUMNS = 6

/** Fewest columns a grid can have; deleting below this unwraps the grid. */
export const GRID_MIN_COLUMNS = 2

interface PmNode {
  type: { name: string }
  attrs: Record<string, unknown>
  nodeSize: number
  childCount: number
  forEach(callback: (child: PmNode, offset: number) => void): void
}

interface PmResolvedPos {
  depth: number
  node(depth: number): PmNode
  before(depth: number): number
}

interface PmTransaction {
  selection: { $from: PmResolvedPos }
  doc: { resolve(pos: number): unknown }
  setNodeMarkup(pos: number, type: unknown, attrs: Record<string, unknown>): PmTransaction
  insert(pos: number, node: unknown): PmTransaction
  delete(from: number, to: number): PmTransaction
  replaceWith(from: number, to: number, content: PmNode[]): PmTransaction
  scrollIntoView(): PmTransaction
}

interface GridCommandProps {
  tr: PmTransaction
  dispatch?: unknown
  editor: {
    schema: { nodes: Record<string, { createAndFill(attrs?: unknown): unknown } | undefined> }
  }
}

/** The grid around the selection and the column the selection is in (direct child). */
export function findGridContext(
  $from: PmResolvedPos,
): { grid: { node: PmNode; pos: number }; column: { node: PmNode; pos: number } } | null {
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name !== 'gridColumn') continue
    if (depth < 2 || $from.node(depth - 1).type.name !== 'grid') return null

    return {
      grid: { node: $from.node(depth - 1), pos: $from.before(depth - 1) },
      column: { node: $from.node(depth), pos: $from.before(depth) },
    }
  }

  return null
}

const addGridColumn =
  (after: boolean) =>
  () =>
  ({ tr, dispatch, editor }: GridCommandProps): boolean => {
    const context = findGridContext(tr.selection.$from)
    const columnType = editor.schema.nodes.gridColumn

    if (!context || !columnType || context.grid.node.childCount >= GRID_MAX_COLUMNS) return false

    if (dispatch) {
      const column = columnType.createAndFill()
      const position = after
        ? context.column.pos + context.column.node.nodeSize
        : context.column.pos

      tr.setNodeMarkup(context.grid.pos, undefined, {
        ...context.grid.node.attrs,
        columns: context.grid.node.childCount + 1,
      })
        .insert(position, column)
        .scrollIntoView()
    }

    return true
  }

/**
 * Delete the column the selection is in with its content. A two-column grid can't shrink
 * further: the remaining column's content replaces the grid.
 */
const deleteGridColumn =
  () =>
  ({ tr, dispatch }: GridCommandProps): boolean => {
    const context = findGridContext(tr.selection.$from)

    if (!context) return false

    if (dispatch) {
      const { grid, column } = context

      if (grid.node.childCount <= GRID_MIN_COLUMNS) {
        const content: PmNode[] = []

        grid.node.forEach((child, offset) => {
          if (grid.pos + 1 + offset !== column.pos) child.forEach((node) => content.push(node))
        })

        tr.replaceWith(grid.pos, grid.pos + grid.node.nodeSize, content).scrollIntoView()
      } else {
        tr.setNodeMarkup(grid.pos, undefined, {
          ...grid.node.attrs,
          columns: grid.node.childCount - 1,
        })
          .delete(column.pos, column.pos + column.node.nodeSize)
          .scrollIntoView()
      }
    }

    return true
  }

/** `Node.create()` each of these: the `grid` column layout and its columns. */
export function gridNodeConfigs() {
  return [
    {
      name: 'grid',
      group: 'block',
      content: 'gridColumn+',
      defining: true,
      isolating: true,
      // `gridAddColumnBefore`, `gridAddColumnAfter` and `gridDeleteColumn` buttons.
      addCommands() {
        return {
          addGridColumnBefore: addGridColumn(false),
          addGridColumnAfter: addGridColumn(true),
          deleteGridColumn,
        }
      },
      addAttributes() {
        return {
          columns: {
            default: 2,
            parseHTML: (element: HTMLElement) => gridColumnsOf(element),
            renderHTML: () => ({}),
          },
        }
      },
      parseHTML() {
        return [{ tag: 'div[data-type="grid"]' }]
      },
      renderHTML({
        node,
      }: {
        node: { attrs: Record<string, unknown> }
      }): [string, HTMLAttributes, 0] {
        const columns = Math.min(6, Math.max(2, Number(node.attrs.columns) || 2))

        return [
          'div',
          { 'data-type': 'grid', class: `alfakit-grid alfakit-grid-cols-${columns}` },
          0,
        ]
      },
    },
    {
      name: 'gridColumn',
      content: 'block+',
      defining: true,
      isolating: true,
      selectable: false,
      parseHTML() {
        return [{ tag: 'div[data-type="gridColumn"]' }]
      },
      renderHTML(): [string, HTMLAttributes, 0] {
        return ['div', { 'data-type': 'gridColumn', class: 'alfakit-grid-column' }, 0]
      },
    },
  ]
}

interface MutationLike {
  type: string
  target: unknown
}

/**
 * `Node.create()` each of these: a collapsible section. In the editor it always shows
 * open (a `<details>` that closes would hide what is being edited).
 */
export function detailsNodeConfigs() {
  return [
    {
      name: 'details',
      group: 'block',
      content: 'detailsSummary detailsContent',
      defining: true,
      isolating: true,
      parseHTML() {
        return [{ tag: 'details' }]
      },
      renderHTML(): [string, HTMLAttributes, 0] {
        return ['details', {}, 0]
      },
      addNodeView() {
        return () => {
          const dom = document.createElement('details')
          dom.open = true
          dom.setAttribute('data-slot', 'rich-editor-details')
          dom.addEventListener('toggle', () => {
            if (!dom.open) dom.open = true
          })

          return {
            dom,
            contentDOM: dom,
            ignoreMutation: (mutation: MutationLike) =>
              mutation.type === 'attributes' && mutation.target === dom,
          }
        }
      },
    },
    {
      name: 'detailsSummary',
      content: 'inline*',
      defining: true,
      selectable: false,
      parseHTML() {
        return [{ tag: 'summary' }]
      },
      renderHTML(): [string, HTMLAttributes, 0] {
        return ['summary', {}, 0]
      },
    },
    {
      name: 'detailsContent',
      content: 'block+',
      defining: true,
      selectable: false,
      parseHTML() {
        return [{ tag: 'div[data-type="detailsContent"]' }]
      },
      renderHTML(): [string, HTMLAttributes, 0] {
        return ['div', { 'data-type': 'detailsContent' }, 0]
      },
    },
  ]
}

// ---------------------------------------------------------------- Markdown

function tableToMarkdown(table: HTMLElement, walk: (node: Node) => string): string {
  const rows = Array.from(table.querySelectorAll('tr'))

  if (rows.length === 0) return ''

  const cell = (element: Element) =>
    Array.from(element.childNodes)
      .map(walk)
      .join(' ')
      .replace(/\s*\n+\s*/g, ' ')
      .replace(/\|/g, '\\|')
      .trim()

  const lines = rows.map((row) => Array.from(row.children).map(cell))
  const columns = Math.max(...lines.map((line) => line.length))
  const pad = (line: string[]) => [...line, ...Array<string>(columns - line.length).fill('')]
  const format = (line: string[]) => `| ${pad(line).join(' | ')} |`
  const [head = [], ...body] = lines

  return `${[format(head), format(Array<string>(columns).fill('---')), ...body.map(format)].join('\n')}\n\n`
}

/**
 * HTML → Markdown for MarkdownEditor output: headings, emphasis, strikethrough, inline
 * code, code blocks, links, images, quotes, lists, rules and (GitHub) tables.
 */
export function htmlToMarkdown(html: string): string {
  const container = document.createElement('div')
  container.innerHTML = html

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''

    const element = node as HTMLElement
    const inner = () => Array.from(element.childNodes).map(walk).join('')

    switch (element.tagName) {
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
        return `${'#'.repeat(Number(element.tagName[1]))} ${inner()}\n\n`
      case 'P':
        return `${inner()}\n\n`
      case 'STRONG':
      case 'B':
        return `**${inner()}**`
      case 'EM':
      case 'I':
        return `*${inner()}*`
      case 'S':
        return `~~${inner()}~~`
      case 'CODE':
        return element.parentElement?.tagName === 'PRE' ? inner() : `\`${inner()}\``
      case 'PRE':
        return `\`\`\`\n${inner()}\n\`\`\`\n\n`
      case 'A':
        return `[${inner()}](${element.getAttribute('href') ?? ''})`
      case 'IMG':
        return `![${element.getAttribute('alt') ?? ''}](${element.getAttribute('src') ?? ''})`
      case 'BLOCKQUOTE':
        return `${inner()
          .trim()
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n')}\n\n`
      case 'UL':
        return `${Array.from(element.children)
          .map((li) => `- ${walk(li).trim()}`)
          .join('\n')}\n\n`
      case 'OL':
        return `${Array.from(element.children)
          .map((li, i) => `${i + 1}. ${walk(li).trim()}`)
          .join('\n')}\n\n`
      case 'TABLE':
        return tableToMarkdown(element, walk)
      case 'COLGROUP':
        return ''
      case 'HR':
        return `---\n\n`
      case 'BR':
        return '\n'
      default:
        return inner()
    }
  }

  return Array.from(container.childNodes).map(walk).join('').trim()
}
