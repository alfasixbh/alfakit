import type { BaseField, FieldAriaAttributes, FormState, FormStore } from '@alfakit/core'
import { fieldAria, fieldDomId, fieldError } from '@alfakit/core'
import {
  computed,
  inject,
  provide,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue'
import { useStore } from '../../composables/use-store'

export const FORM_STORE_KEY: InjectionKey<FormStore> = Symbol('alfakit.form')

export function provideForm(store: FormStore): void {
  provide(FORM_STORE_KEY, store)
}

export function useFormStore(): FormStore {
  const store = inject(FORM_STORE_KEY, null)

  if (!store) {
    throw new Error('Form fields must be rendered inside provideForm().')
  }

  return store
}

export function useOptionalFormStore(): FormStore | null {
  return inject(FORM_STORE_KEY, null)
}

export function useFormState(): ShallowRef<FormState> {
  return useStore(useFormStore().store)
}

export interface FieldBinding<T = unknown> {
  value: ComputedRef<T>
  setValue: (value: T) => void
  blur: () => void
  error: ComputedRef<string | undefined>
  id: string
  /** The field cannot be interacted with at all (`disabled()`). */
  disabled: ComputedRef<boolean>
  /** The field shows its value but the user cannot change it (`readOnly()`). */
  readOnly: ComputedRef<boolean>
  /** `aria-describedby` (hint, helper text, error), `aria-invalid` and `aria-required` for the control. */
  aria: ComputedRef<FieldAriaAttributes>
}

/** Bind a field schema to the form store. */
export function useField<T = unknown>(field: MaybeRefOrGetter<BaseField>): FieldBinding<T> {
  const store = useFormStore()
  const state = useStore(store.store)
  const path = toValue(field).statePath

  const value = computed(() => {
    let current: unknown = state.value.values

    for (const segment of path.split('.')) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined as T
      }

      current = (current as Record<string, unknown>)[segment]
    }

    return current as T
  })

  const error = computed(() => fieldError(state.value.errors, path))
  // Fields stay enabled during a live refresh: the store keeps edits made while the request
  // is in flight, so locking inputs would only swallow keystrokes.
  const disabled = computed(() => Boolean(toValue(field).disabled))
  const readOnly = computed(() => Boolean(toValue(field).readOnly))
  const id = toValue(field).id ?? fieldDomId(store.idPrefix, path)
  const aria = computed(() => fieldAria(id, toValue(field), error.value))

  return {
    value,
    setValue: (next: T) => store.setValue(path, next),
    blur: () => store.blur(path),
    error,
    id,
    disabled,
    readOnly,
    aria,
  }
}
