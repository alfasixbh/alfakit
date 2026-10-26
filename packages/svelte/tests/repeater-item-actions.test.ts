import { FormStore, setIconAliases, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, waitFor } from '@testing-library/svelte'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import FormHarness from './FormHarness.svelte'
import HeroPreview from './HeroPreview.svelte'
import { actions, registry } from './mocks'
import Wrapper from './Wrapper.svelte'

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
  const view = render(Wrapper, { props: { component: FormHarness, props: { store } } })

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
const buttonWithText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === text)!

describe('Repeater item actions', () => {
  it('draws the default item buttons with the icons registered for their aliases', async () => {
    setIconAliases({
      'alfakit::forms.components.repeater.actions.delete': 'ghost',
      'alfakit::forms.components.repeater.actions.move-down': 'skull',
    })

    try {
      const { container } = renderForm([repeater()], members)
      const first = () => container.querySelector('li[data-index="0"]') as HTMLElement

      // The replacement glyphs load lazily; give them time under a full parallel run.
      await waitFor(
        () => {
          expect(first().querySelector('.lucide-ghost')).not.toBeNull()
          expect(first().querySelector('.lucide-skull')).not.toBeNull()
        },
        { timeout: 5000 },
      )
    } finally {
      setIconAliases(null)
    }
  })

  it('runs uncustomised actions in the browser with the server labels', async () => {
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

    await fireEvent.click(container.querySelector('li[data-index="1"] button[aria-label="Up"]')!)
    expect(store.getValue('members')).toEqual([{ name: 'Bob' }, { name: 'Ann' }])

    await fireEvent.click(
      container.querySelector('li[data-index="1"] button[aria-label="Delete member"]')!,
    )
    expect(store.getValue('members')).toEqual([{ name: 'Bob' }])

    await fireEvent.click(buttonWithText(container, 'Add member'))
    expect(store.getValue('members')).toEqual([{ name: 'Bob' }, { name: null }])
    expect(trigger).not.toHaveBeenCalled()
  })

  it('runs customised and extra item actions on the server with the item key', async () => {
    const { store, container } = renderForm(
      [
        repeater({
          itemActions: { delete: action('delete', { label: 'Delete', server: true }) },
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

    await fireEvent.click(
      container.querySelector('li[data-index="1"] button[aria-label="Delete"]')!,
    )
    expect(trigger).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'delete' }),
      expect.objectContaining({ component: 'field:form::members', arguments: { item: '1' } }),
    )
    expect(store.getValue('members')).toEqual(members.members)

    await fireEvent.click(container.querySelector('li[data-index="1"] button[aria-label="Shout"]')!)
    expect(trigger).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'shout' }),
      expect.objectContaining({ arguments: { item: '1' } }),
    )
    expect(container.querySelector('li[data-index="0"] button[aria-label="Shout"]')).toBeNull()
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

    expect(container.querySelector('li[data-index="0"] button[aria-label="Delete"]')).toBeNull()
    expect(container.querySelector('li[data-index="1"] button[aria-label="Delete"]')).not.toBeNull()
    expect(container.querySelector('button[aria-label="Move up"]')).toBeNull()
    expect(container.querySelector('li[data-index="0"]')!.textContent).toContain('1')
    expect(container.querySelector('[data-slot="item-add-action"]')!.className).toContain(
      'justify-end',
    )
  })

  it('collapses and expands every item', async () => {
    const { container } = renderForm([repeater({ collapsible: true })], members)

    await fireEvent.click(buttonWithText(container, 'Collapse all'))
    const visibleInputs = () =>
      Array.from(container.querySelectorAll('input')).filter((el) => !el.closest('[hidden]'))
    await waitFor(() => expect(visibleInputs()).toHaveLength(0))
    expect(
      container.querySelector('button[aria-label="Expand"]')!.getAttribute('aria-expanded'),
    ).toBe('false')

    await fireEvent.click(buttonWithText(container, 'Expand all'))
    await waitFor(() => expect(visibleInputs()).toHaveLength(2))
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

describe('Builder previews', () => {
  it('shows the preview and opens the form with the edit button or the preview', async () => {
    const { container } = renderForm([builder({ blockPreviews: true })], {
      content: [{ type: 'heading', data: { name: 'Hello' } }],
    })

    const preview = container.querySelector('[data-slot="builder-preview"]') as HTMLElement
    expect(preview.textContent?.trim()).toBe('Hello preview')
    expect(preview.getAttribute('role')).toBe('button')
    expect(container.querySelector('input')).toBeNull()

    await fireEvent.keyDown(preview, { key: 'Enter' })
    await waitFor(() => expect(container.querySelector('input')).not.toBeNull())

    const edit = container.querySelector('button[aria-label="Edit block"]')!
    expect(edit.getAttribute('aria-pressed')).toBe('true')
    await fireEvent.click(edit)
    await waitFor(() => expect(container.querySelector('input')).toBeNull())
  })

  it('renders interactive previews with registered preview components', () => {
    registry.register('builder-preview:hero', HeroPreview)

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
    expect(preview.textContent?.trim()).toBe('Hero Ann')
    expect(preview.getAttribute('role')).toBeNull()
  })
})

describe('KeyValue actions', () => {
  it('uses the customised add label and runs a customised delete on the server', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()
    const { store, container } = renderForm(
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

    await fireEvent.click(container.querySelector('button[aria-label="Drop"]')!)
    expect(trigger).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'delete' }),
      expect.objectContaining({ arguments: { item: '0' } }),
    )

    await fireEvent.click(buttonWithText(container, 'New pair'))
    expect(store.getValue('meta')).toEqual([
      { key: 'a', value: '1' },
      { key: '', value: '' },
    ])
  })

  it('shows extra item actions on items added in the browser (W-S2-04)', async () => {
    const { container } = renderForm(
      [
        repeater({
          items: [{ key: '0', schema: [input('members.0.name')] }],
          extraItemActions: [action('shout', { label: 'Shout', hasAction: true })],
        }),
      ],
      members,
    )
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()

    // The server rendered item 0 without them (hidden for it); item 1 is new.
    expect(container.querySelector('li[data-index="0"] button[aria-label="Shout"]')).toBeNull()
    await fireEvent.click(container.querySelector('li[data-index="1"] button[aria-label="Shout"]')!)
    expect(trigger).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'shout' }),
      expect.objectContaining({ arguments: { item: '1' } }),
    )
  })
})
