import { buildQuery } from '../src/http'
import { Translator } from '../src/i18n'
import { columnSpanClasses, columnStartClasses, gridColumnsClasses } from '../src/utils/breakpoints'
import { wallClockNow } from '../src/utils/datetime'
import { formatBytes, initials, interpolate, parseInterval } from '../src/utils/format'
import { imageGeometry, parseAspectRatio } from '../src/utils/image'
import { formatKeyBinding, matchesKeyBinding, parseKeyBinding } from '../src/utils/keybindings'
import { applyMask } from '../src/utils/mask'

describe('format utils', () => {
  it('formats bytes, intervals, initials and placeholders', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(parseInterval('30s')).toBe(30_000)
    expect(parseInterval('2m')).toBe(120_000)
    expect(parseInterval(null)).toBeNull()
    expect(initials('Ada Lovelace King')).toBe('AL')
    expect(interpolate('Showing :first to :last', { first: 1, last: 10 })).toBe('Showing 1 to 10')
  })
})

describe('breakpoint classes', () => {
  it('spells out tailwind classes', () => {
    expect(gridColumnsClasses({ default: 1, lg: 3 })).toBe('grid-cols-1 lg:grid-cols-3')
    expect(columnSpanClasses({ default: 'full' })).toBe('col-span-full')
    expect(columnSpanClasses({ md: 2 })).toBe('md:col-span-2')
    expect(columnStartClasses({ default: 1, lg: '3' })).toBe('col-start-1 lg:col-start-3')
    expect(columnStartClasses(undefined)).toBe('')
  })
})

describe('keybindings', () => {
  it('parses and matches mod bindings', () => {
    expect(parseKeyBinding('mod+shift+s')).toMatchObject({ key: 's', mod: true, shift: true })

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, shiftKey: true })
    expect(matchesKeyBinding(event, 'mod+shift+s')).toBe(true)
    expect(matchesKeyBinding(new KeyboardEvent('keydown', { key: 's' }), 'mod+s')).toBe(false)
    expect(formatKeyBinding('mod+k')).toMatch(/K$/)
  })
})

describe('translator and query builder', () => {
  it('translates nested keys with replacements', () => {
    const translator = new Translator({ table: { showing: 'Showing :first–:last of :total' } })

    expect(translator.t('table.showing', { first: 1, last: 2, total: 3 })).toBe('Showing 1–2 of 3')
    expect(translator.t('missing.key', {}, 'Fallback')).toBe('Fallback')
  })

  it('serialises nested query params like PHP', () => {
    expect(
      decodeURIComponent(
        buildQuery({ token: 't', values: ['a', 'b'], state: { x: 1 }, empty: null }),
      ),
    ).toBe('token=t&values[0]=a&values[1]=b&state[x]=1')
  })
})

describe('wallClockNow', () => {
  it('reads the wall clock of a timezone', () => {
    const now = new Date(Date.UTC(2026, 0, 31, 22, 30, 15))
    const bahrain = wallClockNow('Asia/Bahrain', now)

    expect([bahrain.getFullYear(), bahrain.getMonth(), bahrain.getDate()]).toEqual([2026, 1, 1])
    expect([bahrain.getHours(), bahrain.getMinutes(), bahrain.getSeconds()]).toEqual([1, 30, 15])
    expect(wallClockNow(null, now)).toBe(now)
    expect(wallClockNow('Not/AZone', now)).toBe(now)
  })
})

describe('widget and column registry keys', () => {
  it('tries the widget component, then widget:<type>, then a custom type', async () => {
    const { ComponentRegistry, columnRegistryKey, resolveFirst, widgetRegistryKeys } =
      await import('../src/registry')

    expect(widgetRegistryKeys({ type: 'Chart', component: 'sales-chart' })).toEqual([
      'sales-chart',
      'widget:Chart',
    ])
    expect(widgetRegistryKeys({ type: 'TableWidget', component: 'widget:App\\Latest' })).toEqual([
      'widget:TableWidget',
    ])
    expect(widgetRegistryKeys({ type: 'SalesMap' })).toEqual(['widget:SalesMap', 'SalesMap'])
    expect(columnRegistryKey({ type: 'ProgressColumn' })).toBe('column:ProgressColumn')

    const registry = new ComponentRegistry<string>({ 'widget:Chart': 'MyChart' })
    expect(resolveFirst(registry, widgetRegistryKeys({ type: 'Chart' }))).toBe('MyChart')
    expect(resolveFirst(registry, widgetRegistryKeys({ type: 'StatsOverviewWidget' }))).toBe(
      undefined,
    )
  })
})

describe('applyMask', () => {
  it('formats typed text with a mask pattern', () => {
    expect(applyMask('5551234567', '(999) 999-9999')).toBe('(555) 123-4567')
    expect(applyMask('(555) 12', '(999) 999-9999')).toBe('(555) 12')
    expect(applyMask('555', '(999) 999-9999')).toBe('(555')
    expect(applyMask('ab12cd', 'aa-99')).toBe('ab-12')
    expect(applyMask('1x2', '99')).toBe('12')
    expect(applyMask('', '99')).toBe('')
    expect(applyMask('anything', null)).toBe('anything')
  })
})

describe('image crop and resize geometry', () => {
  it('centre-crops to an aspect ratio', () => {
    expect(parseAspectRatio('16:9')).toBeCloseTo(16 / 9)
    expect(parseAspectRatio('nope')).toBeNull()
    expect(imageGeometry(400, 200, { aspectRatio: '1:1' })).toEqual({
      sx: 100,
      sy: 0,
      sw: 200,
      sh: 200,
      width: 200,
      height: 200,
    })
  })

  it('resizes with cover, contain and force', () => {
    expect(imageGeometry(400, 200, { width: 100, height: 100 })).toMatchObject({
      sx: 100,
      sw: 200,
      width: 100,
      height: 100,
    })
    expect(imageGeometry(400, 200, { width: 100, height: 100, mode: 'contain' })).toMatchObject({
      sx: 0,
      width: 100,
      height: 50,
    })
    expect(imageGeometry(400, 200, { width: 100, height: 100, mode: 'force' })).toMatchObject({
      sw: 400,
      width: 100,
      height: 100,
    })
    expect(imageGeometry(400, 200, { width: 200 })).toMatchObject({ width: 200, height: 100 })
    expect(imageGeometry(400, 200, {})).toBeNull()
  })
})
