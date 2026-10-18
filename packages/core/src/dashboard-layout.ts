import { requestJson } from './http'
import type {
  DashboardCustomizeSchema,
  DashboardLayoutEntry,
  DashboardLibraryWidget,
} from './schema/widgets'
import { createStore, type Store } from './store'

/**
 * The "Edit dashboard" mode of a customizable dashboard (`Dashboard::customizable()`): a
 * draft of the user's layout (order, spans, hidden widgets, widgets added from the library)
 * that is saved to the server, which validates it against the dashboard's library.
 */

export interface DashboardEditorState {
  editing: boolean
  layout: DashboardLayoutEntry[]
  saving: boolean
  /** The draft differs from the saved layout. */
  dirty: boolean
  /** The id of the widget being dragged with the pointer. */
  dragging: string | null
  /** A message for the screen reader live region (moves, additions). */
  announcement: string
  error: string | null
}

/** A move asked for with the keyboard on a widget's drag handle. */
export type DashboardMove = -1 | 1 | 'first' | 'last'

/**
 * The move a key stands for on a drag handle. Left and right follow the reading direction
 * (in right-to-left layouts the left arrow moves a widget later).
 */
export function dashboardMoveForKey(key: string, dir: 'ltr' | 'rtl' = 'ltr'): DashboardMove | null {
  switch (key) {
    case 'ArrowUp':
      return -1
    case 'ArrowDown':
      return 1
    case 'ArrowLeft':
      return dir === 'rtl' ? 1 : -1
    case 'ArrowRight':
      return dir === 'rtl' ? -1 : 1
    case 'Home':
      return 'first'
    case 'End':
      return 'last'
    default:
      return null
  }
}

function sameLayout(a: DashboardLayoutEntry[], b: DashboardLayoutEntry[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (entry, index) =>
        entry.id === b[index]?.id &&
        entry.span === b[index]?.span &&
        entry.hidden === b[index]?.hidden,
    )
  )
}

function cloneLayout(layout: DashboardLayoutEntry[]): DashboardLayoutEntry[] {
  return layout.map((entry) => ({ ...entry }))
}

export type DashboardTranslator = (
  key: string,
  replacements?: Record<string, string | number>,
  fallback?: string,
) => string

export interface DashboardEditorOptions {
  /** Called after a successful save or reset (renderers reload the page's widgets). */
  onSaved?: (layout: DashboardLayoutEntry[]) => void
  t?: DashboardTranslator
}

export class DashboardEditor {
  public readonly store: Store<DashboardEditorState>

  private saved: DashboardLayoutEntry[]

  private readonly library: Map<string, DashboardLibraryWidget>

  constructor(
    private schema: DashboardCustomizeSchema,
    private readonly options: DashboardEditorOptions = {},
  ) {
    this.saved = cloneLayout(schema.layout)
    this.library = new Map(schema.library.map((widget) => [widget.id, widget]))
    this.store = createStore<DashboardEditorState>({
      editing: false,
      layout: cloneLayout(schema.layout),
      saving: false,
      dirty: false,
      dragging: null,
      announcement: '',
      error: null,
    })
  }

  /** New schema from the server (after a reload): the saved layout follows it. */
  sync(schema: DashboardCustomizeSchema): void {
    this.schema = schema
    this.saved = cloneLayout(schema.layout)
    this.library.clear()

    for (const widget of schema.library) {
      this.library.set(widget.id, widget)
    }

    if (!this.store.get().editing) {
      this.store.update({ layout: cloneLayout(schema.layout), dirty: false })
    }
  }

  private t(key: string, replacements: Record<string, string | number>, fallback: string): string {
    if (this.options.t) {
      return this.options.t(key, replacements, fallback)
    }

    return Object.entries(replacements).reduce(
      (text, [name, value]) => text.replaceAll(`:${name}`, String(value)),
      fallback,
    )
  }

  private commit(layout: DashboardLayoutEntry[], announcement = ''): void {
    this.store.update({ layout, dirty: !sameLayout(layout, this.saved), announcement, error: null })
  }

  widget(id: string): DashboardLibraryWidget | undefined {
    return this.library.get(id)
  }

  label(id: string): string {
    return this.library.get(id)?.label ?? id
  }

  /** Visible widgets of the draft, in order. */
  visible(): DashboardLayoutEntry[] {
    return this.store.get().layout.filter((entry) => !entry.hidden)
  }

  /** Hidden widgets and library widgets not on the dashboard: what "Add widget" offers. */
  available(): DashboardLibraryWidget[] {
    const shown = new Set(this.visible().map((entry) => entry.id))

    return this.schema.library.filter((widget) => !shown.has(widget.id))
  }

  /** The span of a widget in the draft (its own span when the user chose none). */
  spanOf(id: string): number {
    const entry = this.store.get().layout.find((item) => item.id === id)

    return entry?.span ?? this.library.get(id)?.span ?? 1
  }

