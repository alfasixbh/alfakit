import type {
  ActionSchema,
  CalloutSchema,
  GridSchema,
  SchemaComponent,
  SectionSchema,
  TabsSchema,
} from '@alfakit/core'
import { FormStore } from '@alfakit/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import CalloutComponent from '../src/components/layout/CalloutComponent.svelte'
import GridComponent from '../src/components/layout/GridComponent.svelte'
import SchemaChildren from '../src/components/layout/SchemaChildren.svelte'
import SectionComponent from '../src/components/layout/SectionComponent.svelte'
import TabsComponent from '../src/components/layout/TabsComponent.svelte'
import ContextFormHarness from './ContextFormHarness.svelte'
import ContextProbe from './ContextProbe.svelte'
import FormHarness from './FormHarness.svelte'
import Wrapper from './Wrapper.svelte'

const text = (key: string, content: string) =>
  ({ type: 'Text', key, content }) as unknown as SchemaComponent

const action = (name: string, label: string) =>
  ({ type: 'Action', name, label, hasAction: true }) as ActionSchema

function section(overrides: Partial<SectionSchema> = {}): SectionSchema {
  return {
    type: 'Section',
    key: 'details',
    heading: 'Details',
    schema: [text('body', 'Section body')],
    ...overrides,
  } as SectionSchema
}

function tabs(overrides: Partial<TabsSchema> = {}): TabsSchema {
  return {
    type: 'Tabs',
    key: 'tabs',
    activeTab: 1,
    schema: [
      { type: 'Tab', key: 'one', label: 'One', schema: [text('a', 'First')] },
      { type: 'Tab', key: 'two', label: 'Two', schema: [text('b', 'Second')] },
    ],
    ...overrides,
  } as TabsSchema
}

function mount(component: unknown, props: Record<string, unknown>) {
  return render(Wrapper, { props: { component: component as never, props } })
}

