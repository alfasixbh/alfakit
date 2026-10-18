import { isImplicitSubmit } from '../src/implicit-submit'

function setup(html: string) {
  document.body.innerHTML = `<form>${html}</form><input id="outside" type="text">`
  const form = document.querySelector('form')!

  return { form, input: (selector: string) => document.querySelector(selector) as HTMLElement }
}

const enter = (target: Element | null, extra: Partial<KeyboardEvent> = {}) => ({
  key: 'Enter',
  defaultPrevented: false,
  isComposing: false,
  target,
  ...extra,
})

describe('isImplicitSubmit', () => {
  it('submits on Enter in text-like inputs', () => {
    const { form, input } = setup('<input id="email" type="email"><input id="pw" type="password">')

    expect(isImplicitSubmit(enter(input('#email')), form)).toBe(true)
    expect(isImplicitSubmit(enter(input('#pw')), form)).toBe(true)
  })

  it('ignores other keys, modifiers, IME composition and handled events', () => {
    const { form, input } = setup('<input id="name" type="text">')
    const name = input('#name')

    expect(isImplicitSubmit(enter(name, { key: 'a' }), form)).toBe(false)
    expect(isImplicitSubmit(enter(name, { shiftKey: true }), form)).toBe(false)
    expect(isImplicitSubmit(enter(name, { isComposing: true }), form)).toBe(false)
    expect(isImplicitSubmit(enter(name, { defaultPrevented: true }), form)).toBe(false)
  })

  it('leaves textareas, checkboxes, comboboxes and portalled inputs alone', () => {
    const { form, input } = setup(
      '<textarea id="notes"></textarea><input id="check" type="checkbox"><input id="combo" type="text" role="combobox">',
    )

    expect(isImplicitSubmit(enter(input('#notes')), form)).toBe(false)
    expect(isImplicitSubmit(enter(input('#check')), form)).toBe(false)
    expect(isImplicitSubmit(enter(input('#combo')), form)).toBe(false)
    expect(isImplicitSubmit(enter(input('#outside')), form)).toBe(false)
  })

  it('does not submit a wizard from one step', () => {
    const { form, input } = setup('<div data-surface="wizard"><input id="step" type="text"></div>')

    expect(isImplicitSubmit(enter(input('#step')), form)).toBe(false)
  })
})
