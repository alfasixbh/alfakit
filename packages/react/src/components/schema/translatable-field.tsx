import type { BaseField } from '@alfakit/core'
import {
  initialTranslatableLocale,
  translatableLocaleField,
  translatableLocalesWithErrors,
} from '@alfakit/core'
import { createElement, useMemo, useState } from 'react'
import { useT, type AnyComponent } from '../../context'
import { useStoreSelector } from '../../hooks/use-store'
import { cn } from '../../lib/utils'
import { useFormStore } from '../form/form-context'

/**
 * A `->translatable()` field: a language switcher above the field's own renderer, bound
 * to `{statePath}.{locale}` for the selected language. Languages with a validation error
 * are marked, and the first of them opens after a failed submit.
 */
export function TranslatableField({
  component,
  render,
}: {
  component: BaseField
  render: AnyComponent
}) {
  const t = useT()
  const store = useFormStore()
  const locales = useMemo(() => component.translatable?.locales ?? [], [component.translatable])
  const invalidKey = useStoreSelector(store.store, (state) =>
    translatableLocalesWithErrors(component, state.errors).join(','),
  )
  const invalid = useMemo(() => (invalidKey === '' ? [] : invalidKey.split(',')), [invalidKey])
  const [current, setCurrent] = useState(() =>
    initialTranslatableLocale(component, store.store.get().errors),
  )

  // When the set of invalid languages changes (a failed submit), show one that needs
  // attention. Adjusted during render, as React recommends for state derived from props.
  const [seenInvalidKey, setSeenInvalidKey] = useState(invalidKey)

  if (invalidKey !== seenInvalidKey) {
    setSeenInvalidKey(invalidKey)

    if (invalid.length > 0 && !invalid.includes(current)) {
      setCurrent(invalid[0]!)
    }
  }

  // A `LocaleSwitcher` changes the language the fields open on; follow it when it changes.
  const editing = component.translatable?.defaultLocale ?? ''
  const [seenEditing, setSeenEditing] = useState(editing)

  if (editing !== seenEditing) {
    setSeenEditing(editing)

    if (editing !== '' && locales.some((option) => option.code === editing)) {
      setCurrent(editing)
    }
  }

  const locale = locales.find((candidate) => candidate.code === current) ?? locales[0]
  const field = useMemo(
    () => (locale ? translatableLocaleField(component, locale) : component),
    [component, locale],
  )

  if (!locale) {
    return null
  }

  return (
    <div data-slot="translatable-field" className="flex flex-col gap-1.5">
      <div
        role="group"
        aria-label={t('translatable.languages', { field: component.label ?? component.name })}
        data-slot="translatable-locales"
        className="flex flex-wrap justify-end gap-1"
      >
        {locales.map((option) => {
          const active = option.code === locale.code
          const hasError = invalid.includes(option.code)

          return (
            <button
              key={option.code}
              type="button"
              lang={option.tag}
              aria-pressed={active}
              data-active={active || undefined}
              data-invalid={hasError || undefined}
              onClick={() => setCurrent(option.code)}
              className={cn(
                'focus-visible:ring-ring/50 inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px]',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                hasError && !active && 'border-destructive text-destructive',
              )}
            >
              {option.label}
              {hasError && (
                <>
                  <span aria-hidden="true" className="bg-destructive size-1.5 rounded-full" />
                  <span className="sr-only">({t('translatable.has_errors')})</span>
                </>
              )}
            </button>
          )
        })}
      </div>
      {createElement(render, { key: locale.code, component: field })}
    </div>
  )
}
