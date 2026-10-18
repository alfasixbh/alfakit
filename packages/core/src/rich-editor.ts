import type { FormStore } from './form'
import { requestJson } from './http'
import type {
  RichEditorCustomBlockSchema,
  RichEditorMentionSchema,
  RichEditorMergeTagSchema,
} from './schema/components'
import { createStore, type Store } from './store'

/**
 * Framework-agnostic parts of the RichEditor extensions: Tiptap node configurations for
 * mentions, merge tags and custom blocks (renderers pass them to `Node.create()`), the
 * suggestion popup state for mentions and merge tags, and the server lookups (mention
 * search and custom block previews through the options endpoint).
 *
 * Stored formats (HTML; JSON documents use the same node names and attributes):
 * - mention: `<span data-type="mention" data-id="5" data-label="Jane" data-char="@">@Jane</span>`
 * - merge tag: `<span data-type="mergeTag" data-id="name">{{ name }}</span>`
 * - custom block: `<div data-type="customBlock" data-id="hero" data-config="{…}"></div>`
 */

export const MERGE_TAG_TRIGGER = '{{'

// ---------------------------------------------------------------- Node configurations

interface NodeLike {
  attrs: Record<string, unknown>
  nodeSize: number
  type: unknown
}

type AttributeSpec = {
  default: unknown
  parseHTML: (element: HTMLElement) => unknown
  renderHTML: (attributes: Record<string, unknown>) => Record<string, string>
}

function dataAttribute(key: string, name: string, fallback: unknown = null): AttributeSpec {
  return {
    default: fallback,
    parseHTML: (element) => element.getAttribute(name) ?? fallback,
    renderHTML: (attributes) =>
      attributes[key] === null || attributes[key] === undefined
        ? {}
        : { [name]: String(attributes[key]) },
  }
}

/** The text a mention shows: its trigger character and label. */
export function mentionText(attrs: Record<string, unknown>): string {
  return `${String(attrs.char ?? '@')}${String(attrs.label ?? attrs.id ?? '')}`
}

export function mergeTagText(attrs: Record<string, unknown>): string {
  return `{{ ${String(attrs.id ?? '')} }}`
}

/** `Node.create(mentionNodeConfig())`: an inline, atomic mention. */
export function mentionNodeConfig() {
  return {
    name: 'mention',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: false,
    addAttributes() {
      return {
        id: dataAttribute('id', 'data-id'),
        label: dataAttribute('label', 'data-label'),
        char: dataAttribute('char', 'data-char', '@'),
      }
    },
    parseHTML() {
      return [{ tag: 'span[data-type="mention"]' }]
    },
    renderHTML({
      node,
      HTMLAttributes,
    }: {
      node: NodeLike
      HTMLAttributes: Record<string, unknown>
    }): [string, Record<string, unknown>, string] {
      return [
        'span',
        { ...HTMLAttributes, 'data-type': 'mention', class: 'alfakit-mention' },
        mentionText(node.attrs),
      ]
    },
    renderText({ node }: { node: NodeLike }) {
      return mentionText(node.attrs)
    },
  }
}

/** `Node.create(mergeTagNodeConfig())`: an inline, atomic `{{ tag }}`. */
export function mergeTagNodeConfig() {
  return {
    name: 'mergeTag',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: false,
    addAttributes() {
      return { id: dataAttribute('id', 'data-id') }
    },
    parseHTML() {
      return [{ tag: 'span[data-type="mergeTag"]' }]
    },
    renderHTML({
      node,
      HTMLAttributes,
    }: {
      node: NodeLike
      HTMLAttributes: Record<string, unknown>
    }): [string, Record<string, unknown>, string] {
      return [
        'span',
        { ...HTMLAttributes, 'data-type': 'mergeTag', class: 'alfakit-merge-tag' },
        mergeTagText(node.attrs),
      ]
    },
    renderText({ node }: { node: NodeLike }) {
      return mergeTagText(node.attrs)
    },
  }
}

