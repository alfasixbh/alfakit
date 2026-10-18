import { FormStore, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import EntrySlotsHarness from './EntrySlotsHarness.svelte'
import FormHarness from './FormHarness.svelte'
import { registry } from './mocks'
import SlotIcon from './SlotIcon.svelte'
import Wrapper from './Wrapper.svelte'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  // Icons render synchronously as `<i data-icon>` so their classes can be checked.
  registry.register('panel:icon', SlotIcon)
})

afterEach(() => vi.unstubAllGlobals())

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

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })
  const view = render(Wrapper, { props: { component: FormHarness, props: { store } } })

  return { store, ...view }
}

describe('field content slots', () => {
  it('renders every slot in its place around the label and control', () => {
    const names = [
      'aboveLabel',
      'beforeLabel',
      'afterLabel',
      'belowLabel',
      'aboveContent',
      'beforeContent',
      'afterContent',
      'belowContent',
    ]
    const slots = Object.fromEntries(
      names.map((name) => [
        name,
        {
          items: [textItem(`name::${name}`, name)],
          alignment: name === 'afterLabel' ? 'end' : 'start',
        },
      ]),
    )
    const { container } = renderForm([text('name', { slots })], { name: '' })

    expect(
      Array.from(container.querySelectorAll('[data-content-slot]')).map((node) =>
        node.getAttribute('data-content-slot'),
      ),
    ).toEqual(names)
    expect(
      container.querySelector('[data-slot="field-content"]')!.children[1]?.querySelector('input'),
    ).not.toBeNull()
    expect(container.querySelector('[data-content-slot="afterLabel"]')!.className).toContain(
      'justify-end',
    )
  })

  it('shows the error message slots only with an error, as html when allowed', async () => {
    const slots = {
      aboveErrorMessage: { items: [textItem('e1', 'Check it')], alignment: 'start' },
      belowErrorMessage: { items: [textItem('e2', 'Ask support')], alignment: 'start' },
    }
    const { store } = renderForm([text('name', { slots, allowHtmlValidationMessages: true })], {
      name: '',
    })

    expect(screen.queryByText('Check it')).toBeNull()

    store.setErrors({ name: 'Use <strong>letters</strong>.' })
    await tick()

    expect(screen.getByText('Check it')).toBeInTheDocument()
    expect(screen.getByText('Ask support')).toBeInTheDocument()
    expect(screen.getByRole('alert').querySelector('strong')).toHaveTextContent('letters')
  })

  it('runs slot actions as field actions', async () => {
    const bodies: Array<Record<string, unknown>> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)

        return new Response(
          JSON.stringify({ status: 'success', form: { components: [], state: { slug: 'done' } } }),
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

    await fireEvent.click(screen.getByRole('button', { name: 'Generate' }))

    await waitFor(() => expect(store.getValue('slug')).toBe('done'))
    expect(bodies[0]).toMatchObject({ component: 'field:form::slug', action: 'generate' })
  })

  it('merges wrapper attributes', () => {
    const { container } = renderForm(
      [
        text('name', {
          extraAttributes: { class: 'outer', 'data-a': '1' },
          extraFieldWrapperAttributes: { class: 'wrapper', 'data-b': '2' },
        }),
      ],
      { name: '' },
    )
    const field = container.querySelector('[data-slot="field"]')!

    expect(field.className).toContain('outer')
    expect(field.className).toContain('wrapper')
    expect(field).toHaveAttribute('data-a', '1')
    expect(field).toHaveAttribute('data-b', '2')
  })

  it('renders entry slots and wrapper attributes', () => {
    const { container } = render(Wrapper, {
      props: {
        component: EntrySlotsHarness,
        props: {
          entry: {
            type: 'TextEntry',
            key: 'title',
            name: 'title',
            label: 'Title',
            extraEntryWrapperAttributes: { class: 'entry-extra' },
            slots: {
              beforeLabel: { items: [textItem('b', 'Before')], alignment: 'start' },
              belowContent: { items: [textItem('c', 'Below')], alignment: 'start' },
            },
          },
        },
      },
    })

    expect(container.querySelector('[data-slot="entry"]')!.className).toContain('entry-extra')
    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(screen.getByText('Below')).toBeInTheDocument()
  })
})

describe('fused group', () => {
  it('fuses its fields and lists their errors below', async () => {
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
    expect(screen.getByLabelText('code')).toBeInTheDocument()
    expect(screen.queryByText('Hidden helper')).toBeNull()

    store.setErrors({ number: 'Invalid number.' })
    await tick()

    expect(controls).toHaveAttribute('data-invalid')
    expect(screen.getAllByText('Invalid number.')).toHaveLength(2)
  })
})

describe('field options', () => {
  it('renders html labels in a searchable select', () => {
    const { container } = renderForm(
      [
        {
          type: 'Select',
          key: 's',
          name: 's',
          statePath: 's',
          label: 'Status',
          selectablePlaceholder: true,
          multiple: true,
          allowHtml: true,
          options: [{ value: 'a', label: '<b>Bold</b>' }],
        } as SchemaComponent,
      ],
      { s: ['a'] },
    )

    expect(container.querySelector('[role="combobox"] b')).toHaveTextContent('Bold')
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

  it('customises checkbox list bulk toggles and flows by column', () => {
    const { container } = renderForm(
      [
        {
          type: 'CheckboxList',
          key: 'c',
          name: 'c',
          statePath: 'c',
          label: 'Tags',
          options: [{ value: 'a', label: '<em>A</em>' }],
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
