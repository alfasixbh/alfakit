/**
 * The `alfakitDevTools` page prop (`Page::DEV_TOOLS_PROP`), present only while the panel's
 * dev tools are on (`app.debug` and `Panel::devTools()`); never in production. It feeds
 * the schema inspector.
 */
export interface DevToolsSchema {
  /** What the page's context token identifies. The token itself and the user id are never sent. */
  context: DevToolsContext
  /** The current tenant's key on tenant panels. */
  tenant: string | null
  /** The PHP classes behind the page, with editor links when `app.editor` is configured. */
  classes: DevToolsClass[]
  /** The configured editor (`vscode`, `phpstorm`…), or null. */
  editor: string | null
}

export interface DevToolsContext {
  panel: string
  page: string
  /** Route parameters (record key, tenant…) the token carries. */
  parameters: Record<string, string | number | boolean | null>
  component: string | null
  /** Whether the token is bound to the signed-in user. */
  boundToUser: boolean
  /** Unix time the token was issued. */
  issuedAt: number | null
  /** Unix time the token expires (`alfakit.token_lifetime`), or null when it never does. */
  expiresAt: number | null
}

export interface DevToolsClass {
  role: 'page' | 'resource' | 'model' | (string & {})
  class: string
  /** Path relative to the application. */
  file: string | null
  line: number | null
  /** `vscode://file/…:12`, or null without a configured editor. */
  url: string | null
}
