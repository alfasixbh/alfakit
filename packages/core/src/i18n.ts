import { router } from '@inertiajs/core'
import { lazyComponentCache } from './lazy'
import type { LocalizationSchema } from './schema/panel'
import { interpolate } from './utils/format'
import { getPath } from './utils/path'

/** CLDR plural categories in the order Laravel language files list their forms. */
const PLURAL_ORDER: Intl.LDMLPluralRule[] = ['zero', 'one', 'two', 'few', 'many', 'other']

type Replacements = Record<string, string | number>

/**
 * Translator over the `translations` prop (Laravel's `alfakit::ui` group plus any groups
 * the panel adds with `frontendTranslations()`).
 */
export class Translator {
  private pluralRules: Intl.PluralRules | null = null

  constructor(
    private translations: Record<string, unknown> = {},
    private locale = 'en',
  ) {}

  setTranslations(translations: Record<string, unknown>): void {
    this.translations = translations
  }

  /** BCP 47 tag used for plural rules. */
  setLocale(locale: string): void {
    if (locale !== this.locale) {
      this.locale = locale
      this.pluralRules = null
    }
  }

  getLocale(): string {
    return this.locale
  }

  has(key: string): boolean {
    return typeof getPath<unknown>(this.translations, key) === 'string'
  }

  /** `t('table.showing', { first: 1, last: 10, total: 42 })` */
  t(key: string, replacements: Replacements = {}, fallback?: string): string {
    const value = getPath<unknown>(this.translations, key)
    const template = typeof value === 'string' ? value : (fallback ?? key)

    return interpolate(template, replacements)
  }

  /**
   * Pluralised line, compatible with Laravel's `trans_choice()` syntax:
   * `'{0} No items|{1} One item|[2,*] :count items'` or `'one item|:count items'`.
   * Forms without explicit ranges follow CLDR plural rules for the current locale, in the
   * order zero, one, two, few, many, other (as Laravel language files list them).
   */
  choice(key: string, count: number, replacements: Replacements = {}, fallback?: string): string {
    const value = getPath<unknown>(this.translations, key)
    const line = typeof value === 'string' ? value : (fallback ?? key)

    return interpolate(selectPlural(line, count, this.rules()), { count, ...replacements })
  }

  private rules(): Intl.PluralRules {
    this.pluralRules ??= new Intl.PluralRules(this.locale)

    return this.pluralRules
  }
}

/** Pick the plural form of a Laravel `trans_choice` line for `count`. */
export function selectPlural(line: string, count: number, rules: Intl.PluralRules): string {
  const segments = line.split('|')

  for (const segment of segments) {
    const explicit = matchExplicit(segment, count)

    if (explicit !== null) {
      return explicit
    }
  }

  const forms = segments.map((segment) => segment.replace(/^\s*[{[][^\]}]*[}\]]\s*/, ''))

  if (forms.length === 1) {
    return forms[0] ?? ''
  }

  const categories = PLURAL_ORDER.filter((category) =>
    rules.resolvedOptions().pluralCategories.includes(category),
  )
  const index = Math.max(0, categories.indexOf(rules.select(count)))

  return forms[Math.min(index, forms.length - 1)] ?? ''
}

function matchExplicit(segment: string, count: number): string | null {
  const match = /^\s*([{[])([^\]}]*)([}\]])\s*([\s\S]*)$/.exec(segment)

  if (!match) {
    return null
  }

  const [, open, condition = '', , text = ''] = match

  if (open === '{') {
    return condition
      .split(',')
      .map((part) => Number(part.trim()))
      .includes(count)
      ? text
      : null
  }

  const [from = '*', to = '*'] = condition.split(',').map((part) => part.trim())
  const above = from === '*' || count >= Number(from)
  const below = to === '*' || count <= Number(to)

  return above && below ? text : null
}

export const translator = new Translator()

export const t = translator.t.bind(translator)

// ---------------------------------------------------------------------------- Formatting

