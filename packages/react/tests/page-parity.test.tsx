import type {
  ChartWidgetSchema,
  FormBlock as FormBlockSchema,
  PageSchema,
  RelationManagersBlock,
  SchemaComponent,
  WizardSchema,
} from '@alfakit/core'
import { router } from '@inertiajs/react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { FormBlock } from '../src/components/form/form-block'
import { ListTabs } from '../src/components/table/list-tabs'
import { WidgetRenderer } from '../src/components/widgets/widgets-block'
import { AlfakitPage, ContentBlockRenderer } from '../src/pages/page'
import { Wrapper, actions, setPageProps } from './mocks'

vi.mock('chart.js', () => {
  class Chart {
    static register() {}
    update() {}
    destroy() {}
  }

  return { Chart, registerables: [] }
})

const pageSchema = (overrides: Partial<PageSchema> = {}): PageSchema => ({
  class: 'App\\EditPost',
  layout: 'blank',
  title: 'Edit',
  content: [],
  token: 'tok',
  record: 1,
  ...overrides,
})

const textInput = (name: string, label: string) =>
  ({
    type: 'TextInput',
    key: name,
    name,
    statePath: name,
    label,
    inputType: 'text',
  }) as SchemaComponent

const formBlock = (overrides: Partial<FormBlockSchema> = {}): FormBlockSchema => ({
  type: 'Form',
  key: 'form',
  component: 'form',
  components: [textInput('title', 'Title'), textInput('status', 'Status')],
  state: { title: 'Hello', status: 'draft' },
  actions: [{ type: 'Action', name: 'save', label: 'Save', hasAction: true }],
  operation: 'edit',
  ...overrides,
})

afterEach(() => {
  vi.restoreAllMocks()
  setPageProps({ page: undefined, alfakitTabBadges: undefined })
  window.history.replaceState(null, '', '/')
})

describe('default actions', () => {
  it('opens the default action once after the page hydrated and cleans the URL', () => {
    window.history.replaceState(null, '', '/admin/posts?tableAction=publish&tableActionRecord=7')
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined)
    const page = pageSchema({
      defaultAction: {
        action: { type: 'Action', name: 'publish', hasModal: true },
        component: 'table',
        record: 7,
      },
    })
    setPageProps({ page })

    const { rerender } = render(
      <Wrapper>
        <AlfakitPage />
      </Wrapper>,
    )

    expect(trigger).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'publish' }), {
      token: 'tok',
      component: 'table',
      record: 7,
    })
    expect(window.location.search).toBe('')

    // Redirected back after the action ran: same page, new token.
    setPageProps({ page: { ...page, token: 'tok2' } })
    rerender(
      <Wrapper>
        <AlfakitPage />
      </Wrapper>,
    )

    expect(trigger).toHaveBeenCalledTimes(1)
  })
})

describe('page form', () => {
  it('is submitted by a button with formId elsewhere on the page', async () => {
    setPageProps({ page: pageSchema() })
    const execute = vi.spyOn(actions, 'execute').mockImplementation(() => undefined)

    render(
      <Wrapper>
        <FormBlock block={formBlock()} />
      </Wrapper>,
    )

    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Typed' } })

    await act(() =>
      actions.trigger(
        { type: 'Action', name: 'save', formId: 'form', hasAction: true },
        { token: 'tok', component: 'page' },
      ),
    )

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'save' }),
      { token: 'tok', component: 'page' },
      { title: 'Typed', status: 'draft' },
    )
  })

  it('copies refreshed fields from the flash and keeps other edits', () => {
    setPageProps({ page: pageSchema() })
    const handlers: Array<(event: unknown) => void> = []
    vi.spyOn(router, 'on').mockImplementation(((
      name: string,
      handler: (event: unknown) => void,
    ) => {
      if (name === 'success') handlers.push(handler)

      return () => {}
    }) as typeof router.on)

    render(
      <Wrapper>
        <FormBlock block={formBlock()} />
      </Wrapper>,
    )

    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Typed' } })

    act(() => {
      for (const handler of handlers) {
        handler({
          detail: {
            page: {
              props: {},
              flash: { alfakitFormRefresh: { component: 'form', state: { status: 'published' } } },
            },
          },
        })
      }
    })

    expect((screen.getByLabelText(/Status/) as HTMLInputElement).value).toBe('published')
    expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe('Typed')
  })

  it('shows the buttons of a wizard form on the last step only', async () => {
    setPageProps({ page: pageSchema({ class: 'App\\CreateOrder', record: undefined }) })
    const wizard = {
      type: 'Wizard',
      key: 'wizard',
      startStep: 1,
      nextActionLabel: 'Next',
      previousActionLabel: 'Back',
      schema: [
        { type: 'Step', key: 'one', label: 'One', schema: [textInput('title', 'Title')] },
        { type: 'Step', key: 'two', label: 'Two', schema: [textInput('status', 'Status')] },
      ],
    } as unknown as WizardSchema

    render(
      <Wrapper>
        <FormBlock block={formBlock({ components: [wizard], wizard: true, operation: 'create' })} />
      </Wrapper>,
    )

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})