  start(): void {
    this.store.update({
      editing: true,
      layout: cloneLayout(this.saved),
      dirty: false,
      announcement: this.t('dashboard.customize.editing', {}, 'Editing the dashboard'),
      error: null,
    })
  }

  cancel(): void {
    this.store.update({
      editing: false,
      layout: cloneLayout(this.saved),
      dirty: false,
      dragging: null,
      announcement: '',
      error: null,
    })
  }

  /** Move a visible widget to `index` among the visible widgets. */
  moveTo(id: string, index: number): void {
    const layout = cloneLayout(this.store.get().layout)
    const visible = layout.filter((entry) => !entry.hidden)
    const from = visible.findIndex((entry) => entry.id === id)

    if (from === -1) {
      return
    }

    const target = Math.max(0, Math.min(visible.length - 1, index))

    if (target === from) {
      return
    }

    const [moved] = visible.splice(from, 1)
    visible.splice(target, 0, moved!)

    // Hidden entries keep their place at the end.
    const hidden = layout.filter((entry) => entry.hidden)

    this.commit(
      [...visible, ...hidden],
      this.t(
        'dashboard.customize.moved',
        { widget: this.label(id), position: target + 1, total: visible.length },
        'Moved :widget to position :position of :total',
      ),
    )
  }

  move(id: string, move: DashboardMove): void {
    const visible = this.visible()
    const index = visible.findIndex((entry) => entry.id === id)

    if (index === -1) {
      return
    }

    this.moveTo(id, move === 'first' ? 0 : move === 'last' ? visible.length - 1 : index + move)
  }

  setSpan(id: string, span: number): void {
    const widget = this.library.get(id)

    if (!widget || !widget.spans.some((option) => option.value === span)) {
      return
    }

    this.commit(
      this.store
        .get()
        .layout.map((entry) =>
          entry.id === id ? { ...entry, span: span === widget.span ? null : span } : entry,
        ),
    )
  }

  hide(id: string): void {
    const layout = this.store.get().layout
    const entry = layout.find((item) => item.id === id)

    if (!entry || entry.hidden) {
      return
    }

    this.commit(
      [...layout.filter((item) => item.id !== id), { ...entry, hidden: true }],
      this.t('dashboard.customize.hidden', { widget: this.label(id) }, ':widget hidden'),
    )
  }

  /** Show a hidden widget or add a library widget, at the end of the dashboard. */
  add(id: string): void {
    if (!this.library.has(id)) {
      return
    }

    const layout = this.store.get().layout
    const entry = layout.find((item) => item.id === id) ?? { id, span: null, hidden: false }
    const visible = layout.filter((item) => !item.hidden && item.id !== id)
    const hidden = layout.filter((item) => item.hidden && item.id !== id)

    this.commit(
      [...visible, { ...entry, hidden: false }, ...hidden],
      this.t('dashboard.customize.added', { widget: this.label(id) }, ':widget added'),
    )
  }

  /** Put the developer's default layout in the draft (saved with "Save"). */
  resetDraft(): void {
    this.commit(
      cloneLayout(this.schema.defaultLayout),
      this.t('dashboard.customize.reset_done', {}, 'Default layout restored'),
    )
  }

  dragStart(id: string): void {
    this.store.update({ dragging: id })
  }

  /** Drop the dragged widget onto another widget's place. */
  dropOn(id: string): void {
    const dragging = this.store.get().dragging

    this.store.update({ dragging: null })

    if (dragging === null || dragging === id) {
      return
    }

    const index = this.visible().findIndex((entry) => entry.id === id)

    if (index !== -1) {
      this.moveTo(dragging, index)
    }
  }

  dragEnd(): void {
    this.store.update({ dragging: null })
  }

  /** Save the draft (or, with `reset`, forget the user's layout). */
  async save(reset = false): Promise<boolean> {
    if (!this.schema.endpoint) {
      return false
    }

    const state = this.store.get()
    const isDefault = sameLayout(state.layout, this.schema.defaultLayout)

    this.store.update({ saving: true, error: null })

    try {
      const response = await requestJson<{ layout: DashboardLayoutEntry[] }>(this.schema.endpoint, {
        method: 'POST',
        body:
          reset || isDefault
            ? { token: this.schema.token, reset: true }
            : { token: this.schema.token, layout: state.layout },
      })

      this.saved = cloneLayout(response.layout)
      this.store.update({
        saving: false,
        editing: false,
        dirty: false,
        dragging: null,
        layout: cloneLayout(response.layout),
        announcement: this.t('dashboard.customize.saved', {}, 'Dashboard saved'),
      })
      this.options.onSaved?.(response.layout)

      return true
    } catch {
      this.store.update({
        saving: false,
        error: this.t('dashboard.customize.failed', {}, 'The dashboard could not be saved.'),
      })

      return false
    }
  }
}
