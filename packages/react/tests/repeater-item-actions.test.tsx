import { FormStore, setIconAliases, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { FormProvider } from '../src/components/form/form-context'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { actions, registry, Wrapper } from './mocks'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterEach(() => vi.restoreAllMocks())

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })
  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <SchemaRenderer components={store.state.components} />
      </FormProvider>
    </Wrapper>,
  )

  return { store, ...view }
}

const input = (path: string) =>
  ({
    type: 'TextInput',
    key: path,
    name: 'name',
    statePath: path,
    label: 'Name',
  }) as SchemaComponent

const action = (name: string, extra: Record<string, unknown> = {}) => ({
  type: 'Action',
  name,
  label: name,
  icon: 'circle',
  variant: 'icon-button',
  ...extra,
})

const repeater = (extra: Record<string, unknown> = {}) =>
  ({
    type: 'Repeater',
    key: 'members',
    name: 'members',
    statePath: 'members',
    label: 'Members',
    items: [
      { key: '0', schema: [input('members.0.name')] },
      { key: '1', schema: [input('members.1.name')] },
    ],
    template: [input('members.__INDEX__.name')],
    templateState: { name: null },
    addable: true,
    deletable: true,
    reorderable: true,
    addActionLabel: 'Add member',
    ...extra,
  }) as SchemaComponent

const members = { members: [{ name: 'Ann' }, { name: 'Bob' }] }

describe('Repeater item actions', () => {
  it('draws the default item buttons with the icons registered for their aliases', async () => {
    setIconAliases({
      'alfakit::forms.components.repeater.actions.delete': 'ghost',
      'alfakit::forms.components.repeater.actions.move-down': 'skull',
    })

    try {
      const { container } = renderForm([repeater()], members)
      const first = container.querySelector('li[data-index="0"]') as HTMLElement

      await waitFor(
        () => {
          expect(first.querySelector('.lucide-ghost')).not.toBeNull()
          expect(first.querySelector('.lucide-skull')).not.toBeNull()
        },
        { timeout: 5000 },
      )
      expect(first.querySelector('.lucide-trash-2, .lucide-trash2')).toBeNull()
    } finally {
      setIconAliases(null)
    }
  })

  it('runs uncustomised actions in the browser with the server labels', () => {
    const { store, container } = renderForm(
      [
        repeater({
          itemActions: {
            delete: action('delete', { label: 'Delete member' }),
            moveUp: action('moveUp', { label: 'Up' }),
            moveDown: action('moveDown', { label: 'Down' }),
            add: action('add', { label: 'Add member', variant: 'outline' }),
          },
        }),
      ],
      members,
    )
    const trigger = vi.spyOn(actions, 'trigger')
    const second = container.querySelector('li[data-index="1"]') as HTMLElement

    fireEvent.click(within(second).getByRole('button', { name: 'Up' }))
    expect(store.getValue('members')).toEqual([{ name: 'Bob' }, { name: 'Ann' }])

    fireEvent.click(within(second).getByRole('button', { name: 'Delete member' }))
    expect(store.getValue('members')).toEqual([{ name: 'Bob' }])

    fireEvent.click(screen.getByRole('button', { name: 'Add member' }))
    expect(store.getValue('members')).toEqual([{ name: 'Bob' }, { name: null }])
    expect(trigger).not.toHaveBeenCalled()
  })

  it('runs customised and extra item actions on the server with the item key', () => {
    const { store, container } = renderForm(
      [
        repeater({
          itemActions: {
            delete: action('delete', { label: 'Delete', server: true, hasModal: true }),
          },
          items: [
            { key: '0', schema: [input('members.0.name')] },
            {
              key: '1',
              schema: [input('members.1.name')],
              actions: [action('shout', { label: 'Shout', hasAction: true })],
            },
          ],
        }),
      ],
      members,
    )
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()
    const second = container.querySelector('li[data-index="1"]') as HTMLElement

    fireEvent.click(within(second).getByRole('button', { name: 'Delete' }))
    expect(trigger).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'delete' }),
      expect.objectContaining({ component: 'field:form::members', arguments: { item: '1' } }),
    )
    // The server answers with the new state; nothing changed locally.
    expect(store.getValue('members')).toEqual(members.members)

    fireEvent.click(within(second).getByRole('button', { name: 'Shout' }))
    expect(trigger).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'shout' }),
      expect.objectContaining({ arguments: { item: '1' } }),
    )
    expect(
      within(container.querySelector('li[data-index="0"]') as HTMLElement).queryByRole('button', {
        name: 'Shout',
      }),
    ).toBeNull()
  })

  it('hides actions per item and honours the reorder, number and alignment options', () => {
    const { container } = renderForm(
      [
        repeater({
          reorderableWithButtons: false,
          itemNumbers: true,
          addActionAlignment: 'end',
          itemActions: { delete: action('delete', { label: 'Delete' }), add: action('add') },
          items: [
            { key: '0', schema: [input('members.0.name')], itemActions: { delete: null } },
            { key: '1', schema: [input('members.1.name')] },
          ],
        }),
      ],
      members,
    )

    const first = container.querySelector('li[data-index="0"]') as HTMLElement
    const second = container.querySelector('li[data-index="1"]') as HTMLElement

    expect(within(first).queryByRole('button', { name: 'Delete' })).toBeNull()
    expect(within(second).getByRole('button', { name: 'Delete' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Move up' })).toBeNull()
    expect(first.textContent).toContain('1')
    expect(container.querySelector('[data-slot="item-add-action"]')?.className).toContain(
      'justify-end',
    )
  })

  it('collapses and expands every item', () => {
    const { container } = renderForm([repeater({ collapsible: true })], members)

    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }))
    expect(container.querySelectorAll('input')).toHaveLength(0)
    expect(
      screen.getAllByRole('button', { name: 'Expand' })[0]?.getAttribute('aria-expanded'),
    ).toBe('false')

    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }))
    expect(container.querySelectorAll('input')).toHaveLength(2)
  })
})

