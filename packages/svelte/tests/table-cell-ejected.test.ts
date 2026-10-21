import { render, screen } from '@testing-library/svelte'
import TableCellContent from '../src/components/table/TableCellContent.svelte'
import { registry } from './mocks'
import Wrapper from './Wrapper.svelte'

// Its own file: the registration below would apply to every TextColumn of the shared registry.
describe('ejected cell renderer', () => {
  it('renders an ejected TableCellContent registered for a column type without calling itself again', () => {
    // `alfakit:eject column:TextColumn` registers the copied dispatcher under its type.
    registry.register('column:TextColumn', TableCellContent)

    render(Wrapper, {
      props: {
        component: TableCellContent,
        props: {
          column: { type: 'TextColumn', name: 'title', label: 'Title' },
          cell: { state: 'Hello' },
          recordKey: 1,
          token: 't',
          component: 'table',
        },
      },
    })

    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
