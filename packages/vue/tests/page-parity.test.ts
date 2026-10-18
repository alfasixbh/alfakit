import type {
  ChartWidgetSchema,
  FormBlock as FormBlockSchema,
  PageSchema,
  RelationManagersBlock,
  SchemaComponent,
  WizardSchema,
} from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { h } from 'vue'
import FormBlock from '../src/components/form/FormBlock.vue'
import ListTabs from '../src/components/table/ListTabs.vue'
import ChartWidget from '../src/components/widgets/ChartWidget.vue'
import AlfakitPage from '../src/pages/AlfakitPage.vue'
import RelationManagers from '../src/pages/RelationManagers.vue'
import { actions, flush, mountWithAlfakit, setPageProps } from './mocks'

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
  document.body.innerHTML = ''
})

describe('default actions', () => {
  it('opens the default action after the page mounted and cleans the URL', async () => {
    window.history.replaceState(null, '', '/admin/posts?defaultAction=rename&x=1')
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined)
    setPageProps({
      page: pageSchema({
        defaultAction: {
          action: { type: 'Action', name: 'rename', hasModal: true },
          component: 'page',
        },
      }),
    })

    mountWithAlfakit(() => h(AlfakitPage))
    await flush()

    expect(trigger).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'rename' }), {
      token: 'tok',
      component: 'page',
    })
    expect(window.location.search).toBe('?x=1')
  })
})

describe('page form', () => {
  it('is submitted by a button with formId elsewhere on the page', async () => {
    setPageProps({ page: pageSchema() })
    const execute = vi.spyOn(actions, 'execute').mockImplementation(() => undefined)
    const wrapper = mountWithAlfakit(() => h(FormBlock, { block: formBlock() }))

    await wrapper.find('input').setValue('Typed')
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

    const wrapper = mountWithAlfakit(() => h(FormBlock, { block: formBlock() }))
    const [title, status] = wrapper.findAll('input')

    await title!.setValue('Typed')

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

    await flush()

    expect((status!.element as HTMLInputElement).value).toBe('published')
    expect((title!.element as HTMLInputElement).value).toBe('Typed')
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

    const wrapper = mountWithAlfakit(() =>
      h(FormBlock, {
        block: formBlock({ components: [wizard], wizard: true, operation: 'create' }),
      }),
    )
    await flush()

    expect(wrapper.find('[data-slot="form-actions"]').exists()).toBe(false)

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Next')!
      .trigger('click')
    await flush()

    expect(wrapper.find('[data-slot="form-actions"]').exists()).toBe(true)
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
    const wrapper = mountWithAlfakit(() => h(ListTabs, { tabs, activeTab: 'all', label: 'Posts' }))
    const tab = wrapper.find('[data-tab="open"]')

    expect(tab.classes()).toEqual(expect.arrayContaining(['italic', 'rounded-md']))
    expect(tab.find('[aria-busy="true"]').exists()).toBe(true)
  })

  it('shows the deferred badge once loaded', () => {
    setPageProps({ alfakitTabBadges: { open: { badge: 12, badgeColor: 'danger' } } })
    const wrapper = mountWithAlfakit(() => h(ListTabs, { tabs, activeTab: 'all', label: 'Posts' }))
    const tab = wrapper.find('[data-tab="open"]')

    expect(tab.text()).toContain('12')
    expect(tab.find('[aria-busy]').exists()).toBe(false)
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

    const wrapper = mountWithAlfakit(() => h(RelationManagers, { block }))
    const badge = wrapper.find('[title="Unanswered"]')

    expect(badge.text()).toContain('3')
    expect(badge.classes().join(' ')).toMatch(/destructive/)
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
    const wrapper = mountWithAlfakit(() =>
      h(ChartWidget, {
        widget: chart({ empty: true, data: {}, emptyState: { heading: 'No orders yet' } }),
      }),
    )

    expect(wrapper.text()).toContain('No orders yet')
    expect(wrapper.find('canvas').exists()).toBe(false)
  })

  it('collapses to its header', async () => {
    const wrapper = mountWithAlfakit(() => h(ChartWidget, { widget: chart({ collapsible: true }) }))
    const toggle = wrapper.find('button[aria-label="Toggle section"]')

    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('canvas').exists()).toBe(false)
  })

  it('renders a filters button for a filters form', () => {
    const wrapper = mountWithAlfakit(() =>
      h(ChartWidget, {
        widget: chart({
          filtersForm: {
            components: [textInput('range', 'Range')],
            state: { range: 'week' },
            deferred: true,
            queryKey: 'chartFilters',
          },
        }),
      }),
    )

    expect(wrapper.find('[data-slot="chart-filters-trigger"]').attributes('aria-label')).toBe(
      'Filters',
    )
  })
})
