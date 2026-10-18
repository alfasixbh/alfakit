import type {
  CalloutSchema,
  EmptyStateComponentSchema,
  FieldsetSchema,
  SchemaComponent,
  SectionSchema,
  TabsSchema,
  TextEntrySchema,
  TextSchema,
} from '@alfakit/core'
import { FormStore } from '@alfakit/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TextEntryComponent } from '../src/components/entries/text-entry'
import { FormProvider } from '../src/components/form/form-context'
import { CalloutComponent, EmptyStateComponent } from '../src/components/layout/elements'
import { FieldsetComponent } from '../src/components/layout/fieldset'
import { TextComponent } from '../src/components/layout/prime'
import { SectionComponent } from '../src/components/layout/section'
import { TabsComponent } from '../src/components/layout/tabs'
import { panel, setPageProps, Wrapper } from './mocks'

const text = (key: string, content: string) =>
  ({ type: 'Text', key, content }) as unknown as SchemaComponent

const requests: { url: string; body: Record<string, unknown> }[] = []

beforeEach(() => {
  requests.length = 0
  setPageProps({ alfakit: { ...panel, endpoints: { ...panel.endpoints, schemaDeferred: '/d' } } })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>
      requests.push({ url, body })
      const payload =
        body.only === 'badge'
          ? { badge: { badge: 5, badgeColor: 'danger' } }
          : {
              component: {
                type: 'Section',
                key: String(body.component).split('::')[1],
                heading: 'Details',
                schema: [text('loaded', 'Loaded body')],
              },
            }

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  setPageProps({ alfakit: panel })
})

describe('deferred schemas', () => {
  it('shows a skeleton, then loads the children of an infolist section', async () => {
    render(
      <Wrapper>
        <SectionComponent
          component={
            {
              type: 'Section',
              key: 'summary',
              heading: 'Details',
              deferred: true,
              schema: [],
            } as SectionSchema
          }
        />
      </Wrapper>,
    )

    expect(document.querySelector('[data-slot="deferred-schema"]')).toHaveAttribute(
      'aria-busy',
      'true',
    )
    expect(await screen.findByText('Loaded body')).toBeInTheDocument()
    expect(requests[0]).toMatchObject({ url: '/d', body: { component: 'infolist::summary' } })
    expect(document.querySelector('[data-slot="deferred-schema"]')).toBeNull()
  })

  it('merges a loaded component into the form with the form state', async () => {
    const form = new FormStore(
      {
        components: [
          {
            type: 'Section',
            key: 'details',
            deferred: true,
            deferredPaths: ['slug'],
            schema: [],
          } as SectionSchema,
        ],
        state: { slug: 'a' },
      },
      { token: 'tok', component: 'form' },
    )

    function Form() {
      return (
        <FormProvider store={form}>
          <SectionComponent component={form.state.components[0] as SectionSchema} />
        </FormProvider>
      )
    }

    render(
      <Wrapper>
        <Form />
      </Wrapper>,
    )

    await waitFor(() => expect(form.state.components[0]!.schema![0]!.key).toBe('loaded'))
    expect(requests[0]!.body).toMatchObject({
      token: 'tok',
      component: 'form::details',
      state: { slug: 'a' },
    })
  })

  it('loads deferred tab badges', async () => {
    const tabs = {
      type: 'Tabs',
      key: 'tabs',
      activeTab: 1,
      schema: [
        { type: 'Tab', key: 'meta', label: 'Meta', badgeDeferred: true, schema: [text('a', 'A')] },
      ],
    } as unknown as TabsSchema

    render(
      <Wrapper>
        <TabsComponent component={tabs} />
      </Wrapper>,
    )

    expect(await screen.findByText('5')).toBeInTheDocument()
    expect(requests[0]!.body).toMatchObject({ component: 'infolist::meta', only: 'badge' })
  })
})

