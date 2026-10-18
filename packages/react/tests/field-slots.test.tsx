import { FormStore, type SchemaComponent } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { EntryWrapper } from '../src/components/entries/entry-wrapper'
import { FormProvider, useFormState } from '../src/components/form/form-context'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { registry, Wrapper } from './mocks'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => undefined
  // Icons render synchronously as `<i data-icon>` so their classes can be checked.
  registry.register('panel:icon', ({ name, className }: { name: string; className?: string }) => (
    <i data-icon={name} className={className} />
  ))
})

const text = (name: string, extra: Record<string, unknown> = {}) =>
  ({
    type: 'TextInput',
    key: name,
    name,
    statePath: name,
    label: name,
    inputType: 'text',
    ...extra,
  }) as SchemaComponent

const textItem = (key: string, content: string) => ({
  component: { type: 'Text', key, content } as SchemaComponent,
})

function LiveForm() {
  const state = useFormState()

  return <SchemaRenderer components={state.components} />
}

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore(
    { components, state, fingerprints: { '': 'root' } },
    { token: 't', component: 'form', refreshUrl: '/r' },
  )

  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <LiveForm />
      </FormProvider>
    </Wrapper>,
  )

  return { store, ...view }
}

afterEach(() => vi.unstubAllGlobals())

describe('field content slots', () => {
  it('renders every slot in its place around the label and control', () => {
    const slots = Object.fromEntries(
      [
        'aboveLabel',
        'beforeLabel',
        'afterLabel',
        'belowLabel',
        'aboveContent',
        'beforeContent',
        'afterContent',
        'belowContent',
      ].map((name) => [
        name,
        {
          items: [textItem(`name::${name}`, name)],
          alignment: name === 'afterLabel' ? 'end' : 'start',
        },
      ]),
    )

    const { container } = renderForm([text('name', { slots, helperText: 'Helper' })], { name: '' })
    const order = Array.from(container.querySelectorAll('[data-content-slot]')).map((node) =>
      node.getAttribute('data-content-slot'),
    )

    expect(order).toEqual([
      'aboveLabel',
      'beforeLabel',
      'afterLabel',
      'belowLabel',
      'aboveContent',
      'beforeContent',
      'afterContent',
      'belowContent',
    ])
    // Before/after content sit on either side of the input.
    const content = container.querySelector('[data-slot="field-content"]')!
    expect(content.children[1]?.querySelector('input')).not.toBeNull()
    expect(container.querySelector('[data-content-slot="afterLabel"]')!.className).toContain(
      'justify-end',
    )
    expect(screen.getByText('belowContent')).toBeInTheDocument()
  })

  it('shows the error message slots only with an error', () => {
    const slots = {
      aboveErrorMessage: { items: [textItem('e1', 'Check it')], alignment: 'start' },
      belowErrorMessage: { items: [textItem('e2', 'Ask support')], alignment: 'between' },
    }
    const { store } = renderForm([text('name', { slots })], { name: '' })

    expect(screen.queryByText('Check it')).toBeNull()

    act(() => store.setErrors({ name: 'Required.' }))

    expect(screen.getByText('Check it')).toBeInTheDocument()
    expect(screen.getByText('Ask support')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Required.')
  })

  it('runs slot actions as field actions', async () => {
    const bodies: Array<Record<string, unknown>> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)

        return new Response(
          JSON.stringify({
            status: 'success',
            form: {
              partial: true,
              patches: [],
              fingerprints: { '': 'root' },
              state: { slug: 'done' },
              partialState: true,
            },
          }),
          { status: 200 },
        )
      }),
    )

    const { store } = renderForm(
      [
        text('slug', {
          slots: {
            belowContent: {
              items: [
                textItem('slug::t', 'Generated'),
                {
                  action: { type: 'Action', name: 'generate', label: 'Generate', hasAction: true },
                },
              ],
              alignment: 'start',
            },
          },
        }),
      ],
      { slug: '' },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))

    await waitFor(() => expect(store.getValue('slug')).toBe('done'))
    expect(bodies[0]).toMatchObject({ component: 'field:form::slug', action: 'generate' })
  })

  it('merges wrapper attributes and renders html validation messages', () => {
    const { container, store } = renderForm(
      [
        text('name', {
          extraAttributes: { class: 'outer', 'data-a': '1' },
          extraFieldWrapperAttributes: { class: 'wrapper', 'data-b': '2' },
          allowHtmlValidationMessages: true,
        }),
      ],
      { name: '' },
    )
    const field = container.querySelector('[data-slot="field"]')!

    expect(field.className).toContain('outer')
    expect(field.className).toContain('wrapper')
    expect(field).toHaveAttribute('data-a', '1')
    expect(field).toHaveAttribute('data-b', '2')

    act(() => store.setErrors({ name: 'Use <strong>letters</strong>.' }))

    expect(screen.getByRole('alert').querySelector('strong')).toHaveTextContent('letters')
  })

  it('renders entry slots and wrapper attributes', () => {
    const { container } = render(
      <Wrapper>
        <EntryWrapper
          entry={{
            type: 'TextEntry',
            key: 'title',
            name: 'title',
            label: 'Title',
            extraEntryWrapperAttributes: { class: 'entry-extra' },
            slots: {
              beforeLabel: { items: [textItem('b', 'Before')], alignment: 'start' },
              belowContent: { items: [textItem('c', 'Below')], alignment: 'start' },
            },
          }}
        >
          Hello
        </EntryWrapper>
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="entry"]')!.className).toContain('entry-extra')
    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(screen.getByText('Below')).toBeInTheDocument()
  })
})

