import type { BaseField, FieldAriaAttributes, FormState, FormStore } from '@alfakit/core'
import { fieldAria, fieldDomId, fieldError, getPath } from '@alfakit/core'
import { getContext, hasContext, setContext } from 'svelte'
import { useStore, type StoreBinding } from '../../hooks/store.svelte'

const FORM_CONTEXT = Symbol.for('alfakit.form')

/** Provide a form store to descendant fields (call during component initialisation). */
export function provideForm(store: FormStore): FormStore {
  setContext(FORM_CONTEXT, store)

  return store
}

export function useFormStore(): FormStore {
  const store = useOptionalFormStore()

  if (!store) {
    throw new Error('Form fields must be rendered inside a form (provideForm / <FormProvider>).')
  }

  return store
}

export function useOptionalFormStore(): FormStore | null {
  return hasContext(FORM_CONTEXT) ? getContext<FormStore>(FORM_CONTEXT) : null
}

export function useFormState(): StoreBinding<FormState> {
  return useStore(useFormStore().store)
}

export interface FieldBinding<T = unknown> {
  readonly value: T
  setValue: (value: T) => void
  blur: () => void
  readonly error: string | undefined
  readonly id: string
  /** The field cannot be interacted with at all (`disabled()`). */
  readonly disabled: boolean
  /** The field shows its value but the user cannot change it (`readOnly()`). */
  readonly readOnly: boolean
  /** `aria-describedby` (hint, helper text, error), `aria-invalid` and `aria-required` for the control. */
  readonly aria: FieldAriaAttributes
}

/**
 * Bind a field schema to the form store. Pass a getter (`() => component`) so the binding
 * follows prop updates after a server refresh.
 */
export function useField<T = unknown>(field: BaseField | (() => BaseField)): FieldBinding<T> {
  const store = useFormStore()
  const state = useStore(store.store)

  const schema = $derived(typeof field === 'function' ? field() : field)
  const path = $derived(schema.statePath)
  const value = $derived(getPath<T>(state.current.values, path))
  const error = $derived(fieldError(state.current.errors, path))
  const id = $derived(schema.id ?? fieldDomId(store.idPrefix, path))
  // Fields stay enabled during a live refresh: the store keeps edits made while the request
  // is in flight, so locking inputs would only swallow keystrokes.
  const disabled = $derived(Boolean(schema.disabled))
  const readOnly = $derived(Boolean(schema.readOnly))
  const aria = $derived(fieldAria(id, schema, error))

  return {
    get value() {
      return value
    },
    setValue: (next: T) => store.setValue(path, next),
    blur: () => store.blur(path),
    get error() {
      return error
    },
    get id() {
      return id
    },
    get disabled() {
      return disabled
    },
    get readOnly() {
      return readOnly
    },
    get aria() {
      return aria
    },
  }
}
