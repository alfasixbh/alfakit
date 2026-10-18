import type {
  ChartWidgetSchema,
  FormBlock as FormBlockSchema,
  PageSchema,
  RelationManagersBlock,
  SchemaComponent,
  WizardSchema,
} from '@alfakit/core'
import { router } from '@inertiajs/svelte'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import FormBlock from '../src/components/form/FormBlock.svelte'
import ListTabs from '../src/components/table/ListTabs.svelte'
import ChartWidget from '../src/components/widgets/ChartWidget.svelte'
import AlfakitPage from '../src/pages/AlfakitPage.svelte'
import RelationManagers from '../src/pages/RelationManagers.svelte'
import { actions, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

vi.mock('chart.js', () => {
  class Chart {
    static register() {}
    data = {}
    options = {}
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
  it('opens the default action after the page mounted and cleans the URL', async () => {
    window.history.replaceState(null, '', '/admin/posts?tableAction=publish&tableActionRecord=3')
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined)
    setPageProps({
      page: pageSchema({
        defaultAction: {
          action: { type: 'Action', name: 'publish', hasModal: true },
          component: 'table',
          record: 3,
        },
      }),
    })

    render(Wrapper, { props: { component: AlfakitPage } })
    await tick()

    expect(trigger).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'publish' }), {
      token: 'tok',
      component: 'table',
      record: 3,
    })
    expect(window.location.search).toBe('')
  })
})

describe('page form', () => {
  it('is submitted by a button with formId elsewhere on the page', async () => {
    setPageProps({ page: pageSchema() })
    const execute = vi.spyOn(actions, 'execute').mockImplementation(() => undefined)

    render(Wrapper, { props: { component: FormBlock, props: { block: formBlock() } } })
    await tick()
    await fireEvent.input(screen.getByLabelText(/Title/), { target: { value: 'Typed' } })

    await actions.trigger(
      { type: 'Action', name: 'save', formId: 'form', hasAction: true },
      { token: 'tok', component: 'page' },
    )

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'save' }),
      { token: 'tok', component: 'page' },
      { title: 'Typed', status: 'draft' },
    )
  })

  it('copies refreshed fields from the flash and keeps other edits', async () => {
    setPageProps({ page: pageSchema() })
    const handlers: Array<(event: unknown) => void> = []
    vi.spyOn(router, 'on').mockImplementation(((
      name: string,
      handler: (event: unknown) => void,
    ) => {
      if (name === 'success') handlers.push(handler)

      return () => {}
    }) as typeof router.on)

    render(Wrapper, { props: { component: FormBlock, props: { block: formBlock() } } })
    await fireEvent.input(screen.getByLabelText(/Title/), { target: { value: 'Typed' } })

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

    await tick()

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

    render(Wrapper, {
      props: {
        component: FormBlock,
        props: { block: formBlock({ components: [wizard], wizard: true, operation: 'create' }) },
      },
    })
    await tick()

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})

describe('list tabs', () => {
  const tabs = [
    { key: 'all', label: 'All' },
    {
      key: 'open',
      label: 'Open',
      badgeDeferred: true,
      extraAttributes: { 'data-tab': 'open', class: 'italic' },
    },
  ]

  it('shows a placeholder until the deferred badge arrives and renders extra attributes', () => {
    render(Wrapper, { props: { component: ListTabs, props: { tabs, activeTab: 'all' } } })
    const tab = screen.getByRole('tab', { name: /Open/ })

    expect(tab).toHaveAttribute('data-tab', 'open')
    expect(tab).toHaveClass('italic', 'rounded-md')
    expect(tab.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('shows the deferred badge once loaded', () => {
    setPageProps({ alfakitTabBadges: { open: { badge: 12, badgeColor: 'danger' } } })
    render(Wrapper, { props: { component: ListTabs, props: { tabs, activeTab: 'all' } } })

    expect(screen.getByRole('tab', { name: /Open/ })).toHaveTextContent('12')
  })
})

describe('relation manager tabs', () => {
  it('renders badge colours and tooltips', () => {
    const block = {
      type: 'RelationManagers',
      key: 'relationManagers',
      managers: [
        {
          type: 'RelationManager',
          key: 'a',
          component: 'a',
          title: 'Comments',
          badge: '3',
          badgeColor: 'danger',
          badgeTooltip: 'Unanswered',
          lazy: true,
        },
        { type: 'RelationManager', key: 'b', component: 'b', title: 'Tags', lazy: true },
      ],
    } as unknown as RelationManagersBlock

    render(Wrapper, { props: { component: RelationManagers, props: { block } } })
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

  it('shows the empty state instead of the chart', () => {
    render(Wrapper, {
      props: {
        component: ChartWidget,
        props: {
          widget: chart({ empty: true, data: {}, emptyState: { heading: 'No orders yet' } }),
        },
      },
    })

    expect(screen.getByText('No orders yet')).toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })

  it('collapses to its header', async () => {
    render(Wrapper, {
      props: { component: ChartWidget, props: { widget: chart({ collapsible: true }) } },
    })
    const toggle = screen.getByRole('button', { name: 'Toggle section' })

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(document.querySelector('canvas')).toBeNull()
  })

  it('renders a filters button for a filters form', () => {
    render(Wrapper, {
      props: {
        component: ChartWidget,
        props: {
          widget: chart({
            filtersForm: {
              components: [textInput('range', 'Range')],
              state: { range: 'week' },
              deferred: true,
              queryKey: 'chartFilters',
            },
          }),
        },
      },
    })

    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
  })
})
