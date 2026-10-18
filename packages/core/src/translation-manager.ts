import type { ActionContext, ActionRunner } from './actions'
import { HttpError } from './http'
import type { ActionSchema } from './schema/actions'
import type { NotificationSchema } from './schema/notifications'
import type {
  TranslationCellSchema,
  TranslationFilter,
  TranslationHistoryEntry,
  TranslationLocaleSchema,
  TranslationManagerSchema,
  TranslationProgressSchema,
  TranslationRowSchema,
  TranslationRowsResult,
  TranslationSaveResult,
} from './schema/translation-manager'
import { createStore, type Store } from './store'

/**
 * The framework-agnostic half of the translation editor (alfasix/alfakit-translation-manager):
 * the visible page of rows, search and filters, the active and edited cell, saving, history
 * and AI suggestion reviews. Renderers draw the state and wire inputs and the keyboard to
 * it; every row, warning and figure comes from the server.
 */

/** The registry key of the translation editor. */
export const TRANSLATION_MANAGER_REGISTRY_KEY = 'translation-manager'

export interface TranslationCellRef {
  row: string
  locale: string
}

export interface TranslationHistoryState extends TranslationCellRef {
  entries: TranslationHistoryEntry[] | null
  loading: boolean
}

export interface TranslationManagerState {
  rows: TranslationRowSchema[]
  total: number
  page: number
  lastPage: number
  progress: Record<string, TranslationProgressSchema>
  search: string
  filter: TranslationFilter
  group: string
  /** Locale columns shown, in schema order. */
  visibleLocales: string[]
  loading: boolean
  /** The cell with the keyboard focus. */
  active: TranslationCellRef | null
  /** The cell being edited, with its draft (`forms` for plural texts). */
  editing: TranslationCellRef | null
  draft: string
  draftForms: string[] | null
  saving: boolean
  /** The last save error of the edited cell. */
  error: string | null
  history: TranslationHistoryState | null
  /** For a polite live region (`saved`, row counts). */
  announcement: string
}

export interface TranslationManagerEnvironment {
  runner: Pick<ActionRunner, 'executeJson'>
  token: string
  t: (key: string, replacements?: Record<string, string | number>, fallback?: string) => string
  notify(notifications: NotificationSchema[]): void
  error(message: string): void
}

export interface TranslationKeyResult {
  handled: boolean
  /** The cell to focus next. */
  focus?: TranslationCellRef
}

const SEARCH_DELAY = 250

/** The value of a cell (`''` when missing). */
export function translationCellValue(cell: TranslationCellSchema | undefined): string {
  return cell?.value ?? ''
}

export class TranslationManagerController {
  public readonly store: Store<TranslationManagerState>

