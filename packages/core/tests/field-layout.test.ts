import {
  collectFieldStatePaths,
  hasSlots,
  htmlLabelToText,
  mergeAttributes,
  slotAlignmentClass,
  timeInputStep,
} from '../src/field-layout'
import type { SchemaComponent } from '../src/schema'

describe('field layout helpers', () => {
  it('merges wrapper attributes and joins classes', () => {
    expect(
      mergeAttributes({ class: 'a', id: 'x' }, null, { class: 'b', id: 'y', 'data-z': 1 }),
    ).toEqual({ class: 'a b', id: 'y', 'data-z': 1 })
    expect(mergeAttributes(undefined, null)).toBeUndefined()
    expect(mergeAttributes({ class: 'only' })).toEqual({ class: 'only' })
  })

  it('maps slot alignment to flex justification', () => {
    expect(slotAlignmentClass('end')).toBe('justify-end')
    expect(slotAlignmentClass('between')).toBe('justify-between')
    expect(slotAlignmentClass(undefined)).toBe('justify-start')
  })

  it('detects slots', () => {
    const field = { slots: { afterLabel: { items: [], alignment: 'end' as const } } }

    expect(hasSlots(field, ['aboveLabel', 'afterLabel'])).toBe(true)
    expect(hasSlots(field, ['belowContent'])).toBe(false)
    expect(hasSlots({}, ['belowContent'])).toBe(false)
  })

  it('derives the time input step from the finest configured unit', () => {
    expect(timeInputStep({})).toBeUndefined()
    expect(timeInputStep({ hoursStep: 2 })).toBe(7200)
    expect(timeInputStep({ hoursStep: 2, minutesStep: 15 })).toBe(900)
    expect(timeInputStep({ hasSeconds: true, minutesStep: 15 })).toBe(1)
    expect(timeInputStep({ hasSeconds: true, secondsStep: 10 })).toBe(10)
  })

  it('collects nested field state paths', () => {
    const components = [
      { type: 'TextInput', key: 'a', name: 'a', statePath: 'a' },
      {
        type: 'Group',
        key: 'g',
        schema: [{ type: 'Select', key: 'b', name: 'b', statePath: 'data.b', options: [] }],
      },
      { type: 'Text', key: 't', content: 'x' },
    ] as unknown as SchemaComponent[]

    expect(collectFieldStatePaths(components)).toEqual(['a', 'data.b'])
  })
})

describe('html option labels', () => {
  it('turns a sanitised label into text', () => {
    expect(htmlLabelToText('<b>Tom</b> &amp; <i>Jerry</i>&nbsp;')).toBe('Tom & Jerry')
  })
})