export interface CustomBlockNodeOptions {
  blocks: RichEditorCustomBlockSchema[]
  /**
   * Server-rendered preview HTML of a block configuration, and whether it gets the editor's
   * prose styles (`RichContentCustomBlock::shouldApplyProseStylingToPreview()`).
   */
  loadPreview: (id: string, config: Record<string, unknown>) => Promise<string | CustomBlockPreview>
  /** Open the block's modal to edit the configuration of the block at `pos`. */
  onEdit: (block: { id: string; config: Record<string, unknown>; pos: number }) => void
  labels: { edit: string; remove: string }
  /**
   * `minimalCustomBlockControls()`: compact edit and remove buttons over the preview; the
   * block's label stays for screen readers only.
   */
  minimal?: boolean
}

/** Inline styles of minimal block controls (the node view is plain DOM, outside Tailwind). */
const VISUALLY_HIDDEN =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0'

interface NodeViewEditor {
  isEditable: boolean
  view: { dispatch: (tr: never) => void }
  state: { tr: { delete: (from: number, to: number) => unknown } }
}

function parseConfig(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (typeof value === 'string' && value !== '') {
    try {
      const parsed: unknown = JSON.parse(value)

      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }

  return {}
}

/**
 * `Node.create(customBlockNodeConfig(options))`: an atomic block that shows the server's
 * preview, with edit and remove buttons. The node view is plain DOM, so every renderer
 * shares it.
 */
export function customBlockNodeConfig(options: CustomBlockNodeOptions) {
  return {
    name: 'customBlock',
    group: 'block',
    atom: true,
    draggable: true,
    selectable: true,
    addAttributes() {
      return {
        id: dataAttribute('id', 'data-id'),
        config: {
          default: {},
          parseHTML: (element: HTMLElement) => parseConfig(element.getAttribute('data-config')),
          renderHTML: (attributes: Record<string, unknown>) => ({
            'data-config': JSON.stringify(parseConfig(attributes.config)),
          }),
        },
      }
    },
    parseHTML() {
      return [{ tag: 'div[data-type="customBlock"]' }]
    },
    renderHTML({
      HTMLAttributes,
    }: {
      HTMLAttributes: Record<string, unknown>
    }): [string, Record<string, unknown>] {
      return ['div', { ...HTMLAttributes, 'data-type': 'customBlock' }]
    },
    addNodeView() {
      return ({
        node,
        getPos,
        editor,
      }: {
        node: NodeLike
        getPos: () => number | undefined
        editor: NodeViewEditor
      }) => createCustomBlockView(node, getPos, editor, options)
    },
  }
}

function createCustomBlockView(
  initial: NodeLike,
  getPos: () => number | undefined,
  editor: NodeViewEditor,
  options: CustomBlockNodeOptions,
) {
  let node = initial
  const dom = document.createElement('div')
  dom.className = 'alfakit-custom-block'
  dom.setAttribute('data-slot', 'rich-editor-custom-block')
  dom.contentEditable = 'false'

  const header = document.createElement('div')
  header.className = 'alfakit-custom-block-header'
  const title = document.createElement('span')
  const controls = document.createElement('span')
  controls.className = 'alfakit-custom-block-controls'

  const button = (label: string, onClick: () => void) => {
    const element = document.createElement('button')
    element.type = 'button'
    element.textContent = label
    element.addEventListener('mousedown', (event) => event.preventDefault())
    element.addEventListener('click', (event) => {
      event.preventDefault()
      onClick()
    })

    return element
  }

  const edit = button(options.labels.edit, () => {
    const pos = getPos()
    const block = options.blocks.find((candidate) => candidate.id === node.attrs.id)

    if (pos !== undefined && block?.action.hasModal) {
      options.onEdit({ id: block.id, config: parseConfig(node.attrs.config), pos })
    }
  })
  const remove = button(options.labels.remove, () => {
    const pos = getPos()

    if (pos !== undefined) {
      editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize) as never)
    }
  })

  controls.append(edit, remove)
  header.append(title, controls)

  const preview = document.createElement('div')
  preview.className = `alfakit-custom-block-preview ${NOT_PROSE_CLASS}`

  dom.append(header, preview)

  if (options.minimal) {
    dom.setAttribute('data-minimal', '')
    dom.style.position = 'relative'
    // Logical properties: the controls sit at the end side in both directions.
    header.style.cssText =
      'position:absolute;top:0.25rem;inset-inline-end:0.25rem;z-index:1;padding:0;border:0;background:transparent'
    title.style.cssText = VISUALLY_HIDDEN
    controls.style.cssText =
      'background:var(--background);border:1px solid var(--border);border-radius:calc(var(--radius) - 2px);padding:0.125rem'
  }

  let rendered = ''

  const render = () => {
    const id = String(node.attrs.id ?? '')
    const block = options.blocks.find((candidate) => candidate.id === id)
    const config = parseConfig(node.attrs.config)
    const key = `${id}:${JSON.stringify(config)}`

    title.textContent = block?.label ?? id
    edit.hidden = !editor.isEditable || !block?.action.hasModal
    remove.hidden = !editor.isEditable

    if (key === rendered) return

    rendered = key
    preview.setAttribute('aria-busy', 'true')

    void options
      .loadPreview(id, config)
      .then((loaded) => {
        // The block may have changed while the preview loaded.
        if (rendered === key) {
          const { html, prose } =
            typeof loaded === 'string' ? { html: loaded, prose: false } : loaded

          // Without prose styling the block's own markup is shown as is (Filament's default).
          preview.classList.toggle(NOT_PROSE_CLASS, !prose)
          // Trusted: rendered by the block class on the server.
          preview.innerHTML = html
        }
      })
      .catch(() => {
        if (rendered === key) preview.textContent = block?.label ?? id
      })
      .finally(() => preview.removeAttribute('aria-busy'))
  }

  render()

  return {
    dom,
    update(updated: NodeLike) {
      if (updated.type !== node.type) return false

      node = updated
      render()

      return true
    },
    stopEvent: () => false,
    ignoreMutation: () => true,
  }
}

