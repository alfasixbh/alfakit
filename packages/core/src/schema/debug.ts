/**
 * The `alfakitDebug` page prop (`Page::DEBUG_PROP`), present only while the panel's debug
 * panel is active (`app.debug` on and `Panel::debugPanel()`); never in production.
 */
export interface DebugSchema {
  /** The page class. */
  page: string
  panel: string
  /** The resolved schema tree: header actions, form, infolist, table, widgets, relation managers. */
  tree: DebugNode[]
  /** Configuration closures `evaluate()` ran while building the page, grouped by owner and source line. */
  closures: DebugClosure[]
  /** Deprecated APIs the request used (`Deprecations::warn()` in PHP); empty when none. */
  deprecations?: DebugDeprecation[]
  server: DebugServerTimings
}

export interface DebugDeprecation {
  subject: string
  message: string
  since?: string | null
}

export interface DebugNode {
  /** Schema type (`TextInput`, `Action`, `TextColumn`, `Widget`…) or a group (`Form`, `Columns`). */
  type: string
  /** Key, name or state path identifying the node within its parent. */
  key?: string | null
  label?: string | null
  visible: boolean
  /** Authorisation result where one applies (actions, widgets, relation managers). */
  authorized?: boolean | null
  /** Why the node is hidden: `hidden()`, `visible(false)`, `hiddenOn(edit)`, `unauthorized`, `toggled off`… */
  reason?: string | null
  details?: Record<string, unknown>
  children?: DebugNode[]
}

export interface DebugClosure {
  /** `TextInput[title]`, `DeleteAction[delete]`, `Panel`… */
  owner: string
  /** Source file, relative to the application when inside it. */
  file: string
  line: number
  /** How many times that closure ran during the request. */
  count: number
}

export interface DebugServerTimings {
  /** Server time of the page request in milliseconds. */
  duration: number
  /** Peak memory in bytes. */
  memory: number
  queries: number
  /** Total query time in milliseconds. */
  queryTime: number
  php: string
  laravel: string
}