describe('schema layout parity', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('renders the section heading at its level', () => {
    mount(SectionComponent, { component: section({ headingLevel: 4 }) })

    expect(screen.getByRole('heading', { level: 4, name: 'Details' })).toBeInTheDocument()
  })

  it('keeps the h3 heading for servers that send no level', () => {
    mount(SectionComponent, { component: section() })

    expect(screen.getByRole('heading', { level: 3, name: 'Details' })).toBeInTheDocument()
  })

  it('restores and stores the collapsed state of a section', async () => {
    window.localStorage.setItem('alfakit.section.details', 'collapsed')

    mount(SectionComponent, {
      component: section({ collapsible: true, persistCollapsed: 'alfakit.section.details' }),
    })

    const toggle = screen.getByRole('button', { name: 'Toggle section' })
    await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'false'))

    await fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(window.localStorage.getItem('alfakit.section.details')).toBe('expanded')
  })

  it('renders actions and components after the section header', () => {
    const { container } = mount(SectionComponent, {
      component: section({
        afterHeader: [{ component: text('badge', 'Beta') }, { action: action('edit', 'Edit') }],
      }),
    })

    expect(container.querySelector('[data-slot="section-after-header"]')).toHaveTextContent('Beta')
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it.each([
    [{ dense: true }, 'gap-3'],
    [{ dense: true, gap: false as const }, 'gap-0'],
  ])('applies %o to the child grid', (overrides, expected) => {
    const { container } = mount(GridComponent, {
      component: { type: 'Grid', key: 'g', schema: [text('a', 'A')], ...overrides } as GridSchema,
    })

    const grid = container.querySelector('[data-slot="schema"]')
    expect(grid).toHaveClass(expected)
    expect(grid).not.toHaveClass('gap-6')
  })

  it('wraps the tab list when tabs are not scrollable', () => {
    const { container } = mount(TabsComponent, { component: tabs({ scrollable: false }) })

    const list = container.querySelector('[data-slot="tabs-list"]')
    expect(list).toHaveClass('flex-wrap')
    expect(list).not.toHaveClass('overflow-x-auto')
  })

  it.each(['local', 'session'] as const)(
    'persists the active tab in %s storage',
    async (storage) => {
      const store = storage === 'local' ? window.localStorage : window.sessionStorage
      store.setItem('alfakit.tabs.orders', 'two')

      mount(TabsComponent, {
        component: tabs({ persistTab: { key: 'alfakit.tabs.orders', storage } }),
      })

      await waitFor(() =>
        expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true'),
      )

      await fireEvent.pointerDown(screen.getByRole('tab', { name: 'One' }), { button: 0 })
      await fireEvent.mouseDown(screen.getByRole('tab', { name: 'One' }), { button: 0 })
      await fireEvent.click(screen.getByRole('tab', { name: 'One' }))

      await waitFor(() => expect(store.getItem('alfakit.tabs.orders')).toBe('one'))
    },
  )

  it('keeps the active tab in the query string under its readable value', async () => {
    window.history.replaceState(null, '', '/admin/orders')

    mount(TabsComponent, {
      component: tabs({
        queryStringKey: 'tab',
        schema: [
          {
            type: 'Tab',
            key: 'tabs-0.tab-0',
            queryValue: 'billing-address',
            label: 'One',
            schema: [],
          },
          { type: 'Tab', key: 'tabs-0.tab-1', queryValue: 'shipping', label: 'Two', schema: [] },
        ],
      }),
    })

    await waitFor(() => expect(window.location.search).toBe('?tab=billing-address'))

    await fireEvent.pointerDown(screen.getByRole('tab', { name: 'Two' }), { button: 0 })
    await fireEvent.mouseDown(screen.getByRole('tab', { name: 'Two' }), { button: 0 })
    await fireEvent.click(screen.getByRole('tab', { name: 'Two' }))

    await waitFor(() => expect(window.location.search).toBe('?tab=shipping'))
    window.history.replaceState(null, '', '/')
  })

  it('renders callout icon size, footer alignment and controls', async () => {
    const callout = {
      type: 'Callout',
      key: 'tip',
      heading: 'Tip',
      icon: 'download',
      iconSize: 'lg',
      actions: [action('upgrade', 'Upgrade')],
      footerActionsAlignment: 'end',
      controls: [{ action: action('dismiss', 'Dismiss') }],
    } as unknown as CalloutSchema

    const { container } = mount(CalloutComponent, { component: callout })

    await waitFor(() =>
      expect(container.querySelector('[data-slot="callout-icon"] svg')).toHaveClass('size-6'),
    )
    expect(
      screen.getByRole('button', { name: 'Upgrade' }).closest('[data-slot="actions"]'),
    ).toHaveClass('justify-end')
    expect(container.querySelector('[data-slot="callout-controls"]')).toContainElement(
      screen.getByRole('button', { name: 'Dismiss' }),
    )
  })

  it('renders a custom component child schema with SchemaChildren', () => {
    const { container } = mount(SchemaChildren, {
      component: { schema: [text('inner', 'Inner text')], columns: { default: 2 }, dense: true },
    })

    expect(screen.getByText('Inner text')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="schema"]')).toHaveClass('grid-cols-2', 'gap-3')
  })

  it('gives custom components their schema context', () => {
    const store = new FormStore(
      { components: [], state: { title: 'Hi', address: { city: 'Oslo', street: 'Main' } } },
      { token: 't', component: 'form' },
    )

    mount(ContextFormHarness, {
      store,
      statePath: 'address.city',
      context: { operation: 'edit', recordKey: 7, record: { name: 'Ann' } },
    })

    expect(screen.getByTestId('probe')).toHaveTextContent('edit|7|Ann|Main|Hi|false')
  })

  it('has no form state outside a form', () => {
    mount(ContextProbe, {})

    expect(screen.getByTestId('probe')).toHaveTextContent('||undefined|undefined|undefined|true')
  })
  it('marks tabs holding fields with errors and opens the first one when errors arrive', async () => {
    const input = (name: string) =>
      ({
        type: 'TextInput',
        key: name,
        name,
        statePath: name,
        label: name,
        inputType: 'text',
      }) as unknown as SchemaComponent
    const store = new FormStore(
      {
        components: [
          tabs({
            activeTab: 2,
            schema: [
              { type: 'Tab', key: 'one', label: 'One', schema: [input('email')] },
              { type: 'Tab', key: 'two', label: 'Two', schema: [input('status')] },
            ],
          } as Partial<TabsSchema>),
        ],
        state: { email: '', status: '' },
      },
      { token: 't', component: 'form' },
    )

    render(Wrapper, { props: { component: FormHarness, props: { store } } })

    expect(screen.getByRole('tab', { name: /Two/ })).toHaveAttribute('aria-selected', 'true')

    store.setErrors({ email: 'The email field is required.' })

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /One/ })).toHaveAttribute('aria-selected', 'true'),
    )
    expect(screen.getByRole('tab', { name: /One/ })).toHaveAttribute('data-invalid')
    expect(screen.getByRole('tab', { name: /One/ }).textContent).toMatch(/has.errors/)
    expect(screen.getByRole('tab', { name: /Two/ })).not.toHaveAttribute('data-invalid')

    // Errors in the open tab too: stay on it.
    await fireEvent.click(screen.getByRole('tab', { name: /Two/ }))
    store.setErrors({ email: 'Required', status: 'Required' })
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Two/ })).toHaveAttribute('data-invalid'),
    )
    expect(screen.getByRole('tab', { name: /Two/ })).toHaveAttribute('aria-selected', 'true')
  })
})
