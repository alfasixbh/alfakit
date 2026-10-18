import { FormStore, type SchemaComponent } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import { actions, mountWithAlfakit, registry } from './mocks'

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
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return () => h(SchemaRenderer, { components })
    },
  })

  return { store, wrapper: mountWithAlfakit(() => h(Form)) }
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
  it('runs uncustomised actions in the browser with the server labels', async () => {
    const { store, wrapper } = renderForm(
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

    await wrapper.find('li[data-index="1"] button[aria-label="Up"]').trigger('click')
    expect(store.getValue('members')).toEqual([{ name: 'Bob' }, { name: 'Ann' }])

    await wrapper.find('li[data-index="1"] button[aria-label="Delete member"]').trigger('click')
    expect(store.getValue('members')).toEqual([{ name: 'Bob' }])

    const add = wrapper.findAll('button').find((button) => button.text().includes('Add member'))
    await add!.trigger('click')
    expect(store.getValue('members')).toEqual([{ name: 'Bob' }, { name: null }])
    expect(trigger).not.toHaveBeenCalled()
  })

  it('runs customised and extra item actions on the server with the item key', async () => {
    const { store, wrapper } = renderForm(
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

    await wrapper.find('li[data-index="1"] button[aria-label="Delete"]').trigger('click')
    expect(trigger).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'delete' }),
      expect.objectContaining({ component: 'field:form::members', arguments: { item: '1' } }),
    )
    expect(store.getValue('members')).toEqual(members.members)

    await wrapper.find('li[data-index="1"] button[aria-label="Shout"]').trigger('click')
    expect(trigger).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'shout' }),
      expect.objectContaining({ arguments: { item: '1' } }),
    )
    expect(wrapper.find('li[data-index="0"] button[aria-label="Shout"]').exists()).toBe(false)
  })

  it('hides actions per item and honours the reorder, number and alignment options', () => {
    const { wrapper } = renderForm(
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

    expect(wrapper.find('li[data-index="0"] button[aria-label="Delete"]').exists()).toBe(false)
    expect(wrapper.find('li[data-index="1"] button[aria-label="Delete"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Move up"]').exists()).toBe(false)
    expect(wrapper.find('li[data-index="0"]').text()).toContain('1')
    expect(wrapper.find('[data-slot="item-add-action"]').classes()).toContain('justify-end')
  })

  it('collapses and expands every item', async () => {
    const { wrapper } = renderForm([repeater({ collapsible: true })], members)
    const button = (text: string) => wrapper.findAll('button').find((b) => b.text() === text)!

    await button('Collapse all').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('input')).toHaveLength(0)
    expect(wrapper.find('button[aria-label="Expand"]').attributes('aria-expanded')).toBe('false')

    await button('Expand all').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('input')).toHaveLength(2)
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
    const { wrapper } = renderForm([builder({ blockPreviews: true })], {
      content: [{ type: 'heading', data: { name: 'Hello' } }],
    })

    const preview = wrapper.find('[data-slot="builder-preview"]')
    expect(preview.text()).toBe('Hello preview')
    expect(preview.attributes('role')).toBe('button')
    expect(wrapper.find('input').exists()).toBe(false)

    await preview.trigger('keydown', { key: 'Enter' })
    expect(wrapper.find('input').exists()).toBe(true)

    const edit = wrapper.find('button[aria-label="Edit block"]')
    expect(edit.attributes('aria-pressed')).toBe('true')
    await edit.trigger('click')
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('renders interactive previews with registered preview components', () => {
    registry.register(
      'builder-preview:hero',
      defineComponent({
        props: { data: { type: Object, required: true } },
        setup: (props) => () => h('strong', `Hero ${(props.data as { name: string }).name}`),
      }),
    )

    const { wrapper } = renderForm(
      [
        builder({
          blockPreviews: true,
          interactivePreviews: true,
          items: [{ key: '0', type: 'heading', previewComponent: 'hero', schema: [] }],
        }),
      ],
      { content: [{ type: 'heading', data: { name: 'Ann' } }] },
    )

    const preview = wrapper.find('[data-slot="builder-preview"]')
    expect(preview.text()).toBe('Hero Ann')
    expect(preview.attributes('role')).toBeUndefined()
  })
})

describe('KeyValue actions', () => {
  it('uses the customised add label and runs a customised delete on the server', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()
    const { store, wrapper } = renderForm(
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

    await wrapper.find('button[aria-label="Drop"]').trigger('click')
    expect(trigger).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'delete' }),
      expect.objectContaining({ arguments: { item: '0' } }),
    )

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('New pair'))!
      .trigger('click')
    expect(store.getValue('meta')).toEqual([
      { key: 'a', value: '1' },
      { key: '', value: '' },
    ])
  })
})