export interface MoneyOptions extends Intl.NumberFormatOptions {
  /** The amount is an integer of the smallest unit (cents, fils, yen). */
  minorUnits?: boolean
}

/**
 * Locale-aware formatting for values rendered in the browser (custom components,
 * charts, inputs). Server-rendered columns and entries are already formatted in PHP.
 */
export class LocaleFormatter {
  constructor(
    readonly locale = 'en',
    readonly currencyCode = 'USD',
    readonly timeZone?: string,
  ) {}

  static fromSchema(localization: LocalizationSchema | undefined): LocaleFormatter {
    return new LocaleFormatter(
      localization?.tag ?? 'en',
      localization?.currency ?? 'USD',
      localization?.timezone,
    )
  }

  number(value: number, options: Intl.NumberFormatOptions = {}): string {
    return new Intl.NumberFormat(this.locale, options).format(value)
  }

  percent(value: number, maximumFractionDigits = 0): string {
    return this.number(value, { style: 'percent', maximumFractionDigits })
  }

  money(amount: number, currency = this.currencyCode, options: MoneyOptions = {}): string {
    const { minorUnits, ...format } = options
    const value = minorUnits ? amount / 10 ** currencyDecimals(currency) : amount

    return new Intl.NumberFormat(this.locale, { style: 'currency', currency, ...format }).format(
      value,
    )
  }

  /** Unparseable input is returned unchanged. */
  date(
    value: Date | string | number,
    options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  ): string {
    const date = toDate(value)

    if (Number.isNaN(date.getTime())) return String(value)

    return new Intl.DateTimeFormat(this.locale, { timeZone: this.timeZone, ...options }).format(
      date,
    )
  }

  dateTime(value: Date | string | number): string {
    return this.date(value, { dateStyle: 'medium', timeStyle: 'short' })
  }

  /** "3 days ago", "in 2 hours", in the user's language. */
  relative(value: Date | string | number, now: Date = new Date()): string {
    const time = toDate(value).getTime()

    if (Number.isNaN(time)) return String(value)

    const seconds = Math.round((time - now.getTime()) / 1000)
    const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
      ['year', 31_536_000],
      ['month', 2_592_000],
      ['week', 604_800],
      ['day', 86_400],
      ['hour', 3_600],
      ['minute', 60],
    ]
    const formatter = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' })

    for (const [unit, size] of units) {
      if (Math.abs(seconds) >= size) {
        return formatter.format(Math.round(seconds / size), unit)
      }
    }

    return formatter.format(seconds, 'second')
  }

  list(items: string[], type: Intl.ListFormatType = 'conjunction'): string {
    return new Intl.ListFormat(this.locale, { type }).format(items)
  }

  /** Where the locale writes the currency symbol for `currency`. */
  currencyAffixes(currency = this.currencyCode): {
    prefix: string
    suffix: string
    symbol: string
  } {
    const parts = new Intl.NumberFormat(this.locale, { style: 'currency', currency }).formatToParts(
      1,
    )
    const symbolIndex = parts.findIndex((part) => part.type === 'currency')
    const numberIndex = parts.findIndex((part) => part.type === 'integer')
    const symbol = parts[symbolIndex]?.value ?? currency

    return symbolIndex < numberIndex
      ? { prefix: symbol, suffix: '', symbol }
      : { prefix: '', suffix: symbol, symbol }
  }

  /** The locale's decimal and grouping separators. */
  separators(): { decimal: string; group: string } {
    const parts = new Intl.NumberFormat(this.locale).formatToParts(12345.6)

    return {
      decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
      group: parts.find((part) => part.type === 'group')?.value ?? ',',
    }
  }

  /**
   * Parse what a user typed in their locale ("1.234,5" in German, "١٬٢٣٤٫٥" in Arabic,
   * "1 234,5" in French) into a number. A lone dot followed by other than three digits is
   * read as a decimal point even where the locale uses a comma, since that is what people
   * mean when they type "12.5". Returns null for empty or invalid input.
   */
  parseNumber(input: string): number | null {
    const { decimal } = this.separators()
    let value = toAsciiDigits(input)
      .replace(/[\s\u00a0\u202f'’]/g, '')
      .replace(/٫/g, decimal)
      .replace(/[٬،]/g, decimal === ',' ? '.' : ',')

    // Locales with their own separator (Arabic "٫"): ASCII "." is the decimal point.
    if (decimal !== '.' && decimal !== ',') {
      value = value.replace(/,/g, '').replace('.', decimal)
    }

    if (decimal === ',' && !value.includes(decimal) && /^-?\d*\.\d*$/.test(value)) {
      const fraction = value.split('.')[1] ?? ''

      if (fraction.length !== 3) {
        value = value.replace('.', decimal)
      }
    }

    const [integer = '', fraction, ...rest] = value.split(decimal)

    if (rest.length > 0) {
      return null
    }

    const normalised = integer.replace(/[.,]/g, '') + (fraction === undefined ? '' : `.${fraction}`)

    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(normalised)) {
      return null
    }

    const number = Number(normalised)

    return Number.isFinite(number) ? number : null
  }
}

