import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  builderItemLabel,
  builderItems,
  builderItemSchema,
  builderPickerMove,
  canAddBuilderBlock,
  indentCode,
  insertBuilderItem,
  modalTableQuery,
  modalTableSelected,
  newlineWithIndent,
  sliderPips,
  sliderState,
  sliderValues,
  toggleButtonsNext,
  toggleButtonsSelected,
  toggleModalTableKey,
} from '../src/advanced-fields'
import { countCodeLines, highlightCode, isHighlightedLanguage } from '../src/code-highlight'
import { collectFields, FormStore } from '../src/form'
import type { BuilderSchema } from '../src/schema/advanced-fields'
import type { SchemaComponent } from '../src/schema/components'

const heading = {
  name: 'heading',
  label: 'Heading',
  maxItems: 1,
  schema: [
    {
      type: 'TextInput',
      key: 'content.__INDEX__.data.text',
      name: 'text',
      statePath: 'content.__INDEX__.data.text',
      inputType: 'text',
    } as SchemaComponent,
  ],
  state: { type: 'heading', data: { text: null } },
}
const paragraph = {
  ...heading,
  name: 'paragraph',
  label: 'Paragraph',
  maxItems: undefined,
  state: { type: 'paragraph', data: { text: null } },
}

const builder: Pick<BuilderSchema, 'items' | 'blocks' | 'maxItems'> = {
  blocks: [heading, paragraph],
  items: [
    {
      key: '0',
      type: 'paragraph',
      label: 'Intro',
      schema: [
        { type: 'TextInput', key: 'p', statePath: 'content.0.data.text' } as SchemaComponent,
      ],
    },
  ],
  maxItems: 3,
}

describe('builder helpers', () => {
  it('inserts fresh copies of the block state', () => {
    const items = insertBuilderItem([], heading)
    const next = insertBuilderItem(items, paragraph, 0)

    expect(next.map((item) => item.type)).toEqual(['paragraph', 'heading'])
    expect(next[1]).not.toBe(heading.state)
    expect(builderItems([{ type: 'a', data: {} }, 'x', null])).toEqual([{ type: 'a', data: {} }])
  })

  it('respects block and builder limits', () => {
    const one = [{ type: 'heading', data: {} }]

    expect(canAddBuilderBlock(builder, heading, [])).toBe(true)
    expect(canAddBuilderBlock(builder, heading, one)).toBe(false)
    expect(canAddBuilderBlock(builder, paragraph, one)).toBe(true)
    expect(canAddBuilderBlock(builder, paragraph, [...one, ...one, ...one])).toBe(false)
  })

  it('treats null limits from the server as unlimited', () => {
    const unlimited = { ...builder, maxItems: null as unknown as undefined }
    const block = { ...paragraph, maxItems: null as unknown as undefined }

    expect(canAddBuilderBlock(unlimited, block, [])).toBe(true)
    expect(canAddBuilderBlock(unlimited, block, [{ type: 'paragraph', data: {} }])).toBe(true)
  })

  it('uses the server schema only when it describes the same block', () => {
    const same = builderItemSchema(builder, [{ type: 'paragraph', data: {} }], 0)
    const moved = builderItemSchema(builder, [{ type: 'heading', data: {} }], 0)

    expect(same[0]?.key).toBe('p')
    expect((moved[0] as { statePath: string }).statePath).toBe('content.0.data.text')
    expect(builderItemSchema(builder, [{ type: 'unknown', data: {} }], 0)).toEqual([])
    expect(builderItemLabel(builder, [{ type: 'paragraph', data: {} }], 0)).toBe('Intro')
    expect(builderItemLabel(builder, [{ type: 'heading', data: {} }], 0)).toBe('Heading')
  })

  it('collects fields inside builder items', () => {
    const fields = collectFields([
      { type: 'Builder', key: 'content', statePath: 'content', name: 'content', ...builder },
    ] as unknown as SchemaComponent[])

    expect(fields.map((field) => field.statePath)).toEqual(['content', 'content.0.data.text'])
  })
})

describe('toggle buttons helpers', () => {
  it('toggles single and multiple values', () => {
    expect(toggleButtonsNext(null, 'a', false)).toBe('a')
    expect(toggleButtonsNext('a', 'a', false)).toBeNull()
    expect(toggleButtonsNext(['a'], 'b', true)).toEqual(['a', 'b'])
    expect(toggleButtonsNext(['a', 'b'], 'a', true)).toEqual(['b'])
    expect(toggleButtonsSelected(true, false)).toEqual(['1'])
    expect(toggleButtonsSelected(2, false)).toEqual(['2'])
  })
})

describe('slider helpers', () => {
  it('clamps, sorts and stores values', () => {
    expect(sliderValues(150, { min: 0, max: 100 })).toEqual([100])
    expect(sliderValues(null, { min: 10, max: 100 })).toEqual([10])
    expect(sliderValues([80, '20'], { min: 0, max: 100, multiple: true })).toEqual([20, 80])
    expect(sliderValues(undefined, { min: 0, max: 50, multiple: true })).toEqual([0, 50])
    expect(sliderState([70, 30], { multiple: true })).toEqual([30, 70])
    expect(sliderState([5], {})).toBe(5)
  })

  it('places pips along the track and labels at most eleven', () => {
    const pips = sliderPips({ min: 0, max: 100, step: 1 })

    expect(pips[0]).toEqual({ value: 0, percent: 0, labelled: true })
    expect(pips[pips.length - 1]).toMatchObject({ value: 100, percent: 100, labelled: true })
    expect(pips.filter((pip) => pip.labelled).length).toBeLessThanOrEqual(11)
    expect(
      sliderPips({ min: 0, max: 10, step: 1, pipsDensity: 5 }).map((pip) => pip.value),
    ).toEqual([0, 5, 10])
    expect(sliderPips({ min: 5, max: 5, step: 1 })).toEqual([])
  })
})

