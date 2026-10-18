/**
 * The translation editor of alfasix/alfakit-translation-manager: a schema component of
 * type `translation-manager` on the plugin's `Translations` page, rendered by the
 * `translation-manager` registry component. Every value, warning, plural label and
 * progress figure is computed by the server; the grid only shows and posts them.
 */

/** Translated keys of a locale (keys that have a base text). */
export interface TranslationProgressSchema {
  translated: number
  total: number
  /** 0 to 1. */
  percent: number
}

export interface TranslationLocaleSchema {
  code: string
  /** The language's name in the panel's language. */
  label: string
  direction: 'ltr' | 'rtl'
  /** The locale every other one is translated from. */
  base?: boolean
  /** The user may edit this locale. */
  editable: boolean
  /** Plural forms the locale's rules have. */
  pluralForms: number
  progress?: TranslationProgressSchema
}

/** A machine translation waiting for review. */
export interface TranslationSuggestionSchema {
  value: string
  warnings?: string[]
}

/** One key in one locale. */
export interface TranslationCellSchema {
  /** The text the application shows; absent when it is missing. */
  value?: string | null
  /** Plural forms (`value` split at `|`) when the base text is pluralised. */
  forms?: string[]
  /** What each form is used for (`1`, `0, 2, 3…`, `{0}`, `[1,19]`). */
  formLabels?: string[]
  /** Changed in the panel and not exported to the lang files yet. */
  changed?: boolean
  /** Placeholder, HTML and plural problems compared with the base text. */
  warnings?: string[]
  suggestion?: TranslationSuggestionSchema
  editable?: boolean
}

export interface TranslationRowSchema {
  /** Opaque key id posted back with every request. */
  id: string
  /** `group.key`, `namespace::group.key` or the JSON key. */
  key: string
  group: string
  groupLabel: string
  /** The base text has plural forms. */
  plural?: boolean
  /** The placeholders of the base text (`:name`). */
  placeholders?: string[]
  /** The last code scan found no use of the key. */
  unused?: boolean
  /** The code uses the key but no locale defines it. */
  undefined?: boolean
  /** Files that use the key (from the last scan). */
  files?: string[]
  cells: Record<string, TranslationCellSchema>
}

export type TranslationFilter =
  'all' | 'missing' | 'changed' | 'warnings' | 'suggestions' | 'unused' | 'undefined'

/** A page of rows (the component's initial rows, and the `rows` action's result). */
export interface TranslationRowsResult {
  rows: TranslationRowSchema[]
  total: number
  page: number
  lastPage: number
  progress?: Record<string, TranslationProgressSchema>
}

export interface TranslationManagerSchema extends TranslationRowsResult {
  type: 'translation-manager'
  key: string
  /** The action context of the grid's JSON actions. */
  actionComponent: string
  /** Names of the JSON actions. */
  actions: { rows: string; save: string; history: string; suggestion: string }
  mode: 'database' | 'files' | 'both'
  baseLocale: string
  locales: TranslationLocaleSchema[]
  groups: Array<{ value: string; label: string }>
  /** The filters offered (`unused` and `undefined` only after a code scan). */
  filters: TranslationFilter[]
  /** ISO time of the last code scan. */
  scannedAt?: string | null
  perPage: number
}

/** One change in the history of a key. */
export interface TranslationHistoryEntry {
  id: number
  old: string | null
  new: string | null
  source: 'editor' | 'ai' | 'import' | (string & {})
  user: string | null
  at: string | null
}

export interface TranslationSaveResult {
  row: TranslationRowSchema
  progress: Record<string, TranslationProgressSchema>
}
