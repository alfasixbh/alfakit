import type { ToolbarCommand } from './rich-editor-toolbar'

/**
 * The browser half of rich content plugins (`RichEditor::plugins()`): Tiptap extensions
 * registered by key and loaded the first time an editor needs them.
 *
 * ```ts
 * createAlfakit({
 *   richEditorExtensions: {
 *     // Default export: a Tiptap extension, an array of them, or { extensions, commands }.
 *     'highlight-color': () => import('./editor/highlight-color'),
 *   },
 * })
 * ```
 *
 * A module may also export `commands`: toolbar commands by button name
 * (`{ label, key, run(editor), active?(editor) }`), used for the plugin tools of the same
 * name or placed in `toolbarButtons()` directly.
 *
 * Import Tiptap from the same packages the renderer uses (`@tiptap/core`, `@tiptap/pm`) so
 * there is one ProseMirror instance.
 */

/** What a loader resolves to: an extension, a list, a module, or `{ extensions, commands }`. */
export type RichEditorExtensionLoader = () => unknown

export interface LoadedRichEditorExtensions {
  /** Tiptap extensions (`Extension`, `Mark` or `Node` instances). */
  extensions: unknown[]
  /** Toolbar commands by button name. */
  commands: Record<string, ToolbarCommand>
}

const loaders = new Map<string, RichEditorExtensionLoader>()
const loaded = new Map<string, Promise<LoadedRichEditorExtensions>>()

/** Register plugin extensions by key (what `getTipTapJsExtensions()` returns). */
export function registerRichEditorExtensions(
  extensions: Record<string, RichEditorExtensionLoader>,
): void {
  for (const [key, loader] of Object.entries(extensions)) {
    loaders.set(key, loader)
    loaded.delete(key)
  }
}

/** Forget every registration (tests). */
export function clearRichEditorExtensions(): void {
  loaders.clear()
  loaded.clear()
}

export function hasRichEditorExtension(key: string): boolean {
  return loaders.has(key)
}

function isCommand(value: unknown): value is ToolbarCommand {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ToolbarCommand).run === 'function' &&
    typeof (value as ToolbarCommand).label === 'string'
  )
}

/** Normalise what a loader returned. */
export function normalizeRichEditorExtensions(module: unknown): LoadedRichEditorExtensions {
  let value = module

  if (value && typeof value === 'object' && 'default' in value) {
    const named = value as Record<string, unknown>
    // `export default extension` plus maybe `export const commands = {...}`.
    const normalized = normalizeRichEditorExtensions(named.default)

    if (named.commands && typeof named.commands === 'object') {
      for (const [name, command] of Object.entries(named.commands as Record<string, unknown>)) {
        if (isCommand(command)) normalized.commands[name] = command
      }
    }

    return normalized
  }

  if (value === null || value === undefined) return { extensions: [], commands: {} }

  if (Array.isArray(value)) return { extensions: value.filter(Boolean), commands: {} }

  if (typeof value === 'object' && ('extensions' in value || 'commands' in value)) {
    const definition = value as { extensions?: unknown; commands?: unknown }
    const extensions = Array.isArray(definition.extensions)
      ? definition.extensions.filter(Boolean)
      : definition.extensions
        ? [definition.extensions]
        : []
    const commands: Record<string, ToolbarCommand> = {}

    for (const [name, command] of Object.entries(
      (definition.commands ?? {}) as Record<string, unknown>,
    )) {
      if (isCommand(command)) commands[name] = command
    }

    return { extensions, commands }
  }

  value = module

  return { extensions: [value], commands: {} }
}

/**
 * Load the extensions registered under `keys` (each once). Unknown keys are skipped with a
 * console warning, and a loader that fails only loses its own extension.
 */
export async function loadRichEditorExtensions(
  keys: string[] | null | undefined,
): Promise<LoadedRichEditorExtensions> {
  const results = await Promise.all(
    [...new Set(keys ?? [])].map((key) => {
      let pending = loaded.get(key)

      if (!pending) {
        const loader = loaders.get(key)

        if (!loader) {
          console.warn(
            `Alfakit: rich editor extension "${key}" is not registered. Pass it to createAlfakit({ richEditorExtensions }).`,
          )

          return Promise.resolve<LoadedRichEditorExtensions>({ extensions: [], commands: {} })
        }

        pending = Promise.resolve()
          .then(() => loader())
          .then(normalizeRichEditorExtensions)
          .catch((error: unknown) => {
            console.error(`Alfakit: rich editor extension "${key}" failed to load.`, error)
            loaded.delete(key)

            return { extensions: [], commands: {} }
          })
        loaded.set(key, pending)
      }

      return pending
    }),
  )

  return results.reduce<LoadedRichEditorExtensions>(
    (all, result) => ({
      extensions: [...all.extensions, ...result.extensions],
      commands: { ...all.commands, ...result.commands },
    }),
    { extensions: [], commands: {} },
  )
}