// ---------------------------------------------------------------- Server lookups

/** A custom block preview: its HTML and whether the editor's prose styles apply to it. */
export interface CustomBlockPreview {
  html: string
  prose: boolean
}

/**
 * The class that keeps the editor's prose styles (`.alfakit-prose`) off a custom block
 * preview, unless the block's `shouldApplyProseStylingToPreview()` returns true.
 */
export const NOT_PROSE_CLASS = 'alfakit-not-prose'

/** Mention search and custom block previews for the RichEditor at `path`. */
export class RichEditorRemote {
  private readonly previews = new Map<string, Promise<CustomBlockPreview>>()

  constructor(
    private readonly form: FormStore | null,
    private readonly path: string,
  ) {}

  async searchMentions(trigger: string, search: string): Promise<SuggestionItem[]> {
    if (!this.form?.optionsUrl) return []

    const response = await requestJson<{ options?: Array<{ value: string; label: string }> }>(
      this.form.optionsUrl,
      {
        query: { ...this.form.queryContext(), path: this.path, mention: trigger, search },
      },
    )

    return (response.options ?? []).map((option) => ({ id: option.value, label: option.label }))
  }

  /** The preview HTML of a block configuration. */
  preview(id: string, config: Record<string, unknown>): Promise<string> {
    return this.loadPreview(id, config).then((preview) => preview.html)
  }

  /** The preview of a block configuration, with its prose styling flag. */
  loadPreview(id: string, config: Record<string, unknown>): Promise<CustomBlockPreview> {
    const key = `${id}:${JSON.stringify(config)}`
    let pending = this.previews.get(key)

    if (!pending) {
      pending = this.form?.optionsUrl
        ? requestJson<{ preview?: string; prose?: boolean }>(this.form.optionsUrl, {
            query: {
              ...this.form.queryContext(),
              path: this.path,
              block: id,
              config: JSON.stringify(config),
            },
          }).then((response) => ({ html: response.preview ?? '', prose: response.prose === true }))
        : Promise.resolve({ html: '', prose: false })

      // Failed lookups are retried on the next render.
      pending.catch(() => this.previews.delete(key))
      this.previews.set(key, pending)
    }

    return pending
  }

  /** Remember a preview the server already sent (with an insert or edit). */
  primePreview(id: string, config: Record<string, unknown>, html: string, prose = false): void {
    this.previews.set(`${id}:${JSON.stringify(config)}`, Promise.resolve({ html, prose }))
  }
}

