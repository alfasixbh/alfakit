import { describe, expect, it } from 'vitest'
import {
  LocaleFormatter,
  Translator,
  collapsesLanguageSwitcher,
  currencyDecimals,
  formatPhpDate,
  interpolate,
  selectPlural,
  showsLanguageSwitcher,
  toAsciiDigits,
} from '../src'

describe('Translator', () => {
  const translator = new Translator(
    {
      save: 'Save',
      greeting: 'Hello :name, :Name, :NAME',
      items: '{0} No items|{1} One item|[2,*] :count items',
      files: 'one file|:count files',
      ar: 'لا ملفات|ملف واحد|ملفان|:count ملفات|:count ملفًا|:count ملف',
      nested: { title: 'Nested' },
    },
    'en',
  )

  it('translates with Laravel-style placeholders', () => {
    expect(translator.t('save')).toBe('Save')
    expect(translator.t('nested.title')).toBe('Nested')
    expect(translator.t('missing', {}, 'Fallback')).toBe('Fallback')
    expect(translator.t('greeting', { name: 'ada' })).toBe('Hello ada, Ada, ADA')
    expect(translator.has('save')).toBe(true)
    expect(translator.has('nested')).toBe(false)
  })

  it('supports explicit plural ranges', () => {
    expect(translator.choice('items', 0)).toBe('No items')
    expect(translator.choice('items', 1)).toBe('One item')
    expect(translator.choice('items', 7)).toBe('7 items')
  })

  it('picks plural forms with CLDR rules for the locale', () => {
    expect(translator.choice('files', 1)).toBe('one file')
    expect(translator.choice('files', 3)).toBe('3 files')

    translator.setLocale('ar')
    expect([0, 1, 2, 5, 11, 100].map((count) => translator.choice('ar', count))).toEqual([
      'لا ملفات',
      'ملف واحد',
      'ملفان',
      '5 ملفات',
      '11 ملفًا',
      '100 ملف',
    ])
    translator.setLocale('en')
  })

  it('clamps to the last form when a language has fewer forms than categories', () => {
    expect(selectPlural('un fichier|:count fichiers', 1_000_000, new Intl.PluralRules('fr'))).toBe(
      ':count fichiers',
    )
    expect(selectPlural('only form', 5, new Intl.PluralRules('ja'))).toBe('only form')
  })
})

describe('interpolate', () => {
  it('prefers longer keys so prefixes do not clash', () => {
    expect(interpolate(':count of :countTotal', { count: 1, countTotal: 9 })).toBe('1 of 9')
  })
})

describe('LocaleFormatter', () => {
  it('formats money with the currency precision', () => {
    const en = new LocaleFormatter('en', 'BHD')

    expect(currencyDecimals('BHD')).toBe(3)
    expect(currencyDecimals('JPY')).toBe(0)
    expect(en.money(12345, 'BHD', { minorUnits: true })).toBe('BHD 12.345')
    expect(new LocaleFormatter('de').money(1234.5, 'EUR')).toBe('1.234,50 €')
  })

  it('knows where the currency symbol goes', () => {
    expect(new LocaleFormatter('en').currencyAffixes('USD')).toEqual({
      prefix: '$',
      suffix: '',
      symbol: '$',
    })
    expect(new LocaleFormatter('de').currencyAffixes('EUR')).toEqual({
      prefix: '',
      suffix: '€',
      symbol: '€',
    })
  })

  it('parses numbers typed in the user locale', () => {
    const de = new LocaleFormatter('de')
    const en = new LocaleFormatter('en')
    const ar = new LocaleFormatter('ar')
    const fr = new LocaleFormatter('fr')

    expect(de.parseNumber('1.234,5')).toBe(1234.5)
    expect(de.parseNumber('12.5')).toBe(12.5)
    expect(de.parseNumber('1.234')).toBe(1234)
    expect(en.parseNumber('1,234.56')).toBe(1234.56)
    expect(fr.parseNumber('1 234,5')).toBe(1234.5)
    expect(ar.parseNumber('١٬٢٣٤٫٥')).toBe(1234.5)
    expect(ar.parseNumber('12.5')).toBe(12.5)
    expect(en.parseNumber('-0.75')).toBe(-0.75)
    expect(en.parseNumber('')).toBeNull()
    expect(en.parseNumber('abc')).toBeNull()
    expect(de.parseNumber('1,2,3')).toBeNull()
  })

  it('formats relative times and lists in the locale', () => {
    const now = new Date('2026-01-10T12:00:00Z')

    expect(new LocaleFormatter('en').relative(new Date('2026-01-07T12:00:00Z'), now)).toBe(
      '3 days ago',
    )
    expect(new LocaleFormatter('en').list(['a', 'b', 'c'])).toBe('a, b, and c')
  })
})

