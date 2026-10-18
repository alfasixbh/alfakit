/**
 * Zero-registration custom components: the renderers' `createAlfakit({ discover })` takes
 * the result of `import.meta.glob()` over `resources/js/alfakit/{fields,columns,…}` and
 * registers every file under a key derived from its path, loading its code only when a
 * page uses it.
 *
 * ```ts
 * createAlfakit({
 *   discover: import.meta.glob('./{fields,columns,entries,widgets,pages,components,blocks}/**\/*.tsx'),
 * })
 * ```
 */

/** The auto-registered folders and the registry key prefix of each. */
export const DISCOVERY_FOLDERS = {
  /** `fields/ColorWheel.tsx` → `ColorWheel` (a `Field` whose type is its class name). */
  fields: '',
  /** `columns/ProgressBar.tsx` → `column:ProgressBar`. */
  columns: 'column:',
  /** `entries/StarRating.tsx` → `StarRating`. */
  entries: '',
  /** `widgets/RevenueChart.tsx` → `RevenueChart` (`Widget::$component` or the widget's type). */
  widgets: '',
  /** `components/map-picker.tsx` → `map-picker` (`View::make()`, schema components, overrides). */
  components: '',
  /** `blocks/pricing.tsx` → `cms:block:pricing` (CMS blocks). */
  blocks: 'cms:block:',
  /** `pages/Settings.tsx` → `Pages/Settings` (`Page::$component`); nested folders are kept. */
  pages: 'Pages/',
} as const

export type DiscoveryFolder = keyof typeof DISCOVERY_FOLDERS

/** `import.meta.glob()` output: lazy loaders (the default) or modules (`{ eager: true }`). */
export type DiscoveryModules = Record<string, unknown>

export interface DiscoveryKey {
  key: string
  /** `pages` for `Page::$component` pages, `components` for everything else. */
  section: 'components' | 'pages'
  folder: DiscoveryFolder
}

/**
 * The registry key of a discovered file, or null for files that are not components: outside
 * the folders, in a `_private` folder or file, or tests and stories. The path may be relative
 * to the entry (`./fields/ColorWheel.tsx`) or contain `/alfakit/` before the folder.
 */
export function discoveryKey(path: string): DiscoveryKey | null {
  const normalized = path.replace(/\\/g, '/')
  const marker = normalized.lastIndexOf('/alfakit/')
  const relative = (marker === -1 ? normalized : normalized.slice(marker + '/alfakit/'.length))
    .replace(/^(\.\.?\/)+/, '')
    .replace(/^\/+/, '')
  const segments = relative.split('/')
  const folder = segments.shift() as DiscoveryFolder | undefined

  if (!folder || !Object.hasOwn(DISCOVERY_FOLDERS, folder) || segments.length === 0) return null

  const file = segments.pop() as string
  const name = file.replace(/\.[^.]+$/, '')

  if (
    name === '' ||
    /\.(test|spec|stories|story|d)$/.test(name) ||
    [...segments, name].some((segment) => segment.startsWith('_') || segment.startsWith('.'))
  ) {
    return null
  }

  // `fields/ColorWheel/index.tsx` is `ColorWheel`.
  const base = name === 'index' ? segments.pop() : name

  if (!base) return null

  if (folder === 'pages') {
    return { key: `Pages/${[...segments, base].join('/')}`, section: 'pages', folder }
  }

  // Sub-folders only organise files: the key is the file name, like the PHP class basename.
  return { key: `${DISCOVERY_FOLDERS[folder]}${base}`, section: 'components', folder }
}

/** One auto-registered file. */
export interface DiscoveredEntry<TComponent> {
  key: string
  path: string
  section: 'components' | 'pages'
  /** The component once it has loaded (always set for eager modules). */
  readonly current: TComponent | undefined
  /** Load the component's code; resolves with its default export. */
  load(): Promise<TComponent>
}

export interface DiscoveryOptions {
  /** Where collision warnings go (default `console.warn`). */
  warn?: (message: string) => void
}

function componentOf<TComponent>(module: unknown, path: string): TComponent {
  if (module !== null && typeof module === 'object' && 'default' in module) {
    return (module as { default: TComponent }).default
  }

  throw new Error(`Alfakit: ${path} has no default export, so it cannot be auto-registered.`)
}

function createEntry<TComponent>(
  key: DiscoveryKey,
  path: string,
  source: unknown,
): DiscoveredEntry<TComponent> {
  let current: TComponent | undefined
  let promise: Promise<TComponent> | undefined

  if (typeof source !== 'function') {
    current = componentOf<TComponent>(source, path)
  }

  return {
    key: key.key,
    path,
    section: key.section,
    get current() {
      return current
    },
    load() {
      if (current !== undefined) return Promise.resolve(current)

      promise ??= Promise.resolve((source as () => unknown)()).then(
        (module) => (current = componentOf<TComponent>(module, path)),
        (error: unknown) => {
          promise = undefined
          throw error
        },
      )

      return promise
    },
  }
}

/** Keys of `type`, `component` and `view` values anywhere in a page's props. */
const SCHEMA_KEYS = new Set(['type', 'component', 'view'])

/**
 * Every string a page's props could name a registry key with: the `type`, `component` and
 * `view` values of every schema object (fields, columns, entries, widgets, blocks…).
 */
