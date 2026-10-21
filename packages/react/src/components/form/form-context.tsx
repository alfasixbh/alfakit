import type { BaseField, FieldAriaAttributes, FormState, FormStore } from '@alfakit/core'
import { fieldAria, fieldDomId, fieldError } from '@alfakit/core'
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useStore, useStoreSelector } from '../../hooks/use-store'

const FormStoreContext = createContext<FormStore | null>(null)

export function FormProvider({ store, children }: { store: FormStore; children: ReactNode }) {
  return <FormStoreContext.Provider value={store}>{children}</FormStoreContext.Provider>
}

export function useFormStore(): FormStore {
  const store = useContext(FormStoreContext)

  if (!store) {
    throw new Error('Form fields must be rendered inside a FormProvider.')
  }

  return store
}

export function useOptionalFormStore(): FormStore | null {
  return useContext(FormStoreContext)
}

export function useFormState(): FormState {
  return useStore(useFormStore().store)
}

export interface FieldBinding<T = unknown> {
  value: T
  setValue: (value: T) => void
  blur: () => void
  error: string | undefined
  id: string
  /** The field cannot be interacted with at all (`disabled()`). */
  disabled: boolean
  /** The field shows its value but the user cannot change it (`readOnly()`). */
  readOnly: boolean
  /** `aria-describedby` (hint, helper text, error), `aria-invalid` and `aria-required` for the control. */
  aria: FieldAriaAttributes
}

/** Bind a field schema (a built-in or custom field) to the form store. */
export function useField<T = unknown>(field: BaseField): FieldBinding<T> {
  const store = useFormStore()
  const path = field.statePath

  const value = useStoreSelector(store.store, (state) => {
    let current: unknown = state.values

    for (const segment of path.split('.')) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined as T
      }

      current = (current as Record<string, unknown>)[segment]
    }

    return current as T
  })

  const error = useStoreSelector(store.store, (state) => fieldError(state.errors, path))

  const setValue = useCallback((next: T) => store.setValue(path, next), [store, path])
  const blur = useCallback(() => store.blur(path), [store, path])

  const id = useMemo(() => field.id ?? fieldDomId(store.idPrefix, path), [field.id, store, path])

  const aria = useMemo(
    () =>
      fieldAria(
        id,
        { hint: field.hint, helperText: field.helperText, required: field.required },
        error,
      ),
    [id, field.hint, field.helperText, field.required, error],
  )

  // Fields stay enabled during a live refresh: the store keeps edits made while the request
  // is in flight, so locking inputs would only swallow keystrokes.
  return {
    value,
    setValue,
    blur,
    error,
    id,
    disabled: Boolean(field.disabled),
    readOnly: Boolean(field.readOnly),
    aria,
  }
}