describe('helpers', () => {
  it('converts Unicode digits to ASCII', () => {
    expect(toAsciiDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789')
    expect(toAsciiDigits('۱۲۳')).toBe('123')
    expect(toAsciiDigits('१२३')).toBe('123')
    expect(toAsciiDigits('abc ١')).toBe('abc 1')
  })

  it('renders PHP date formats with localised names', () => {
    const date = new Date(2026, 0, 5, 14, 7, 9)

    expect(formatPhpDate(date, 'D, M j, Y g:i A', 'en')).toBe('Mon, Jan 5, 2026 2:07 PM')
    expect(formatPhpDate(date, 'l jS \\o\\f F', 'en')).toBe('Monday 5th of January')
    expect(formatPhpDate(date, 'd F Y H:i:s', 'fr')).toBe('05 janvier 2026 14:07:09')
    expect(formatPhpDate(date, 'j F Y', 'ar')).toBe('5 يناير 2026')
  })
})

describe('showsLanguageSwitcher', () => {
  const locales = [
    { code: 'en', tag: 'en', label: 'English', direction: 'ltr' as const },
    { code: 'ar', tag: 'ar', label: 'العربية', direction: 'rtl' as const },
  ]

  it('defaults to the user menu and always shows on auth pages', () => {
    const localization = { switcher: true, locales }

    expect(showsLanguageSwitcher(localization, 'user-menu')).toBe(true)
    expect(showsLanguageSwitcher(localization, 'topbar')).toBe(false)
    expect(showsLanguageSwitcher(localization, 'auth')).toBe(true)
  })

  it('follows the configured position', () => {
    const at = (switcherPosition: 'user-menu' | 'topbar' | 'both' | 'hidden') => ({
      topbar: showsLanguageSwitcher({ switcher: true, switcherPosition, locales }, 'topbar'),
      menu: showsLanguageSwitcher({ switcher: true, switcherPosition, locales }, 'user-menu'),
      auth: showsLanguageSwitcher({ switcher: true, switcherPosition, locales }, 'auth'),
    })

    expect(at('topbar')).toEqual({ topbar: true, menu: false, auth: true })
    expect(at('both')).toEqual({ topbar: true, menu: true, auth: true })
    expect(at('hidden')).toEqual({ topbar: false, menu: false, auth: true })
  })

  it('hides without a switcher or a second language', () => {
    expect(
      showsLanguageSwitcher({ switcher: false, switcherPosition: 'both', locales }, 'topbar'),
    ).toBe(false)
    expect(
      showsLanguageSwitcher(
        { switcher: true, switcherPosition: 'both', locales: [locales[0]!] },
        'auth',
      ),
    ).toBe(false)
    expect(showsLanguageSwitcher(undefined, 'auth')).toBe(false)
  })
})

describe('collapsesLanguageSwitcher', () => {
  const locales = [
    { code: 'en', tag: 'en', label: 'English', direction: 'ltr' as const },
    { code: 'ar', tag: 'ar', label: 'العربية', direction: 'rtl' as const },
  ]
  const at = (switcherPosition: 'user-menu' | 'topbar' | 'both' | 'hidden', menu = true) =>
    collapsesLanguageSwitcher({ switcher: true, switcherPosition, locales }, menu)

  it('moves the top bar button into the user menu on phones', () => {
    expect(at('topbar')).toBe(true)
    expect(at('both')).toBe(true)
    expect(at('user-menu')).toBe(false)
    expect(at('hidden')).toBe(false)
  })

  it('keeps the top bar button without a user menu or a second language', () => {
    expect(at('topbar', false)).toBe(false)
    expect(
      collapsesLanguageSwitcher(
        { switcher: true, switcherPosition: 'topbar', locales: [locales[0]!] },
        true,
      ),
    ).toBe(false)
  })
})