describe('list tabs', () => {
  it('shows deferred badges once loaded and renders extra attributes', () => {
    const tabs = [
      { key: 'all', label: 'All' },
      {
        key: 'open',
        label: 'Open',
        badgeDeferred: true,
        extraAttributes: { 'data-tab': 'open', class: 'italic' },
      },
    ]

    const { rerender } = render(
      <Wrapper>
        <ListTabs tabs={tabs} activeTab="all" label="Posts" />
      </Wrapper>,
    )

    const tab = screen.getByRole('tab', { name: /Open/ })

    expect(tab).toHaveAttribute('data-tab', 'open')
    expect(tab).toHaveClass('italic', 'rounded-md')
    expect(tab.querySelector('[aria-busy="true"]')).not.toBeNull()

    setPageProps({ alfakitTabBadges: { open: { badge: 12, badgeColor: 'danger' } } })
    rerender(
      <Wrapper>
        <ListTabs tabs={tabs} activeTab="all" label="Posts" />
      </Wrapper>,
    )

    expect(screen.getByRole('tab', { name: /Open/ })).toHaveTextContent('12')
    expect(screen.getByRole('tab', { name: /Open/ }).querySelector('[aria-busy]')).toBeNull()
  })
})

describe('relation manager tabs', () => {
  it('renders badge colours and tooltips', () => {
    const table = { columns: [] } as unknown as RelationManagersBlock['managers'][number]
    const block: RelationManagersBlock = {
      type: 'RelationManagers',
      key: 'relationManagers',
      managers: [
        {
          ...(table as object),
          type: 'RelationManager',
          key: 'a',
          component: 'a',
          title: 'Comments',
          badge: '3',
          badgeColor: 'danger',
          badgeTooltip: 'Unanswered',
          lazy: true,
        },
        {
          ...(table as object),
          type: 'RelationManager',
          key: 'b',
          component: 'b',
          title: 'Tags',
          lazy: true,
        },
      ] as RelationManagersBlock['managers'],
    }

    render(
      <Wrapper>
        <ContentBlockRenderer block={block} />
      </Wrapper>,
    )

    const badge = screen.getByTitle('Unanswered')

    expect(badge).toHaveTextContent('3')
    expect(badge.className).toMatch(/destructive/)
  })
})

describe('chart widget', () => {
  const chart = (overrides: Partial<ChartWidgetSchema> = {}): ChartWidgetSchema => ({
    type: 'Chart',
    key: 'orders',
    id: 'orders',
    columnSpan: { default: 1 },
    chartType: 'bar',
    heading: 'Orders',
    data: { datasets: [{ data: [1] }] },
    ...overrides,
  })

  it('shows the empty state instead of the chart', async () => {
    render(
      <Wrapper>
        <WidgetRenderer
          widget={chart({
            empty: true,
            data: {},
            emptyState: { heading: 'No orders yet', description: 'Come back later' },
          })}
        />
      </Wrapper>,
    )

    expect(await screen.findByText('No orders yet')).toBeInTheDocument()
    expect(screen.getByText('Come back later')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('collapses to its header', async () => {
    render(
      <Wrapper>
        <WidgetRenderer widget={chart({ collapsible: true })} />
      </Wrapper>,
    )

    await screen.findByRole('img')
    const toggle = screen.getByRole('button', { name: 'Toggle section' })

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('applies deferred filters to the query string on "Apply"', async () => {
    render(
      <Wrapper>
        <WidgetRenderer
          widget={chart({
            filtersForm: {
              components: [textInput('range', 'Range')],
              state: { range: 'week' },
              deferred: true,
              queryKey: 'chartFilters',
            },
          })}
        />
      </Wrapper>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Filters' }))
    fireEvent.change(await screen.findByLabelText(/Range/), { target: { value: 'month' } })
    expect(router.visit).not.toHaveBeenCalledWith(
      expect.stringContaining('month'),
      expect.anything(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(router.visit).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('chartFilters[orders][range]') + '=month'),
      expect.objectContaining({ preserveState: true }),
    )
  })
})
