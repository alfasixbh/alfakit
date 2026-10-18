import { describe, expect, it } from 'vitest'
import type { TextInputSchema } from '../src'
import {
  initialTranslatableLocale,
  translatableLocaleField,
  translatableLocalesWithErrors,
} from '../src'

const field: TextInputSchema = {
  type: 'TextInput',
  key: 'title',
  name: 'title',
  statePath: 'title',
  inputType: 'text',
  extraInputAttributes: { class: 'font-medium' },
  translatable: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', tag: 'en', label: 'English', direction: 'ltr', required: true },
      { code: 'ar', tag: 'ar', label: 'العربية', direction: 'rtl', required: null },
    ],
  },
}

describe('translatable fields', () => {
  it('binds each language to its own state path', () => {
    const arabic = translatableLocaleField(field, field.translatable!.locales[1]!)

    expect(arabic).toMatchObject({
      key: 'title.ar',
      statePath: 'title.ar',
      required: false,
      translatable: undefined,
      extraInputAttributes: { class: 'font-medium', lang: 'ar', dir: 'rtl' },
    })
    expect(translatableLocaleField(field, field.translatable!.locales[0]!).required).toBe(true)
    expect(
      translatableLocaleField({ ...field, id: 'custom' }, field.translatable!.locales[1]!).id,
    ).toBe('custom-ar')
  })

  it('finds the languages with errors and opens the first of them', () => {
    expect(translatableLocalesWithErrors(field, { 'title.ar': ['Required'] })).toEqual(['ar'])
    expect(initialTranslatableLocale(field, { 'title.ar': ['Required'] })).toBe('ar')
    expect(initialTranslatableLocale(field)).toBe('en')
    expect(
      initialTranslatableLocale({
        ...field,
        translatable: { ...field.translatable!, defaultLocale: 'fr' },
      }),
    ).toBe('en')
  })
})
