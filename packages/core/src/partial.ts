import type { SchemaComponent } from './schema/components'
import type { SchemaPatch, SchemaRefreshResponse } from './schema/form'
import { isPartialFormPayload } from './schema/form'

/**
 * Replace the components at the patches' index paths (`0.2` = `components[0].schema[2]`),
 * copying only the arrays and objects along each path. Every other component keeps its
 * identity, so renderers can skip re-rendering it. Returns null when a path doesn't
 * match the tree (the browser's tree is out of sync with its fingerprints) or the
 * replacement has a different key or type: the caller then asks for the full payload.
 */
export function applySchemaPatches(
  components: SchemaComponent[],
  patches: SchemaPatch[],
): SchemaComponent[] | null {
  let result = components

  for (const patch of patches) {
    const indexes = patch.path.split('.').map((segment) => Number(segment))

    if (indexes.length === 0 || indexes.some((index) => !Number.isInteger(index) || index < 0)) {
      return null
    }

    const next = replaceAt(result, indexes, patch.component)

    if (!next) {
      return null
    }

    result = next
  }

  return result
}

function replaceAt(
  components: SchemaComponent[],
  [index, ...rest]: number[],
  replacement: SchemaComponent,
): SchemaComponent[] | null {
  const current = index === undefined ? undefined : components[index]

  if (!current || index === undefined) {
    return null
  }

  let updated: SchemaComponent

  if (rest.length === 0) {
    if (current.key !== replacement.key || current.type !== replacement.type) {
      return null
    }

    updated = replacement
  } else {
    const children = current.schema ? replaceAt(current.schema, rest, replacement) : null

    if (!children) {
      return null
    }

    updated = { ...current, schema: children } as SchemaComponent
  }

  const copy = [...components]
  copy[index] = updated

  return copy
}

/**
 * The server's state after a refresh: the full state, or (for `partialState` responses)
 * the state that was sent with the changed top-level keys replaced and removed ones
 * dropped.
 */
export function mergeStatePatch(
  sent: Record<string, unknown>,
  response: SchemaRefreshResponse,
): Record<string, unknown> {
  const state = normaliseState(response.state)

  if (!isPartialFormPayload(response) || !response.partialState) {
    return state
  }

  const merged: Record<string, unknown> = { ...sent, ...state }

  for (const key of response.removedState ?? []) {
    delete merged[key]
  }

  return merged
}

export interface MergedRefresh {
  components: SchemaComponent[]
  /** The server's state (before edits made while the request was in flight). */
  values: Record<string, unknown>
  columns: SchemaRefreshResponse['columns']
  fingerprints: Record<string, string> | undefined
}

/**
 * Merge a refresh (or field action) response into the tree and state the browser holds.
 * Null when a partial response can't be applied; the caller falls back to a full refresh.
 */
export function mergeRefreshResponse(
  components: SchemaComponent[],
  sent: Record<string, unknown>,
  response: SchemaRefreshResponse,
): MergedRefresh | null {
  if (isPartialFormPayload(response)) {
    const patched = applySchemaPatches(components, response.patches)

    if (!patched) {
      return null
    }

    return {
      components: patched,
      values: mergeStatePatch(sent, response),
      columns: response.columns,
      fingerprints: response.fingerprints,
    }
  }

  return {
    components: response.components,
    values: normaliseState(response.state),
    columns: response.columns,
    fingerprints: response.fingerprints,
  }
}

/** PHP encodes an empty state as `[]`. */
function normaliseState(state: unknown): Record<string, unknown> {
  return state && typeof state === 'object' && !Array.isArray(state)
    ? (state as Record<string, unknown>)
    : {}
}