describe('code editor helpers', () => {
  it('indents, outdents and keeps indentation on new lines', () => {
    expect(indentCode('ab', 1, 1, 2)).toEqual({ value: 'a  b', selectionStart: 3, selectionEnd: 3 })
    expect(indentCode('a\nb', 0, 3, 2).value).toBe('  a\n  b')
    expect(indentCode('    a\n  b', 0, 9, 4, true).value).toBe('a\nb')
    expect(newlineWithIndent('  foo', 5, 5)).toEqual({
      value: '  foo\n  ',
      selectionStart: 8,
      selectionEnd: 8,
    })
  })

  it('highlights known languages into typed tokens', () => {
    const tokens = highlightCode('const a = "x" // note', 'javascript')

    expect(tokens).toContainEqual({ kind: 'keyword', text: 'const' })
    expect(tokens).toContainEqual({ kind: 'string', text: '"x"' })
    expect(tokens).toContainEqual({ kind: 'comment', text: '// note' })
    expect(tokens.map((token) => token.text).join('')).toBe('const a = "x" // note')

    expect(highlightCode('<?php $name = 1;', 'php')).toContainEqual({
      kind: 'variable',
      text: '$name',
    })
    expect(highlightCode('{"a": true}', 'json')).toContainEqual({ kind: 'property', text: '"a"' })
    expect(highlightCode('<a href="x">', 'html')).toContainEqual({
      kind: 'attribute',
      text: 'href',
    })
    expect(highlightCode('SELECT 1', 'sql')[0]).toEqual({ kind: 'keyword', text: 'SELECT' })
    expect(highlightCode('constant', 'javascript')).toEqual([{ kind: 'plain', text: 'constant' }])
    expect(highlightCode('x', 'brainfuck')).toEqual([{ kind: 'plain', text: 'x' }])
    expect(isHighlightedLanguage('PHP')).toBe(true)
    expect(countCodeLines('a\nb\n')).toBe(3)
  })

  it('keeps every character of any input', () => {
    const code = '/* unterminated\n"x\n<div>\'q\n`t'

    for (const language of [
      'javascript',
      'php',
      'python',
      'html',
      'css',
      'yaml',
      'markdown',
      'sql',
      'go',
    ]) {
      expect(
        highlightCode(code, language)
          .map((token) => token.text)
          .join(''),
      ).toBe(code)
    }
  })
})

describe('modal table select helpers', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('prefixes table state and toggles selections', () => {
    expect(modalTableQuery('table', { search: 'x', page: 2, sort: null })).toEqual({
      table_search: 'x',
      table_page: 2,
    })
    expect(toggleModalTableKey(['1'], '2', false)).toEqual(['2'])
    expect(toggleModalTableKey(['1'], '1', false)).toEqual([])
    expect(toggleModalTableKey(['1'], '2', true, 1)).toEqual(['1'])
    expect(toggleModalTableKey(['1'], '2', true)).toEqual(['1', '2'])
    expect(modalTableSelected(5, false)).toEqual(['5'])
    expect(modalTableSelected(null, false)).toEqual([])
    expect(modalTableSelected([1, 2], true)).toEqual(['1', '2'])
  })

  it('fetches the picker table from the options endpoint with the form state', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ table: { type: 'Table' }, labels: { 1: 'A' } })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = new FormStore(
      { components: [], state: { title: 'x' } },
      { token: 'tok', component: 'form', optionsUrl: '/o' },
    )
    const response = await store.modalTable('author_id', 'table', { search: 'ad', page: 2 })
    const url = String((fetchMock.mock.calls[0] as unknown as [string])[0])

    expect(response?.labels).toEqual({ 1: 'A' })
    expect(url).toContain('path=author_id')
    expect(url).toContain('table=1')
    expect(url).toContain('table_search=ad')
    expect(url).toContain('table_page=2')
    expect(url).toContain('state=' + encodeURIComponent(JSON.stringify({ title: 'x' })))
  })
})

describe('builderPickerMove', () => {
  // Two columns, then a group heading starts a new row with one option.
  const rects = [
    { top: 0, left: 0 },
    { top: 0, left: 200 },
    { top: 40, left: 0 },
    { top: 40, left: 200 },
    { top: 100, left: 0 },
  ]

  it('moves along the row in the reading direction', () => {
    expect(builderPickerMove('ArrowRight', 0, rects)).toBe(1)
    expect(builderPickerMove('ArrowLeft', 0, rects)).toBeNull()
    expect(builderPickerMove('ArrowLeft', 1, rects, true)).toBe(2)
    expect(builderPickerMove('ArrowRight', 1, rects, true)).toBe(0)
  })

  it('moves to the closest option of the next and previous row', () => {
    expect(builderPickerMove('ArrowDown', 1, rects)).toBe(3)
    expect(builderPickerMove('ArrowDown', 3, rects)).toBe(4)
    expect(builderPickerMove('ArrowUp', 4, rects)).toBe(2)
    expect(builderPickerMove('ArrowUp', 0, rects)).toBeNull()
    expect(builderPickerMove('ArrowDown', 4, rects)).toBeNull()
  })

  it('jumps to the ends and ignores other keys', () => {
    expect(builderPickerMove('End', 0, rects)).toBe(4)
    expect(builderPickerMove('Home', 3, rects)).toBe(0)
    expect(builderPickerMove('a', 0, rects)).toBeNull()
    expect(builderPickerMove('ArrowDown', 0, [])).toBeNull()
  })
})
