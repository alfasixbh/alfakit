import { FormStore, type SchemaComponent, type TableSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import TablePagination from '../src/components/table/TablePagination.svelte'
import FormHarness from './FormHarness.svelte'
import { context, panel, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

afterEach(() => {
  setPageProps({ alfakit: panel })
  context.translator.setTranslations(panel.translations)
})

describe('localization', () => {
  it('parses and rounds money typed in the user locale', async () => {
    setPageProps({
      alfakit: {
        ...panel,
        localization: { ...panel.localization, code: 'de', tag: 'de', currency: 'EUR' },
      },
    })

    const components: SchemaComponent[] = [
      {
        type: 'MoneyInput',
        key: 'price',
        name: 'price',
        statePath: 'price',
        label: 'Price',
        currency: 'EUR',
        decimals: 2,
      } as SchemaComponent,
    ]
    const store = new FormStore(
      { components, state: { price: null } },
      { token: 't', component: 'form' },
    )

    render(Wrapper, { props: { component: FormHarness, props: { store } } })

    const input = screen.getByLabelText(/Price/) as HTMLInputElement
    expect(input).toHaveAttribute('dir', 'ltr')
    expect(input).toHaveAttribute('inputmode', 'decimal')
    expect(screen.getByText('€')).toBeInTheDocument()

    await fireEvent.focus(input)
    await fireEvent.input(input, { target: { value: '1.234,5' } })
    expect(store.getValue('price')).toBe('1234.5')

    await fireEvent.blur(input)
    expect(store.getValue('price')).toBe('1234.50')
    expect(input.value).toBe('1.234,50')
  })

  it('renders aria-labels from the provided translations', () => {
    context.translator.setTranslations({
      ...panel.translations,
      pagination: 'ترقيم الصفحات',
      table: { previous: 'السابق', next: 'التالي' },
    })

    const table = {
      identifier: 'posts',
      pagination: {
        currentPage: 1,
        lastPage: 3,
        perPage: 10,
        total: 30,
        from: 1,
        to: 10,
        pageOptions: [10],
        simple: false,
      },
    } as unknown as TableSchema

    render(Wrapper, { props: { component: TablePagination, props: { table } } })

    expect(screen.getByRole('navigation', { name: 'ترقيم الصفحات' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'السابق' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'التالي' })).toBeEnabled()
  })
})
