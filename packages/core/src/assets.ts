/**
 * Plugin assets on the client: stylesheets and scripts registered with
 * `->loadedOnRequest()` (loaded by the component that needs them) and the data registered
 * with `Assets::registerScriptData()`.
 */

declare global {
  interface Window {
    /** Data from `Assets::registerScriptData()`. */
    alfakitData?: Record<string, unknown>
  }
}

const pending = new Map<string, Promise<void>>()

/**
 * Add a stylesheet to `<head>` once (`Assets::getStyleHref('id', 'acme/blog')`, passed in
 * the component's props). Resolves when it has loaded; repeated calls share the request.
 */
export function loadStyle(href: string | null | undefined): Promise<void> {
  return load(href, 'style')
}

/**
 * Add a script to `<head>` once (`Assets::getScriptSrc('id', 'acme/blog')`). Resolves when
 * it has run; pass `module: true` for an ES module.
 */
export function loadScript(
  src: string | null | undefined,
  options: { module?: boolean } = {},
): Promise<void> {
  return load(src, options.module ? 'module' : 'script')
}

function load(url: string | null | undefined, kind: 'style' | 'script' | 'module'): Promise<void> {
  if (!url || typeof document === 'undefined') return Promise.resolve()

  const key = `${kind === 'style' ? 'style' : 'script'}:${url}`
  const existing = pending.get(key)

  if (existing) return existing

  const selector =
    kind === 'style'
      ? `link[rel="stylesheet"][href="${CSS.escape(url)}"]`
      : `script[src="${CSS.escape(url)}"]`

  if (document.head.querySelector(selector)) {
    const ready = Promise.resolve()
    pending.set(key, ready)

    return ready
  }

  const promise = new Promise<void>((resolve, reject) => {
    const element =
      kind === 'style' ? document.createElement('link') : document.createElement('script')

    if (element instanceof HTMLLinkElement) {
      element.rel = 'stylesheet'
      element.href = url
    } else {
      element.src = url
      if (kind === 'module') element.type = 'module'
    }

    element.setAttribute('data-alfakit-asset', 'on-request')

    const nonce = document.querySelector<HTMLElement>('script[nonce], style[nonce]')?.nonce
    if (nonce) element.nonce = nonce

    element.addEventListener('load', () => resolve(), { once: true })
    element.addEventListener(
      'error',
      () => {
        pending.delete(key)
        element.remove()
        reject(new Error(`Could not load ${url}`))
      },
      { once: true },
    )

    document.head.appendChild(element)
  })

  pending.set(key, promise)

  return promise
}

/**
 * Data registered with `Assets::registerScriptData()`: everything, or one key.
 */
export function getScriptData(): Record<string, unknown>
export function getScriptData<T = unknown>(key: string): T | undefined
export function getScriptData(key?: string): unknown {
  const data = typeof window === 'undefined' ? {} : (window.alfakitData ?? {})

  return key === undefined ? data : data[key]
}
