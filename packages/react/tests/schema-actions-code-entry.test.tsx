import { FormStore, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FormattedText } from '../src/components/entries/text-entry'
import { FormProvider, useFormState } from '../src/components/form/form-context'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { Wrapper } from './mocks'

function LiveForm() {
  const state = useFormState()

  return <SchemaRenderer components={state.components} />
}

const embeddedComponents = () =>
  [
    {
      type: 'Callout',
      key: 'tip',
      heading: 'Tip',
      actions: [{ type: 'Action', name: 'pay', label: 'Pay', hasAction: true }],
      controls: [
        { action: { type: 'Action', name: 'dismiss', label: 'Dismiss', hasAction: true } },
      ],
      footer: [{ action: { type: 'Action', name: 'later', label: 'Later', hasAction: true } }],
    },
    {
      type: 'EmptyState',
      key: 'nothing',
      heading: 'Nothing',
      actions: [{ type: 'Action', name: 'create', label: 'Create', hasAction: true }],
    },
    {
      // A wizard's submitAction(Action) on its last step (W-S2-09).
      type: 'Wizard',
      key: 'checkout',
      startStep: 1,
      schema: [{ type: 'Step', key: 'pay-step', label: 'Pay', schema: [] }],
      submitAction: { type: 'Action', name: 'placeOrder', label: 'Place order', hasAction: true },
    },
  ] as unknown as SchemaComponent[]

const embeddedCases = [
  ['Pay', 'tip', 'pay'],
  ['Dismiss', 'tip', 'dismiss'],
  ['Later', 'tip', 'later'],
  ['Create', 'nothing', 'create'],
  ['Place order', 'checkout', 'placeOrder'],
] as const

afterEach(() => vi.unstubAllGlobals())

const actionsComponent = (extra: Record<string, unknown> = {}) =>
  ({
    type: 'Actions',
    key: 'actions-0',
    actions: [
      { type: 'Action', name: 'star', label: 'Star', hasAction: true },
      { type: 'Action', name: 'reset', label: 'Reset', hasAction: true },
    ],
    ...extra,
  }) as SchemaComponent

describe('Actions schema component', () => {
  it('renders a row of buttons with alignment and full width', () => {
    const { container } = render(
      <Wrapper>
        <SchemaRenderer
          components={[
            actionsComponent({ alignment: 'center', fullWidth: true, verticalAlignment: 'end' }),
          ]}
        />
      </Wrapper>,
    )

    const wrapper = container.querySelector('[data-slot="schema-actions"]')!
    const list = wrapper.querySelector('[data-slot="actions"]')!

    expect(wrapper.className).toMatch(/justify-end/)
    expect(list.className).toMatch(/justify-center/)
    expect(list.className).toMatch(/\[&>\*\]:flex-1/)
    expect(screen.getByRole('button', { name: 'Star' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })

  it('runs its actions in the field context with the form state', async () => {
    const bodies: Array<Record<string, unknown>> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>)

        return new Response(
          JSON.stringify({
            status: 'success',
            form: {
              partial: true,
              patches: [],
              fingerprints: { '': 'root' },
              state: { rating: 5 },
              partialState: true,
            },
          }),
          { status: 200 },
        )
      }),
    )

    const store = new FormStore(
      { components: [actionsComponent()], state: { rating: 1 }, fingerprints: { '': 'root' } },
      { token: 't', component: 'form', refreshUrl: '/r' },
    )

    render(
      <Wrapper>
        <FormProvider store={store}>
          <LiveForm />
        </FormProvider>
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Star' }))

    await waitFor(() => expect(store.getValue('rating')).toBe(5))
    expect(bodies[0]).toMatchObject({
      component: 'field:form::actions-0',
      action: 'star',
      state: { rating: 1 },
    })
  })
})