const builder = (extra: Record<string, unknown> = {}) =>
  ({
    type: 'Builder',
    key: 'content',
    name: 'content',
    statePath: 'content',
    label: 'Content',
    items: [
      {
        key: '0',
        type: 'heading',
        preview: '<h2>Hello preview</h2>',
        schema: [input('content.0.data.name')],
      },
    ],
    blocks: [
      {
        name: 'heading',
        label: 'Heading',
        schema: [input('content.__INDEX__.data.name')],
        state: { type: 'heading', data: { name: null } },
      },
    ],
    blockNumbers: false,
    blockLabels: true,
    addable: true,
    deletable: true,
    reorderable: true,
    addActionLabel: 'Add block',
    ...extra,
  }) as SchemaComponent

describe('Builder previews and actions', () => {
  it('shows the preview and opens the form with the edit button or the preview', () => {
    const { container } = renderForm([builder({ blockPreviews: true })], {
      content: [{ type: 'heading', data: { name: 'Hello' } }],
    })

    expect(container.querySelector('[data-slot="builder-preview"]')?.textContent).toBe(
      'Hello preview',
    )
    expect(container.querySelector('input')).toBeNull()

    const preview = container.querySelector('[data-slot="builder-preview"]') as HTMLElement
    expect(preview.getAttribute('role')).toBe('button')
    fireEvent.keyDown(preview, { key: 'Enter' })
    expect(container.querySelector('input')).not.toBeNull()

    const edit = screen.getByRole('button', { name: 'Edit block' })
    expect(edit.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(edit)
    expect(container.querySelector('input')).toBeNull()
  })

  it('renders interactive previews and registered preview components', () => {
    registry.register('builder-preview:hero', ({ data }: { data: { name: string } }) => (
      <strong>Hero {data.name}</strong>
    ))

    const { container } = renderForm(
      [
        builder({
          blockPreviews: true,
          interactivePreviews: true,
          items: [{ key: '0', type: 'heading', previewComponent: 'hero', schema: [] }],
        }),
      ],
      { content: [{ type: 'heading', data: { name: 'Ann' } }] },
    )

    const preview = container.querySelector('[data-slot="builder-preview"]') as HTMLElement
    expect(preview.textContent).toBe('Hero Ann')
    expect(preview.getAttribute('role')).toBeNull()
  })

  it('runs a customised add action with the picked block', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()
    renderForm(
      [builder({ itemActions: { add: action('add', { label: 'Add block', server: true }) } })],
      {
        content: [],
      },
    )

    // Empty: the picker is shown inline.
    fireEvent.click(screen.getByRole('button', { name: 'Heading' }))

    expect(trigger).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'add' }),
      expect.objectContaining({ arguments: { block: 'heading' } }),
    )
  })
})

describe('KeyValue actions', () => {
  it('uses the customised add label and runs a customised delete on the server', () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()
    const { store } = renderForm(
      [
        {
          type: 'KeyValue',
          key: 'meta',
          name: 'meta',
          statePath: 'meta',
          label: 'Meta',
          keyLabel: 'Key',
          valueLabel: 'Value',
          addActionLabel: 'Add row',
          addable: true,
          deletable: true,
          reorderable: false,
          editableKeys: true,
          editableValues: true,
          itemActions: {
            add: action('add', { label: 'New pair', variant: 'ghost' }),
            delete: action('delete', { label: 'Drop', server: true }),
          },
        } as SchemaComponent,
      ],
      { meta: { a: '1' } },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Drop' }))
    expect(trigger).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'delete' }),
      expect.objectContaining({ arguments: { item: '0' } }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'New pair' }))
    expect(store.getValue('meta')).toEqual([
      { key: 'a', value: '1' },
      { key: '', value: '' },
    ])
  })
})