/** Minor-unit digits of an ISO 4217 currency (USD 2, BHD 3, JPY 0). */
export function currencyDecimals(currency: string): number {
  try {
    return (
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    )
  } catch {
    return 2
  }
}

/** Code points of "0" in Unicode decimal digit blocks (Arabic-Indic, Persian, Devanagari, …). */
const DIGIT_ZEROS = [
  0x660, 0x6f0, 0x7c0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xde6, 0xe50,
  0xed0, 0xf20, 0x1040, 0x1090, 0x17e0, 0x1810, 0x1946, 0x19d0, 0x1a80, 0x1a90, 0x1b50, 0x1bb0,
  0x1c40, 0x1c50, 0xa620, 0xa8d0, 0xa900, 0xa9d0, 0xa9f0, 0xaa50, 0xabf0, 0xff10,
]

/** Convert Arabic-Indic, Persian and other Unicode decimal digits to 0-9. */
export function toAsciiDigits(input: string): string {
  return input.replace(/\P{ASCII}/gu, (character) => {
    const code = character.codePointAt(0) ?? 0
    const zero = DIGIT_ZEROS.find((start) => code >= start && code <= start + 9)

    return zero === undefined ? character : String(code - zero)
  })
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value)
}

/**
 * Render a date with a PHP `date()` format string, using the locale's month and weekday
 * names. Numeric tokens keep ASCII digits, like Carbon's `translatedFormat()`.
 */
export function formatPhpDate(date: Date, format: string, locale = 'en'): string {
  const name = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, options).format(date)
  const pad = (value: number) => String(value).padStart(2, '0')
  const hours = date.getHours()
  const dayPeriod = () =>
    new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true })
      .formatToParts(date)
      .find((part) => part.type === 'dayPeriod')?.value ?? (hours < 12 ? 'AM' : 'PM')

  const tokens: Record<string, () => string> = {
    d: () => pad(date.getDate()),
    j: () => String(date.getDate()),
    D: () => name({ weekday: 'short' }),
    l: () => name({ weekday: 'long' }),
    N: () => String(date.getDay() === 0 ? 7 : date.getDay()),
    w: () => String(date.getDay()),
    S: () => (locale.startsWith('en') ? ordinalSuffix(date.getDate()) : ''),
    F: () => name({ month: 'long' }),
    M: () => name({ month: 'short' }),
    m: () => pad(date.getMonth() + 1),
    n: () => String(date.getMonth() + 1),
    Y: () => String(date.getFullYear()),
    y: () => String(date.getFullYear()).slice(-2),
    a: () => dayPeriod().toLowerCase(),
    A: () => dayPeriod(),
    g: () => String(hours % 12 || 12),
    G: () => String(hours),
    h: () => pad(hours % 12 || 12),
    H: () => pad(hours),
    i: () => pad(date.getMinutes()),
    s: () => pad(date.getSeconds()),
  }

  let output = ''

  for (let index = 0; index < format.length; index++) {
    const character = format[index] ?? ''

    if (character === '\\') {
      output += format[++index] ?? ''
    } else {
      output += tokens[character]?.() ?? character
    }
  }

  return output
}

