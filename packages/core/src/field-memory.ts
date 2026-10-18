import { createStore, type Store } from './store'

const memories = new WeakMap<object, Map<string, Store<unknown>>>()

/**
 * Per-field state that outlives the field's component: a store keyed by the owning form
 * store and the field's state path. Virtualised Repeater items unmount when scrolled out
 * of view, so a FileUpload keeps the files it uploaded in this session (names, sizes,
 * local previews) here and finds them again when it mounts back.
 */
export function fieldMemory<T>(owner: object, path: string, initial: () => T): Store<T> {
  let stores = memories.get(owner)

  if (!stores) {
    stores = new Map()
    memories.set(owner, stores)
  }

  let store = stores.get(path)

  if (!store) {
    store = createStore<unknown>(initial())
    stores.set(path, store)
  }

  return store as Store<T>
}

/** Drop the remembered state of a field (or of every field when `path` is omitted). */
export function forgetFieldMemory(owner: object, path?: string): void {
  if (path === undefined) {
    memories.delete(owner)

    return
  }

  memories.get(owner)?.delete(path)
}