export function schemaComponentNames(value: unknown, names = new Set<string>()): Set<string> {
  const stack: unknown[] = [value]
  const seen = new Set<object>()

  while (stack.length > 0) {
    const item = stack.pop()

    if (item === null || typeof item !== 'object' || seen.has(item)) continue

    seen.add(item)

    if (Array.isArray(item)) {
      for (const child of item) if (child !== null && typeof child === 'object') stack.push(child)
      continue
    }

    for (const [key, child] of Object.entries(item)) {
      if (typeof child === 'string') {
        if (SCHEMA_KEYS.has(key)) names.add(child)
      } else if (child !== null && typeof child === 'object') {
        stack.push(child)
      }
    }
  }

  return names
}

/**
 * The auto-registered components of one app: built once from the glob, shared by the
 * browser and server renders. Renderers wrap each entry in their own lazy component.
 */
export class ComponentDiscovery<TComponent> {
  readonly components = new Map<string, DiscoveredEntry<TComponent>>()
  readonly pages = new Map<string, DiscoveredEntry<TComponent>>()

  constructor(modules: DiscoveryModules = {}, options: DiscoveryOptions = {}) {
    const warn = options.warn ?? ((message: string) => console.warn(message))

    for (const path of Object.keys(modules).sort()) {
      const key = discoveryKey(path)

      if (!key) continue

      const entries = key.section === 'pages' ? this.pages : this.components
      const existing = entries.get(key.key)

      if (existing) {
        warn(
          `Alfakit: "${existing.path}" and "${path}" both auto-register the component "${key.key}"; ` +
            `using "${existing.path}". Rename one of the files, or register the one you want with ` +
            `createAlfakit({ ${key.section}: { '${key.key}': … } }).`,
        )
        continue
      }

      entries.set(key.key, createEntry<TComponent>(key, path, modules[path]))
    }
  }

  get size(): number {
    return this.components.size + this.pages.size
  }

  /** The entries a page renders: its Inertia component and every registry key in its props. */
  entriesFor(
    page: { component?: string; props?: unknown } | undefined,
  ): DiscoveredEntry<TComponent>[] {
    if (!page || this.size === 0) return []

    const names = schemaComponentNames(page.props)
    const found = new Set<DiscoveredEntry<TComponent>>()

    if (page.component) names.add(page.component)

    for (const name of names) {
      const page = this.pages.get(name)

      if (page) found.add(page)

      for (const key of [
        name,
        `${DISCOVERY_FOLDERS.columns}${name}`,
        `${DISCOVERY_FOLDERS.blocks}${name}`,
      ]) {
        const entry = this.components.get(key)

        if (entry) found.add(entry)
      }
    }

    return [...found]
  }

  /**
   * Load the components a page needs before it renders, so the server render and hydration
   * show them straight away. Undefined when everything is loaded already.
   */
  preloadFor(page: { component?: string; props?: unknown } | undefined): Promise<void> | undefined {
    const pending = this.entriesFor(page).filter((entry) => entry.current === undefined)

    if (pending.length === 0) return undefined

    // A component that fails to load is reported where it renders, not here.
    return Promise.allSettled(pending.map((entry) => entry.load())).then(() => undefined)
  }

  /** Load every discovered component. */
  preloadAll(): Promise<void> {
    return Promise.allSettled(
      [...this.components.values(), ...this.pages.values()].map((entry) => entry.load()),
    ).then(() => undefined)
  }

  /** Wrap every entry with the renderer's lazy component. */
  map<TWrapped>(wrap: (entry: DiscoveredEntry<TComponent>) => TWrapped): {
    components: Record<string, TWrapped>
    pages: Record<string, TWrapped>
  } {
    const wrapAll = (entries: Map<string, DiscoveredEntry<TComponent>>) =>
      Object.fromEntries([...entries].map(([key, entry]) => [key, wrap(entry)]))

    return { components: wrapAll(this.components), pages: wrapAll(this.pages) }
  }
}

/**
 * Built-in components whose code is split per type: each key loads its component the first
 * time a page uses it. Renderers preload a page's entries before rendering it (the same
 * `preloadFor()` as discovered files), so neither the server render nor hydration flashes.
 */
export function lazyComponents<TComponent>(
  loaders: Record<string, () => Promise<TComponent>>,
): ComponentDiscovery<TComponent> {
  const discovery = new ComponentDiscovery<TComponent>()

  for (const [key, loader] of Object.entries(loaders)) {
    discovery.components.set(
      key,
      createEntry<TComponent>(
        { key, section: 'components', folder: 'components' },
        `alfakit:${key}`,
        () => loader().then((component) => ({ default: component })),
      ),
    )
  }

  return discovery
}

/**
 * Run `callback` once the browser is idle (`requestIdleCallback`, else a timeout), e.g. to
 * preload the lazily split built-ins after the first render so action modals' fields are
 * ready when opened. Does nothing outside the browser.
 */
export function whenIdle(callback: () => void, timeout = 2000): void {
  if (typeof window === 'undefined') return

  const idle = (
    window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    }
  ).requestIdleCallback

  if (typeof idle === 'function') {
    idle.call(window, callback, { timeout })
  } else {
    setTimeout(callback, Math.min(timeout, 200))
  }
}
