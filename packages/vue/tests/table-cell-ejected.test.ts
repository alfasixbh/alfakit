import { h } from 'vue'
import TableCellContent from '../src/components/table/TableCellContent.vue'
import { mountWithAlfakit, registry } from './mocks'

// Its own file: the registration below would apply to every TextColumn of the shared registry.
describe('ejected cell renderer', () => {
  it('renders an ejected TableCellContent registered for a column type without calling itself again', () => {
    // `alfakit:eject column:TextColumn` registers the copied dispatcher under its type.
    registry.register('column:TextColumn', TableCellContent)

    const wrapper = mountWithAlfakit(() =>
      h(TableCellContent, {
        column: { type: 'TextColumn', name: 'title', label: 'Title' } as never,
        cell: { state: 'Hello' } as never,
        recordKey: 1,
        token: 't',
        component: 'table',
      }),
    )

    expect(wrapper.text()).toContain('Hello')
    wrapper.unmount()
  })
})
