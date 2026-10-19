import type {
  ActionSchema,
  CalloutSchema,
  GridSchema,
  SchemaComponent,
  SectionSchema,
  TabsSchema,
} from '@alfakit/core'
import { FormStore } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FormProvider } from '../src/components/form/form-context'
import { useSchemaComponentContext } from '../src/components/layout/component-context'
import { CalloutComponent } from '../src/components/layout/elements'
import { GridComponent } from '../src/components/layout/grid'
import { SchemaChildren } from '../src/components/layout/schema-children'
import { SectionComponent } from '../src/components/layout/section'
import { TabsComponent } from '../src/components/layout/tabs'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { Wrapper } from './mocks'

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

describe('schema layout parity', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('renders the section heading at its level', () => {
    render(
      <Wrapper>
        <SectionComponent component={section({ headingLevel: 4 })} />
      </Wrapper>,
    )

    expect(screen.getByRole('heading', { level: 4, name: 'Details' })).toBeInTheDocument()
  })

  it('keeps the h3 heading for servers that send no level', () => {
    render(
      <Wrapper>
        <SectionComponent component={section()} />
      </Wrapper>,
    )

    expect(screen.getByRole('heading', { level: 3, name: 'Details' })).toBeInTheDocument()
  })

  it('restores and stores the collapsed state of a section', () => {
    window.localStorage.setItem('alfakit.section.details', 'collapsed')

    render(
      <Wrapper>
        <SectionComponent
          component={section({ collapsible: true, persistCollapsed: 'alfakit.section.details' })}
        />
      </Wrapper>,
    )

    const toggle = screen.getByRole('button', { name: 'Toggle section' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(window.localStorage.getItem('alfakit.section.details')).toBe('expanded')
  })

  it('renders actions and components after the section header', () => {
    const { container } = render(
      <Wrapper>
        <SectionComponent
          component={section({
            afterHeader: [{ component: text('badge', 'Beta') }, { action: action('edit', 'Edit') }],
          })}
        />
      </Wrapper>,
    )

    const slot = container.querySelector('[data-slot="section-after-header"]')
    expect(slot).toHaveTextContent('Beta')
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('applies dense and gap(false) to the child grid', () => {
    const grid = (overrides: Partial<GridSchema>) =>
      ({ type: 'Grid', key: 'g', schema: [text('a', 'A')], ...overrides }) as GridSchema

    const { container, rerender } = render(
      <Wrapper>
        <GridComponent component={grid({ dense: true })} />
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="schema"]')).toHaveClass('gap-3')

    rerender(
      <Wrapper>
        <GridComponent component={grid({ dense: true, gap: false })} />
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="schema"]')).toHaveClass('gap-0')
    expect(container.querySelector('[data-slot="schema"]')).not.toHaveClass('gap-6')
  })

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

  it('wraps the tab list when tabs are not scrollable', () => {
    const { container } = render(
      <Wrapper>
        <TabsComponent component={tabs({ scrollable: false })} />
      </Wrapper>,
    )

    const list = container.querySelector('[data-slot="tabs-list"]')
    expect(list).toHaveClass('flex-wrap')
    expect(list).not.toHaveClass('overflow-x-auto')
  })

  it.each(['local', 'session'] as const)('persists the active tab in %s storage', (storage) => {
    const store = storage === 'local' ? window.localStorage : window.sessionStorage
    store.setItem('alfakit.tabs.orders', 'two')

    render(
      <Wrapper>
        <TabsComponent component={tabs({ persistTab: { key: 'alfakit.tabs.orders', storage } })} />
      </Wrapper>,
    )

    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'One' }), { button: 0 })

    expect(store.getItem('alfakit.tabs.orders')).toBe('one')
  })

  it('keeps the active tab in the query string under its readable value', async () => {
    window.history.replaceState(null, '', '/admin/orders')

    render(
      <Wrapper>
        <TabsComponent
          component={tabs({
            queryStringKey: 'tab',
            schema: [
              {
                type: 'Tab',
                key: 'tabs-0.tab-0',
                queryValue: 'billing-address',
                label: 'One',
                schema: [],
              },
              {
                type: 'Tab',
                key: 'tabs-0.tab-1',
                queryValue: 'shipping',
                label: 'Two',
                schema: [],
              },
            ],
          })}
        />
      </Wrapper>,
    )

    await waitFor(() => expect(window.location.search).toBe('?tab=billing-address'))

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Two' }), { button: 0 })

    await waitFor(() => expect(window.location.search).toBe('?tab=shipping'))
    window.history.replaceState(null, '', '/')
  })

  it('ignores a stored tab that no longer exists', () => {
    window.localStorage.setItem('alfakit.tabs.orders', 'gone')

    render(
      <Wrapper>
        <TabsComponent
          component={tabs({ persistTab: { key: 'alfakit.tabs.orders', storage: 'local' } })}
        />
      </Wrapper>,
    )

    expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true')
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

    const { container } = render(
      <Wrapper>
        <CalloutComponent component={callout} />
      </Wrapper>,
    )

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
    const { container } = render(
      <Wrapper>
        <SchemaChildren
          component={{
            schema: [text('inner', 'Inner text')],
            columns: { default: 2 },
            dense: true,
          }}
        />
      </Wrapper>,
    )

    expect(screen.getByText('Inner text')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="schema"]')).toHaveClass('grid-cols-2', 'gap-3')
  })

  it('gives custom components their schema context', () => {
    function Probe() {
      const context = useSchemaComponentContext({
        statePath: 'address.city',
        context: { operation: 'edit', recordKey: 7, record: { name: 'Ann' } },
      })

      return (
        <span>
          {`${context.operation}|${context.recordKey}|${String(context.record?.name)}|${String(context.get('street'))}|${String(context.get('title', true))}`}
        </span>
      )
    }

    const store = new FormStore(
      { components: [], state: { title: 'Hi', address: { city: 'Oslo', street: 'Main' } } },
      { token: 't', component: 'form' },
    )

    render(
      <Wrapper>
        <FormProvider store={store}>
          <Probe />
        </FormProvider>
      </Wrapper>,
    )

    expect(screen.getByText('edit|7|Ann|Main|Hi')).toBeInTheDocument()
  })

  it('has no form state outside a form', () => {
    function Probe() {
      const context = useSchemaComponentContext({})

      return <span>{`${String(context.state)}|${String(context.get('title'))}`}</span>
    }

    render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    )

    expect(screen.getByText('null|undefined')).toBeInTheDocument()
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
    const tabsComponent = {
      type: 'Tabs',
      key: 'tabs',
      activeTab: 2,
      schema: [
        { type: 'Tab', key: 'one', label: 'One', schema: [input('email')] },
        { type: 'Tab', key: 'two', label: 'Two', schema: [input('status')] },
      ],
    } as unknown as TabsSchema
    const store = new FormStore(
      { components: [tabsComponent], state: { email: '', status: '' } },
      { token: 't', component: 'form' },
    )

    render(
      <Wrapper>
        <FormProvider store={store}>
          <SchemaRenderer components={[tabsComponent]} />
        </FormProvider>
      </Wrapper>,
    )

    expect(screen.getByRole('tab', { name: /Two/ })).toHaveAttribute('aria-selected', 'true')

    act(() => store.setErrors({ email: 'The email field is required.' }))

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /One/ })).toHaveAttribute('aria-selected', 'true'),
    )
    expect(screen.getByRole('tab', { name: /One/ })).toHaveAttribute('data-invalid')
    expect(screen.getByRole('tab', { name: /One/ }).textContent).toMatch(/has.errors/)
    expect(screen.getByRole('tab', { name: /Two/ })).not.toHaveAttribute('data-invalid')
  })
})
