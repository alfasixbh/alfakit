import { describe, expect, it } from 'vitest'
import {
  filterBuilderBlocks,
  sliderFillSections,
  sliderFillStyle,
  sliderHasTooltips,
  sliderShowsTooltip,
} from '../src/advanced-fields'
import { gridContent, leadExtensionConfig, parseGridColumns } from '../src/rich-editor-toolbar'
import { colorAlpha, withColorAlpha } from '../src/utils/color'

describe('ColorPicker alpha helpers', () => {
  it('reads and writes the alpha channel', () => {
    expect(colorAlpha('rgba(1, 2, 3, 0.25)')).toBe(0.25)
    expect(colorAlpha('#ffffff')).toBe(1)
    expect(colorAlpha(null)).toBe(1)
    expect(withColorAlpha('#0a141e', 0.456)).toBe('rgba(10, 20, 30, 0.46)')
    expect(withColorAlpha('rgba(1, 2, 3, 1)', 2)).toBe('rgba(1, 2, 3, 1)')
    expect(withColorAlpha(null, 0.5)).toBe('rgba(0, 0, 0, 0.5)')
  })
})

describe('Slider handle flags', () => {
  const track = { min: 0, max: 100, step: 1 }

  it('shows tooltips per thumb', () => {
    expect(sliderShowsTooltip({ tooltips: [true, false] }, 0)).toBe(true)
    expect(sliderShowsTooltip({ tooltips: [true, false] }, 1)).toBe(false)
    expect(sliderShowsTooltip({ tooltips: true }, 3)).toBe(true)
    expect(sliderHasTooltips({ tooltips: [false, false] })).toBe(false)
    expect(sliderHasTooltips({})).toBe(false)
  })

  it('fills the chosen sections between thumbs', () => {
    expect(sliderFillSections([20, 80], { ...track, fillTrack: [false, true, false] })).toEqual([
      { start: 20, end: 80 },
    ])
    expect(sliderFillSections([20, 80], { ...track, fillTrack: [true, false, true] })).toEqual([
      { start: 0, end: 20 },
      { start: 80, end: 100 },
    ])
    expect(sliderFillSections([20, 80], { ...track, fillTrack: true })).toBeNull()
  })

  it('positions fill sections from the minimum', () => {
    const section = { start: 20, end: 50 }

    expect(sliderFillStyle(section, { vertical: false, direction: 'ltr' })).toEqual({
      left: '20%',
      width: '30%',
    })
    expect(sliderFillStyle(section, { vertical: false, direction: 'rtl' })).toEqual({
      right: '20%',
      width: '30%',
    })
    expect(sliderFillStyle(section, { vertical: true, direction: 'ltr' })).toEqual({
      bottom: '20%',
      height: '30%',
    })
    expect(
      sliderFillStyle(section, { vertical: true, topToBottom: true, direction: 'ltr' }),
    ).toEqual({ top: '20%', height: '30%' })
  })
})

describe('Builder block search', () => {
  it('matches labels case-insensitively', () => {
    const blocks = [{ label: 'Heading' }, { label: 'Image gallery' }]

    expect(filterBuilderBlocks(blocks, ' GALL ')).toEqual([{ label: 'Image gallery' }])
    expect(filterBuilderBlocks(blocks, '')).toBe(blocks)
  })
})

describe('RichEditor grid and lead', () => {
  it('clamps grid columns and builds the inserted content', () => {
    expect(parseGridColumns('3')).toBe(3)
    expect(parseGridColumns('12')).toBe(6)
    expect(parseGridColumns('1')).toBe(2)
    expect(parseGridColumns('abc')).toBe(2)
    expect(gridContent(2)).toEqual({
      type: 'grid',
      attrs: { columns: 2 },
      content: [
        { type: 'gridColumn', content: [{ type: 'paragraph' }] },
        { type: 'gridColumn', content: [{ type: 'paragraph' }] },
      ],
    })
  })

  it('reads lead paragraphs stored by AlfaKit or Filament', () => {
    const lead = leadExtensionConfig().addGlobalAttributes()[0]!.attributes.lead
    const paragraph = (className: string) => {
      const element = document.createElement('p')
      element.className = className

      return element
    }

    expect(lead.parseHTML(paragraph('alfakit-lead'))).toBe(true)
    expect(lead.parseHTML(paragraph('lead'))).toBe(true)
    expect(lead.parseHTML(paragraph(''))).toBe(false)
    expect(lead.renderHTML({ lead: true })).toEqual({ class: 'alfakit-lead' })
    expect(lead.renderHTML({ lead: false })).toEqual({})
  })
})