  private requests = 0
  private searchTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private schema: TranslationManagerSchema,
    private env: TranslationManagerEnvironment,
  ) {
    this.store = createStore<TranslationManagerState>({
      rows: schema.rows,
      total: schema.total,
      page: schema.page,
      lastPage: schema.lastPage,
      progress: progressOf(schema.locales),
      search: '',
      filter: 'all',
      group: '',
      visibleLocales: schema.locales.map((locale) => locale.code),
      loading: false,
      active: null,
      editing: null,
      draft: '',
      draftForms: null,
      saving: false,
      error: null,
      history: null,
      announcement: '',
    })
  }

  get state(): TranslationManagerState {
    return this.store.get()
  }

  get component(): TranslationManagerSchema {
    return this.schema
  }

  setEnvironment(env: TranslationManagerEnvironment): void {
    this.env = env
  }

  /** A fresh schema from the server (after a header action): keep the user's view. */
  setSchema(schema: TranslationManagerSchema): void {
    const known = new Set(this.schema.locales.map((locale) => locale.code))
    this.schema = schema

    const codes = schema.locales.map((locale) => locale.code)
    const visible = codes.filter(
      (code) => this.state.visibleLocales.includes(code) || !known.has(code),
    )

    this.store.update({
      progress: progressOf(schema.locales),
      visibleLocales: visible.length > 0 ? visible : codes,
    })

    if (this.isDefaultView()) {
      this.store.update({
        rows: schema.rows,
        total: schema.total,
        page: schema.page,
        lastPage: schema.lastPage,
      })
    } else {
      void this.refresh()
    }
  }

  // ---------------------------------------------------------------- Locales

  locales(): TranslationLocaleSchema[] {
    return this.schema.locales
  }

  locale(code: string): TranslationLocaleSchema | undefined {
    return this.schema.locales.find((locale) => locale.code === code)
  }

  /** The locale columns shown, in schema order. */
  visibleLocales(): TranslationLocaleSchema[] {
    return this.schema.locales.filter((locale) => this.state.visibleLocales.includes(locale.code))
  }

  /** Show or hide a locale column (one stays visible). */
  toggleLocale(code: string, visible = !this.state.visibleLocales.includes(code)): void {
    const next = this.schema.locales
      .map((locale) => locale.code)
      .filter((locale) => (locale === code ? visible : this.state.visibleLocales.includes(locale)))

    if (next.length === 0) {
      return
    }

    this.store.update({ visibleLocales: next })

    // Status filters look at the visible locales.
    if (this.state.filter !== 'all') {
      void this.refresh()
    }
  }

  // ---------------------------------------------------------------- Rows

  private isDefaultView(): boolean {
    return (
      this.state.search === '' &&
      this.state.filter === 'all' &&
      this.state.group === '' &&
      this.state.page === 1
    )
  }

  row(id: string): TranslationRowSchema | undefined {
    return this.state.rows.find((row) => row.id === id)
  }

  cell(ref: TranslationCellRef | null): TranslationCellSchema | undefined {
    return ref ? this.row(ref.row)?.cells[ref.locale] : undefined
  }

  isEditable(ref: TranslationCellRef): boolean {
    return Boolean(this.locale(ref.locale)?.editable && this.cell(ref)?.editable)
  }

  setSearch(search: string): void {
    this.store.update({ search, page: 1 })

    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer)
    }

    this.searchTimer = setTimeout(() => {
      this.searchTimer = null
      void this.refresh()
    }, SEARCH_DELAY)
  }

  setFilter(filter: TranslationFilter): void {
    this.store.update({ filter, page: 1 })
    void this.refresh()
  }

  setGroup(group: string): void {
    this.store.update({ group, page: 1 })
    void this.refresh()
  }

  goToPage(page: number): void {
    const target = Math.min(Math.max(1, page), this.state.lastPage)

    if (target !== this.state.page) {
      this.store.update({ page: target })
      void this.refresh()
    }
  }

  /** Rows `from`–`to` of the current page (1-based, for the footer). */
  range(): { from: number; to: number } {
    const { page, rows, total } = this.state
    const from = total === 0 ? 0 : (page - 1) * this.schema.perPage + 1

    return { from, to: total === 0 ? 0 : from + rows.length - 1 }
  }

  /** Fetch the current page with the current search and filters. */
  async refresh(): Promise<boolean> {
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer)
      this.searchTimer = null
    }

    const request = ++this.requests
    const { search, filter, group, page } = this.state
    const base = this.schema.baseLocale

    this.store.update({ loading: true })

    try {
      const result = await this.run<TranslationRowsResult>(this.schema.actions.rows, {
        search,
        filter,
        group: group === '' ? null : group,
        page,
        locales: this.state.visibleLocales.filter((locale) => locale !== base),
      })

      if (request !== this.requests) {
        return false
      }

      const active =
        this.state.active && result.rows.some((row) => row.id === this.state.active?.row)

      this.store.update({
        rows: result.rows,
        total: result.total,
        page: result.page,
        lastPage: result.lastPage,
        progress: result.progress ?? this.state.progress,
        loading: false,
        active: active ? this.state.active : null,
        editing: null,
        draftForms: null,
        error: null,
        announcement: this.env.t(
          'translation-manager.pagination',
          { ...this.rangeOf(result), total: result.total },
          ':from–:to of :total',
        ),
      })

      return true
    } catch {
      if (request === this.requests) {
        this.store.update({ loading: false })
        this.env.error(
          this.env.t(
            'translation-manager.load_failed',
            {},
            'The translations could not be loaded.',
          ),
        )
      }

      return false
    }
  }

  private rangeOf(result: TranslationRowsResult): { from: number; to: number } {
    const from = result.total === 0 ? 0 : (result.page - 1) * this.schema.perPage + 1

    return { from, to: result.total === 0 ? 0 : from + result.rows.length - 1 }
  }

  // ---------------------------------------------------------------- Editing

  focus(ref: TranslationCellRef | null): void {
    this.store.update({ active: ref })
  }

  /** Open the editor of a cell (with its current text, or `initial`). */
  startEdit(ref: TranslationCellRef, initial?: string): boolean {
    if (!this.isEditable(ref) || this.state.saving) {
      return false
    }

    const cell = this.cell(ref)
    const forms = cell?.forms ? [...cell.forms] : null

    this.store.update({
      active: ref,
      editing: ref,
      draft: initial ?? translationCellValue(cell),
      draftForms: forms,
      error: null,
    })

    return true
  }

  setDraft(draft: string): void {
    this.store.update({ draft })
  }

  setDraftForm(index: number, value: string): void {
    const forms = [...(this.state.draftForms ?? [])]
    forms[index] = value
    this.store.update({ draftForms: forms })
  }

  /** Copy the base text into the draft. */
  copyBase(): void {
    const editing = this.state.editing

    if (!editing) {
      return
    }

    const base = this.row(editing.row)?.cells[this.schema.baseLocale]

    if (this.state.draftForms) {
      const forms = base?.forms ?? []
      this.store.update({
        draftForms: this.state.draftForms.map((form, index) => forms[index] ?? form),
      })
    } else {
      this.store.update({ draft: translationCellValue(base) })
    }
  }

  cancelEdit(): void {
    this.store.update({ editing: null, draftForms: null, error: null })
  }

  isDirty(): boolean {
    const editing = this.state.editing

    if (!editing) {
      return false
    }

    const cell = this.cell(editing)

    return this.state.draftForms
      ? JSON.stringify(this.state.draftForms) !== JSON.stringify(cell?.forms ?? [])
      : this.state.draft !== translationCellValue(cell)
  }

  /** Save the edited cell. Unchanged drafts just close the editor. */
  async save(): Promise<boolean> {
    const editing = this.state.editing

    if (!editing || this.state.saving) {
      return false
    }

    if (!this.isDirty()) {
      this.cancelEdit()

      return true
    }

    this.store.update({ saving: true, error: null })

    try {
      const result = await this.run<TranslationSaveResult>(this.schema.actions.save, {
        id: editing.row,
        locale: editing.locale,
        ...(this.state.draftForms ? { forms: this.state.draftForms } : { value: this.state.draft }),
      })

      this.replaceRow(result.row, result.progress)
      this.store.update({
        saving: false,
        editing: null,
        draftForms: null,
        announcement: this.env.t('translation-manager.saved', {}, 'Saved'),
      })

      if (this.state.history?.row === editing.row && this.state.history.locale === editing.locale) {
        void this.loadHistory(editing)
      }

      return true
    } catch (error) {
      const message =
        error instanceof HttpError && error.status === 422
          ? Object.values(error.errors)[0]?.[0]
          : undefined
      const text =
        message ??
        this.env.t('translation-manager.save_failed', {}, 'The translation could not be saved.')

      this.store.update({ saving: false, error: text })
      this.env.error(text)

      return false
    }
  }

  private replaceRow(
    row: TranslationRowSchema,
    progress?: Record<string, TranslationProgressSchema>,
  ): void {
    this.store.update({
      rows: this.state.rows.map((current) => (current.id === row.id ? row : current)),
      progress: progress ?? this.state.progress,
    })
  }

  // ---------------------------------------------------------------- Suggestions

  async decide(ref: TranslationCellRef, decision: 'accept' | 'reject'): Promise<boolean> {
    try {
      const result = await this.run<TranslationSaveResult>(this.schema.actions.suggestion, {
        id: ref.row,
        locale: ref.locale,
        decision,
      })

      this.replaceRow(result.row, result.progress)

      return true
    } catch {
      this.env.error(
        this.env.t('translation-manager.save_failed', {}, 'The translation could not be saved.'),
      )

      return false
    }
  }

  /** Accept (those without warnings) or reject every suggestion of a locale. */
  async decideAll(locale: string, decision: 'accept' | 'reject'): Promise<boolean> {
    try {
      const result = await this.run<{ count: number; notifications?: NotificationSchema[] }>(
        this.schema.actions.suggestion,
        { locale, decision, all: true },
      )

      this.env.notify(result.notifications ?? [])
      await this.refresh()

      return true
    } catch {
      this.env.error(
        this.env.t('translation-manager.save_failed', {}, 'The translation could not be saved.'),
      )

      return false
    }
  }

  /** Locales with a pending suggestion on the current page. */
  suggestionLocales(): string[] {
    return this.schema.locales
      .map((locale) => locale.code)
      .filter((code) => this.state.rows.some((row) => row.cells[code]?.suggestion))
  }

  // ---------------------------------------------------------------- History

  async loadHistory(ref: TranslationCellRef): Promise<boolean> {
    this.store.update({
      history: { ...ref, entries: this.state.history?.entries ?? null, loading: true },
    })

    try {
      const result = await this.run<{ entries: TranslationHistoryEntry[] }>(
        this.schema.actions.history,
        { id: ref.row, locale: ref.locale },
      )

      this.store.update({ history: { ...ref, entries: result.entries, loading: false } })

      return true
    } catch {
      this.store.update({ history: null })

      return false
    }
  }

  closeHistory(): void {
    this.store.update({ history: null })
  }

  // ---------------------------------------------------------------- Keyboard

  /**
   * Keys of a focused cell (not editing): arrows move (mirrored right to left), Home/End
   * jump within the row (with Ctrl: to the first/last row), Enter or F2 edit.
   */
  handleCellKey(
    ref: TranslationCellRef,
    event: { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean },
    direction: 'ltr' | 'rtl' = 'ltr',
  ): TranslationKeyResult {
    const rows = this.state.rows
    const columns = this.state.visibleLocales
    const rowIndex = rows.findIndex((row) => row.id === ref.row)
    const column = columns.indexOf(ref.locale)

    if (rowIndex < 0 || column < 0 || event.altKey) {
      return { handled: false }
    }

    const at = (r: number, c: number): TranslationCellRef => ({
      row: rows[Math.min(Math.max(0, r), rows.length - 1)]!.id,
      locale: columns[Math.min(Math.max(0, c), columns.length - 1)]!,
    })
    const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const backward = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    const jump = Boolean(event.ctrlKey || event.metaKey)

    switch (event.key) {
      case 'ArrowDown':
        return this.moveTo(at(rowIndex + 1, column))
      case 'ArrowUp':
        return this.moveTo(at(rowIndex - 1, column))
      case forward:
        return this.moveTo(at(rowIndex, column + 1))
      case backward:
        return this.moveTo(at(rowIndex, column - 1))
      case 'Home':
        return this.moveTo(at(jump ? 0 : rowIndex, 0))
      case 'End':
        return this.moveTo(at(jump ? rows.length - 1 : rowIndex, columns.length - 1))
      case 'PageDown':
        return this.moveTo(at(rows.length - 1, column))
      case 'PageUp':
        return this.moveTo(at(0, column))
      case 'Enter':
      case 'F2':
        return { handled: this.startEdit(ref) || event.key === 'Enter', focus: ref }
      default:
        return { handled: false }
    }
  }

  /**
   * Keys inside the editor: Enter saves and moves down (Shift + Enter is a line break),
   * Escape cancels, Tab saves and moves to the next column.
   */
  async handleEditorKey(event: {
    key: string
    shiftKey?: boolean
    isComposing?: boolean
  }): Promise<TranslationKeyResult> {
    const editing = this.state.editing

    if (!editing || event.isComposing) {
      return { handled: false }
    }

    if (event.key === 'Escape') {
      this.cancelEdit()

      return { handled: true, focus: editing }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      const saved = await this.save()

      return { handled: true, focus: saved ? this.neighbour(editing, 1, 0) : undefined }
    }

    if (event.key === 'Tab') {
      const saved = await this.save()

      return {
        handled: true,
        focus: saved ? this.neighbour(editing, 0, event.shiftKey ? -1 : 1) : undefined,
      }
    }

    return { handled: false }
  }

  private neighbour(ref: TranslationCellRef, rows: number, columns: number): TranslationCellRef {
    const rowIndex = this.state.rows.findIndex((row) => row.id === ref.row)
    const column = this.state.visibleLocales.indexOf(ref.locale)
    const row = this.state.rows[Math.min(Math.max(0, rowIndex + rows), this.state.rows.length - 1)]
    const locale =
      this.state.visibleLocales[
        Math.min(Math.max(0, column + columns), this.state.visibleLocales.length - 1)
      ]

    const next = row && locale ? { row: row.id, locale } : ref
    this.store.update({ active: next })

    return next
  }

  private moveTo(ref: TranslationCellRef): TranslationKeyResult {
    this.store.update({ active: ref })

    return { handled: true, focus: ref }
  }

  private run<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const action: ActionSchema = { type: 'Action', name, hasAction: true }
    const context: ActionContext = {
      token: this.env.token,
      component: this.schema.actionComponent,
      arguments: args,
    }

    return this.env.runner.executeJson<T>(action, context)
  }

  dispose(): void {
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer)
      this.searchTimer = null
    }
  }
}

function progressOf(locales: TranslationLocaleSchema[]): Record<string, TranslationProgressSchema> {
  return Object.fromEntries(
    locales.flatMap((locale) => (locale.progress ? [[locale.code, locale.progress]] : [])),
  )
}
