import { FilterFormSync, filterFormComponents } from '../src/filters'
import { FormStore } from '../src/form'
import type { SchemaComponent } from '../src/schema/components'

const components: SchemaComponent[] = [
  {
    type: 'TextInput',
    key: 'name',
    name: 'value',
    statePath: 'name.value',
    inputType: 'text',
  } as SchemaComponent,
]

function make(state: Record<string, unknown> = {}) {
  const store = new FormStore(
    { components, state, columns: { default: 1 } },
    { token: '', component: 'table.filters' },
  )

  return { store, sync: new FilterFormSync(store) }
}

describe('FilterFormSync', () => {
  it('keeps text typed while a filter request is in flight', () => {
    const { store, sync } = make()

    store.setValue('name.value', 'ab')
    sync.pushed(store.state.values)
    store.setValue('name.value', 'abc')

    // The response for "ab" arrives while the user already typed "abc".
    sync.receive({ components, state: { name: { value: 'ab' } } })

    expect(store.getValue('name.value')).toBe('abc')
    expect(store.state.dirty.has('name.value')).toBe(true)
  })

  it('adopts the server state once it caught up with what was pushed', () => {
    const { store, sync } = make()

    store.setValue('name.value', 'abc')
    sync.pushed(store.state.values)
    sync.receive({ components, state: { name: { value: 'abc' } } })

    expect(store.getValue('name.value')).toBe('abc')
    expect(store.state.dirty.size).toBe(0)
  })

  it('drops filters removed elsewhere (indicator, reset)', () => {
    const { store, sync } = make({ name: { value: 'abc' } })

    sync.receive({ components, state: {} })

    expect(store.getValue('name.value')).toBeUndefined()
  })

  it('does not overwrite unsent edits on unrelated reloads', () => {
    const { store, sync } = make({ name: { value: 'a' } })

    store.setValue('name.value', 'ab')
    sync.receive({ components, state: { name: { value: 'a' } } })

    expect(store.getValue('name.value')).toBe('ab')
  })
})

describe('filterFormComponents', () => {
  it('wraps filters with a column span in a group', () => {
    const result = filterFormComponents([
      { type: 'Filter', name: 'name', label: 'Name', schema: components },
      {
        type: 'Filter',
        name: 'wide',
        label: 'Wide',
        columnSpan: { default: 'full' },
        schema: components,
      },
    ])

    expect(result[0]).toBe(components[0])
    expect(result[1]).toMatchObject({
      type: 'Group',
      columnSpan: { default: 'full' },
      schema: components,
    })
  })
})