/** The result of a custom block's field action: its configuration and preview. */
export interface CustomBlockResult {
  id: string
  config: Record<string, unknown>
  preview?: string
  /** `shouldApplyProseStylingToPreview()` of the block for this configuration. */
  prose?: boolean
}

export function isCustomBlockResult(value: unknown): value is CustomBlockResult {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as CustomBlockResult).id === 'string' &&
    typeof (value as CustomBlockResult).config === 'object'
  )
}

// ---------------------------------------------------------------- Suggestions

export interface SuggestionItem {
  id: string
  label: string
}

export interface SuggestionMatch {
  trigger: string
  query: string
}

/**
 * The trigger and query typed right before the cursor, e.g. `@ja` → `{ '@', 'ja' }`. A
 * trigger counts at the start of the text or after whitespace or an opening bracket, and
 * the query can't contain whitespace.
 */
export function findSuggestionMatch(
  textBefore: string,
  triggers: string[],
): SuggestionMatch | null {
  let best: { trigger: string; index: number } | null = null

  for (const trigger of triggers) {
    const index = textBefore.lastIndexOf(trigger)

    if (index === -1 || (best && index <= best.index)) continue

    const previous = index === 0 ? '' : (textBefore[index - 1] ?? '')

    if (previous !== '' && !/[\s([{"'\u00a0]/.test(previous)) continue

    const query = textBefore.slice(index + trigger.length)

    if (/\s/.test(query) || query.length > 50) continue

    best = { trigger, index }
  }

  return best
    ? { trigger: best.trigger, query: textBefore.slice(best.index + best.trigger.length) }
    : null
}

export function filterSuggestionItems(
  items: SuggestionItem[],
  query: string,
  limit = 10,
): SuggestionItem[] {
  const needle = query.toLocaleLowerCase()

  return items
    .filter(
      (item) =>
        needle === '' ||
        item.label.toLocaleLowerCase().includes(needle) ||
        item.id.toLocaleLowerCase().includes(needle),
    )
    .slice(0, limit)
}

export interface SuggestionState {
  open: boolean
  kind: 'mention' | 'mergeTag' | null
  trigger: string
  query: string
  items: SuggestionItem[]
  index: number
  loading: boolean
  /** Viewport coordinates of the trigger, for a `position: fixed` popup. */
  coords: { left: number; top: number; bottom: number } | null
}

interface ChainLike {
  focus(): ChainLike
  insertContentAt(range: { from: number; to: number }, content: unknown): ChainLike
  run(): boolean
}

/** The parts of a Tiptap editor the suggestions use. */
export interface SuggestionEditor {
  state: {
    selection: {
      from: number
      empty: boolean
      $from: {
        parentOffset: number
        parent: {
          textBetween(from: number, to: number, blockSeparator?: string, leafText?: string): string
        }
      }
    }
  }
  view: { coordsAtPos(pos: number): { left: number; top: number; bottom: number } }
  chain(): ChainLike
}

/** Viewport coordinates of `pos`; null where layout is unavailable (tests, hidden editors). */
function coordsAt(editor: SuggestionEditor, pos: number): SuggestionState['coords'] {
  try {
    return editor.view.coordsAtPos(pos)
  } catch {
    return null
  }
}

const CLOSED: SuggestionState = {
  open: false,
  kind: null,
  trigger: '',
  query: '',
  items: [],
  index: 0,
  loading: false,
  coords: null,
}

/**
 * The mention and merge tag popup: call `update(editor)` after every editor transaction
 * and `handleKeyDown()` from the editor's key handler; render `store` as a listbox.
 */
export class EditorSuggestions {
  public readonly store: Store<SuggestionState> = createStore<SuggestionState>({ ...CLOSED })

  private timer: ReturnType<typeof setTimeout> | null = null

  private request = 0

  private range: { from: number; to: number } | null = null

  constructor(
    private readonly options: {
      mentions: RichEditorMentionSchema[]
      mergeTags: RichEditorMergeTagSchema[]
      search: (trigger: string, query: string) => Promise<SuggestionItem[]>
    },
  ) {}

  get state(): SuggestionState {
    return this.store.get()
  }

  private get triggers(): string[] {
    return [
      ...this.options.mentions.map((mention) => mention.trigger),
      ...(this.options.mergeTags.length > 0 ? [MERGE_TAG_TRIGGER] : []),
    ]
  }

  update(editor: SuggestionEditor): void {
    const { selection } = editor.state

    if (!selection.empty || this.triggers.length === 0) {
      this.close()

      return
    }

    const { $from } = selection
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼')
    const match = findSuggestionMatch(textBefore, this.triggers)

    if (!match) {
      this.close()

      return
    }

    const from = selection.from - match.trigger.length - match.query.length
    this.range = { from, to: selection.from }

    const coords = coordsAt(editor, from)

    const current = this.state

    if (current.open && current.trigger === match.trigger && current.query === match.query) {
      this.store.update({ coords })

      return
    }

    if (match.trigger === MERGE_TAG_TRIGGER) {
      this.store.set({
        ...CLOSED,
        open: true,
        kind: 'mergeTag',
        trigger: match.trigger,
        query: match.query,
        coords,
        items: filterSuggestionItems(
          this.options.mergeTags.map((tag) => ({ id: tag.id, label: tag.label })),
          match.query,
        ),
      })

      return
    }

    const mention = this.options.mentions.find((candidate) => candidate.trigger === match.trigger)

    if (!mention) {
      this.close()

      return
    }

    if (!mention.searchable) {
      this.store.set({
        ...CLOSED,
        open: true,
        kind: 'mention',
        trigger: match.trigger,
        query: match.query,
        coords,
        items: filterSuggestionItems(mention.items ?? [], match.query),
      })

      return
    }

    this.store.set({
      ...CLOSED,
      open: true,
      kind: 'mention',
      trigger: match.trigger,
      query: match.query,
      coords,
      loading: true,
      items: current.open && current.trigger === match.trigger ? current.items : [],
    })

    if (this.timer) clearTimeout(this.timer)

    const request = ++this.request

    this.timer = setTimeout(() => {
      void this.options
        .search(match.trigger, match.query)
        .then((items) => {
          if (request === this.request && this.state.open) {
            this.store.update({ items, index: 0, loading: false })
          }
        })
        .catch(() => {
          if (request === this.request) this.store.update({ items: [], loading: false })
        })
    }, mention.searchDebounce ?? 250)
  }

  /** Arrow keys move, Enter/Tab insert, Escape closes. True when the key was handled. */
  handleKeyDown(event: Pick<KeyboardEvent, 'key'>, editor: SuggestionEditor): boolean {
    const state = this.state

    if (!state.open) return false

    if (event.key === 'Escape') {
      this.close()

      return true
    }

    if (state.items.length === 0) return false

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const step = event.key === 'ArrowDown' ? 1 : -1
      this.store.update({ index: (state.index + step + state.items.length) % state.items.length })

      return true
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      this.select(state.index, editor)

      return true
    }

    return false
  }

  highlight(index: number): void {
    this.store.update({ index })
  }

  select(index: number, editor: SuggestionEditor): void {
    const state = this.state
    const item = state.items[index]

    if (!state.open || !item || !this.range) return

    const content =
      state.kind === 'mergeTag'
        ? [{ type: 'mergeTag', attrs: { id: item.id } }]
        : [
            { type: 'mention', attrs: { id: item.id, label: item.label, char: state.trigger } },
            { type: 'text', text: ' ' },
          ]

    editor.chain().focus().insertContentAt(this.range, content).run()
    this.close()
  }

  close(): void {
    if (this.timer) clearTimeout(this.timer)

    this.timer = null
    this.request++
    this.range = null

    if (this.state.open) this.store.set({ ...CLOSED })
  }

  destroy(): void {
    this.close()
  }
}

// ---------------------------------------------------------------- JSON storage

/** Whether a JSON-mode state is a Tiptap document the editor can load. */
export function toEditorDocument(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (typeof value === 'string' && value.trim().startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(value)

      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
    } catch {
      return null
    }
  }

  return null
}
