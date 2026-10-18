import type { BaseField, TranslatableLocaleSchema } from './schema/components'

/**
 * The schema of one language's input of a translatable field: the same field bound to
 * `{statePath}.{code}`, required when that language is, and with `lang`/`dir` set so the
 * browser spell-checks and lays it out in that language.
 */
export function translatableLocaleField<T extends BaseField>(
  field: T,
  locale: TranslatableLocaleSchema,
): T {
  // A translatable MarkdownEditor renders its HTML per language.
  const html = (field as { html?: unknown }).html
  const perLocale =
    html !== null && typeof html === 'object'
      ? { html: (html as Record<string, string | null>)[locale.code] ?? null }
      : {}

  return {
    ...field,
    ...perLocale,
    translatable: undefined,
    key: `${field.key}.${locale.code}`,
    statePath: `${field.statePath}.${locale.code}`,
    id: field.id ? `${field.id}-${locale.code}` : undefined,
    required: Boolean(locale.required),
    extraInputAttributes: {
      ...field.extraInputAttributes,
      lang: locale.tag,
      dir: locale.direction,
    },
  }
}

/** Codes of the languages that have a validation error. */
export function translatableLocalesWithErrors(
  field: BaseField,
  errors: Record<string, unknown>,
): string[] {
  return (field.translatable?.locales ?? [])
    .filter((locale) => Boolean(errors[`${field.statePath}.${locale.code}`]))
    .map((locale) => locale.code)
}

/**
 * The language shown first: the first one with an error, else the default language (the
 * user's editing language from a `LocaleSwitcher`, when the field offers it).
 */
export function initialTranslatableLocale(
  field: BaseField,
  errors: Record<string, unknown> = {},
): string {
  const locales = field.translatable?.locales ?? []

  return (
    translatableLocalesWithErrors(field, errors)[0] ??
    (locales.some((locale) => locale.code === field.translatable?.defaultLocale)
      ? (field.translatable?.defaultLocale ?? '')
      : (locales[0]?.code ?? ''))
  )
}