describe('callout, empty state and mixed-content actions in a form', () => {
  it.each(embeddedCases)(
    'runs %s as a field action of its component with the form state',
    async (label, key, action) => {
      const bodies: Array<Record<string, unknown>> = []
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, init?: RequestInit) => {
          bodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>)

          return new Response(
            JSON.stringify({
              status: 'success',
              form: { components: embeddedComponents(), state: { title: 'paid' } },
            }),
            { status: 200 },
          )
        }),
      )

      const store = new FormStore(
        { components: embeddedComponents(), state: { title: 'x' } },
        { token: 't', component: 'form' },
      )

      render(
        <Wrapper>
          <FormProvider store={store}>
            <LiveForm />
          </FormProvider>
        </Wrapper>,
      )

      fireEvent.click(screen.getByRole('button', { name: label }))

      await waitFor(() => expect(store.getValue('title')).toBe('paid'))
      expect(bodies[0]).toMatchObject({
        component: `field:form::${key}`,
        action,
        state: { title: 'x' },
      })
    },
  )
})

describe('CodeEntry', () => {
  it('highlights the code and copies it', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const { container } = render(
      <Wrapper>
        <SchemaRenderer
          components={[
            {
              type: 'CodeEntry',
              key: 'payload',
              name: 'payload',
              label: 'Payload',
              state: '{\n  "a": 1\n}',
              grammar: 'json',
              lightTheme: 'github-light',
              darkTheme: 'dracula',
              copyable: true,
              copyMessage: 'Code copied',
            } as SchemaComponent,
          ]}
        />
      </Wrapper>,
    )

    const pre = container.querySelector('[data-slot="code-entry"]')!

    expect(pre.getAttribute('dir')).toBe('ltr')
    expect(pre.getAttribute('data-light-theme')).toBe('github-light')
    expect(pre.getAttribute('data-dark-theme')).toBe('dracula')
    expect(pre.textContent).toBe('{\n  "a": 1\n}')
    // The key and the number are coloured tokens.
    expect(pre.querySelectorAll('span').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Code copied'))
    expect(writeText).toHaveBeenCalledWith('{\n  "a": 1\n}')
  })

  it('shows the placeholder without state', () => {
    render(
      <Wrapper>
        <SchemaRenderer
          components={[
            {
              type: 'CodeEntry',
              key: 'payload',
              name: 'payload',
              label: 'Payload',
              placeholder: 'No payload',
            } as SchemaComponent,
          ]}
        />
      </Wrapper>,
    )

    expect(screen.getByText('No payload')).toBeInTheDocument()
  })
})

describe('entry item links and image alt text', () => {
  it('links each item of a relationship list to its own url', () => {
    render(
      <Wrapper>
        <FormattedText
          value={['Laravel', 'PHP']}
          schema={{ badge: true, itemUrls: ['/tags/1', '/tags/2'] }}
        />
      </Wrapper>,
    )

    expect(screen.getByRole('link', { name: 'Laravel' })).toHaveAttribute('href', '/tags/1')
    expect(screen.getByRole('link', { name: 'PHP' })).toHaveAttribute('href', '/tags/2')
  })

  it('gives images their alt text', () => {
    render(
      <Wrapper>
        <SchemaRenderer
          components={[
            {
              type: 'ImageEntry',
              key: 'photos',
              name: 'photos',
              label: 'Photos',
              state: ['/a.jpg', '/b.jpg'],
              alts: ['Front', 'Back'],
            } as SchemaComponent,
            {
              type: 'ImageEntry',
              key: 'avatar',
              name: 'avatar',
              label: 'Avatar',
              state: ['/c.jpg'],
              alt: 'Avatar of Jane',
            } as SchemaComponent,
          ]}
        />
      </Wrapper>,
    )

    expect(screen.getByAltText('Front')).toHaveAttribute('src', '/a.jpg')
    expect(screen.getByAltText('Back')).toHaveAttribute('src', '/b.jpg')
    expect(screen.getByAltText('Avatar of Jane')).toHaveAttribute('src', '/c.jpg')
  })
})