describe('fused group', () => {
  it('fuses its fields and lists their errors below', () => {
    const { container, store } = renderForm(
      [
        {
          type: 'FusedGroup',
          key: 'fused',
          label: 'Phone',
          columns: { default: 1, lg: 2 },
          schema: [
            text('code', { placeholder: 'Code', helperText: 'Hidden helper' }),
            text('number', { placeholder: 'Number' }),
          ],
        } as SchemaComponent,
      ],
      { code: '', number: '' },
    )

    const controls = container.querySelector('[data-slot="fused-group-controls"]')!

    expect(screen.getByRole('group', { name: 'Phone' })).toBeInTheDocument()
    expect(controls.className).toContain('lg:grid-cols-2')
    expect(controls.querySelectorAll('input')).toHaveLength(2)
    // Labels stay for screen readers; helper texts are not shown.
    expect(screen.getByLabelText('code')).toBeInTheDocument()
    expect(screen.queryByText('Hidden helper')).toBeNull()

    act(() => store.setErrors({ number: 'Invalid number.' }))

    expect(controls).toHaveAttribute('data-invalid')
    expect(screen.getAllByText('Invalid number.')).toHaveLength(2)
  })
})

describe('select options', () => {
  const select = (extra: Record<string, unknown>) =>
    ({
      type: 'Select',
      key: 's',
      name: 's',
      statePath: 's',
      label: 'Status',
      selectablePlaceholder: true,
      ...extra,
    }) as SchemaComponent

  it('shows the no options message of an empty searchable select', () => {
    renderForm([select({ options: [], multiple: true, noOptionsMessage: 'Nothing yet' })], {
      s: [],
    })

    fireEvent.click(screen.getByRole('combobox'))

    expect(screen.getByText('Nothing yet')).toBeInTheDocument()
  })

  it('renders html labels and truncates them when not wrapping', () => {
    renderForm(
      [
        select({
          options: [{ value: 'a', label: '<b>Bold</b> option' }],
          multiple: true,
          allowHtml: true,
          wrapOptionLabels: false,
        }),
      ],
      { s: ['a'] },
    )

    expect(screen.getByRole('combobox').querySelector('b')).toHaveTextContent('Bold')

    fireEvent.click(screen.getByRole('combobox'))
    const label = document.querySelector('[data-slot="option-label"]')!

    expect(label.querySelector('b')).not.toBeNull()
    expect(label.className).toContain('truncate')
  })

  it('colours affix icons', () => {
    const { container } = renderForm(
      [text('a', { prefixIcon: 'at-sign', prefixIconColor: 'danger' })],
      { a: '' },
    )

    expect(
      container.querySelector('[data-slot="input-group"] [data-icon]')!.getAttribute('class'),
    ).toContain('text-destructive')
  })
})

describe('checkbox list and toggle buttons', () => {
  it('customises the bulk toggle links and flows options by column', () => {
    const { container } = renderForm(
      [
        {
          type: 'CheckboxList',
          key: 'c',
          name: 'c',
          statePath: 'c',
          label: 'Tags',
          options: [
            { value: 'a', label: '<em>A</em>' },
            { value: 'b', label: 'B' },
          ],
          bulkToggleable: true,
          allowHtml: true,
          gridColumns: 2,
          gridDirection: 'column',
          selectAllAction: { label: 'Pick all' },
          deselectAllAction: { hidden: true },
        } as SchemaComponent,
      ],
      { c: [] },
    )

    expect(screen.getByRole('button', { name: 'Pick all' })).toBeInTheDocument()
    expect(container.querySelector('[data-slot="deselect-all"]')).toBeNull()
    expect(container.querySelector('em')).toHaveTextContent('A')
    expect(container.querySelector('[data-grid-direction="column"]')!.className).toContain(
      'md:columns-2',
    )
  })

  it('lays toggle buttons out in a grid', () => {
    const { container } = renderForm(
      [
        {
          type: 'ToggleButtons',
          key: 't',
          name: 't',
          statePath: 't',
          label: 'Size',
          options: [
            { value: 's', label: 'S' },
            { value: 'm', label: 'M' },
          ],
          gridColumns: 3,
        } as SchemaComponent,
      ],
      { t: null },
    )

    const group = container.querySelector('[data-slot="toggle-buttons"]')!

    expect(group.className).toContain('md:grid-cols-3')
    expect(group).toHaveAttribute('data-grid-direction', 'row')
  })
})

describe('date picker', () => {
  it('steps the native time input and shows coloured affixes', () => {
    const { container } = renderForm(
      [
        {
          type: 'DateTimePicker',
          key: 'd',
          name: 'd',
          statePath: 'd',
          label: 'Starts',
          format: 'Y-m-d H:i:s',
          hasDate: true,
          hasTime: true,
          native: true,
          timezone: 'UTC',
          firstDayOfWeek: 0,
          closeOnDateSelection: true,
          minutesStep: 15,
          suffixIcon: 'clock',
          suffixIconColor: 'primary',
        } as SchemaComponent,
      ],
      { d: null },
    )

    expect(screen.getByLabelText('Starts')).toHaveAttribute('step', '900')
    expect(
      container.querySelector('[data-slot="input-group"] [data-icon]')!.getAttribute('class'),
    ).toContain('text-primary')
  })
})