function ordinalSuffix(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th'

  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th'
}

// ---------------------------------------------------------------------------- Document

/** Keep `<html lang dir>` in sync after Inertia navigations (e.g. a language switch). */
export function applyDocumentLocale(
  localization: Pick<LocalizationSchema, 'tag' | 'direction'> | undefined,
): void {
  if (typeof document === 'undefined' || !localization) {
    return
  }

  const root = document.documentElement

  if (root.lang !== localization.tag) root.lang = localization.tag
  if (root.dir !== localization.direction) root.dir = localization.direction
}

/**
 * Whether a language menu belongs in `place`: the panel has a switcher with two or more
 * languages and `languageSwitcher()` puts it there. Auth pages always show it.
 */
export function showsLanguageSwitcher(
  localization:
    Pick<LocalizationSchema, 'switcher' | 'switcherPosition' | 'locales'> | null | undefined,
  place: 'topbar' | 'user-menu' | 'auth',
): boolean {
  if (!localization?.switcher || (localization.locales?.length ?? 0) < 2) {
    return false
  }

  if (place === 'auth') {
    return true
  }

  const position = localization.switcherPosition ?? 'user-menu'

  return position === 'both' || position === place
}

/**
 * Whether the top bar's language button collapses into the user menu on phones (below
 * `sm`): with `languageSwitcher('topbar' | 'both')` and a user menu to hold it. The top bar
 * then hides its button below `sm`, and the user menu shows its "Language" entry there
 * (always, for `'both'`). Without a user menu (guests, `userMenu(false)`) it stays put.
 */
export function collapsesLanguageSwitcher(
  localization:
    Pick<LocalizationSchema, 'switcher' | 'switcherPosition' | 'locales'> | null | undefined,
  hasUserMenu: boolean,
): boolean {
  return hasUserMenu && showsLanguageSwitcher(localization, 'topbar')
}

/** Switch the panel language and reload the current page in it. */
export function switchLocale(endpoint: string, locale: string): void {
  // Lazy widgets cached in the old language would otherwise show until their deferred
  // schemas arrive in the new one.
  lazyComponentCache.clear()
  router.post(endpoint, { locale }, { preserveScroll: true, preserveState: false })
}

// ---------------------------------------------------------------------------- Bidi

/** A letter of a script written right to left (not its digits or separators). */
const RTL_LETTER =
  /(?=\p{L})(?:\p{Script=Arabic}|\p{Script=Hebrew}|\p{Script=Syriac}|\p{Script=Thaana}|\p{Script=Nko}|\p{Script=Adlam}|\p{Script=Samaritan}|\p{Script=Mandaic}|\p{Script=Hanifi_Rohingya}|\p{Script=Yezidi}|\p{Script=Mende_Kikakui})/u

/**
 * The `dir` for a `<bdi>` around a display value: `auto` (the value's first strong letter
 * decides) when it has right-to-left letters, else `ltr`. Numbers and money formatted for a
 * right-to-left locale start with an invisible right-to-left mark (`‏0.00 US$` in Arabic),
 * which `auto` reads as right to left and reorders into `$US 0.00`; without right-to-left
 * letters the value is laid out as written. Values with them (`٠٫٠٠٠ د.ب.‏`, Arabic
 * text) keep their own direction.
 */
export function isolationDirection(value: unknown): 'ltr' | 'auto' {
  return typeof value === 'string' && RTL_LETTER.test(value) ? 'auto' : 'ltr'
}
