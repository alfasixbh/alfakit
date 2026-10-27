import { describe, expect, it } from 'vitest'
import { LocaleFormatter, isolationDirection } from '../src/i18n'

describe('isolationDirection', () => {
  it('lays out Arabic-locale money without right-to-left letters as written', () => {
    // "‏0.00 US$": the leading right-to-left mark made `dir="auto"` show "$US 0.00".
    const usd = new LocaleFormatter('ar', 'USD').money(0)

    expect(usd.startsWith('‏')).toBe(true)
    expect(isolationDirection(usd)).toBe('ltr')
    expect(isolationDirection(new LocaleFormatter('ar-SA', 'USD').money(1234.5))).toBe('ltr')
    expect(isolationDirection(new LocaleFormatter('ar').percent(0.5))).toBe('ltr')
    expect(isolationDirection(12)).toBe('ltr')
    expect(isolationDirection(null)).toBe('ltr')
  })

  it('keeps values with right-to-left letters in their own direction', () => {
    expect(isolationDirection(new LocaleFormatter('ar', 'BHD').money(1))).toBe('auto')
    expect(isolationDirection('مرحبا')).toBe('auto')
    expect(isolationDirection('שלום')).toBe('auto')
    expect(isolationDirection('Order طلب')).toBe('auto')
    expect(isolationDirection('jane@example.com')).toBe('ltr')
  })
})