describe('schema layout parity (round 3)', () => {
  it('renders an uncontained fieldset', () => {
    const { container } = render(
      <Wrapper>
        <FieldsetComponent
          component={
            {
              type: 'Fieldset',
              key: 'f',
              label: 'Address',
              contained: false,
              schema: [text('x', 'X')],
            } as FieldsetSchema
          }
        />
      </Wrapper>,
    )

    const fieldset = container.querySelector('fieldset')!
    expect(fieldset).toHaveAttribute('data-contained', 'false')
    expect(fieldset.className).not.toContain('border')
  })

  it('renders footer components in sections, callouts and empty states', () => {
    render(
      <Wrapper>
        <SectionComponent
          component={
            {
              type: 'Section',
              key: 's',
              heading: 'S',
              schema: [],
              footer: [{ component: text('sf', 'Section footer') }],
            } as unknown as SectionSchema
          }
        />
        <CalloutComponent
          component={
            {
              type: 'Callout',
              key: 'c',
              heading: 'C',
              footer: [{ component: text('cf', 'Callout footer') }],
            } as unknown as CalloutSchema
          }
        />
        <EmptyStateComponent
          component={
            {
              type: 'EmptyState',
              key: 'e',
              contained: true,
              footer: [{ component: text('ef', 'Empty footer') }],
            } as unknown as EmptyStateComponentSchema
          }
        />
      </Wrapper>,
    )

    expect(
      screen.getByText('Section footer').closest('[data-slot="section-footer"]'),
    ).not.toBeNull()
    expect(screen.getByText('Callout footer')).toBeInTheDocument()
    expect(screen.getByText('Empty footer')).toBeInTheDocument()
  })

  it('keeps the status colour and alert role of a callout without colour', async () => {
    const { container } = render(
      <Wrapper>
        <CalloutComponent
          component={
            {
              type: 'Callout',
              key: 'c',
              heading: 'Careful',
              icon: 'circle-x',
              status: 'danger',
            } as CalloutSchema
          }
        />
        <CalloutComponent
          component={
            {
              type: 'Callout',
              key: 'd',
              heading: 'Tip',
              icon: 'info',
              color: 'info',
              iconColor: 'success',
            } as CalloutSchema
          }
        />
      </Wrapper>,
    )

    const [danger, info] = container.querySelectorAll('[data-slot="callout"]')
    expect(danger).toHaveAttribute('role', 'alert')
    await waitFor(() =>
      expect(container.querySelectorAll('[data-slot="callout-icon"] > *')).toHaveLength(2),
    )
    const icons = container.querySelectorAll('[data-slot="callout-icon"] > *')
    expect(icons[0]!.getAttribute('class')).toContain('text-destructive')
    expect(info).toHaveAttribute('role', 'note')
    expect(icons[1]!.getAttribute('class')).toContain('text-success')
  })

  it('renders Text with neutral colour, font family, tooltip trigger and copy button', async () => {
    const writeText = vi.fn(async () => {})
    Object.assign(navigator, { clipboard: { writeText } })

    render(
      <Wrapper>
        <TextComponent
          component={
            {
              type: 'Text',
              key: 't',
              content: 'ABC-1',
              color: 'neutral',
              fontFamily: 'mono',
              tooltip: 'Order',
              copyable: true,
              copyMessage: 'Copied!',
            } as TextSchema
          }
        />
      </Wrapper>,
    )

    const paragraph = screen.getByText('ABC-1')
    expect(paragraph.className).toContain('font-mono')
    expect(paragraph.className).toContain('text-foreground')

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith('ABC-1')
    expect(await screen.findByText('Copied!')).toBeInTheDocument()
  })

  it('puts extraAttributes on the entry value and aligns it', () => {
    const { container } = render(
      <Wrapper>
        <TextEntryComponent
          component={
            {
              type: 'TextEntry',
              key: 'title',
              name: 'title',
              label: 'Title',
              state: 'Hello',
              alignment: 'end',
              extraAttributes: { class: 'value-class', 'data-value': '1' },
              extraEntryWrapperAttributes: { 'data-wrapper': '1' },
            } as TextEntrySchema
          }
        />
      </Wrapper>,
    )

    const wrapper = container.querySelector('[data-slot="entry"]')!
    const value = container.querySelector('[data-slot="entry-value"]')!
    expect(wrapper).toHaveAttribute('data-wrapper', '1')
    expect(wrapper).not.toHaveAttribute('data-value')
    expect(value).toHaveAttribute('data-value', '1')
    expect(value.className).toContain('value-class')
    expect(value.className).toContain('text-end')
  })
})
