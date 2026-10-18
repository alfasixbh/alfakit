/**
 * Props requested by the standalone components on the current page, in place of the panel
 * `page` prop. `null` means a component could not find its prop, so reloads must be full.
 * Browser only: nothing registers during a server render.
 */
const standaloneProps = new Map<symbol, string | null>()

/** Registered by a mounted `<AlfakitComponent>`; returns a function that unregisters it. */
export function registerStandaloneProp(name: string | null): () => void {
  const id = Symbol('standalone')
  standaloneProps.set(id, name)

  return () => {
    standaloneProps.delete(id)
  }
}

/**
 * The `only` list of a partial reload. Renderer components ask for `page` (the panel page
 * prop); outside panels that prop does not exist, so the standalone components' own props
 * are requested instead (or everything, when one of them could not be located).
 */
export function resolvePartialProps(only: string[] | undefined): string[] | undefined {
  if (!only || only.length === 0 || standaloneProps.size === 0 || !only.includes('page')) {
    return only
  }

  const names = new Set<string>()

  for (const name of standaloneProps.values()) {
    if (name === null) return undefined

    names.add(name)
  }

  return [...only.filter((prop) => prop !== 'page'), ...names]
}
