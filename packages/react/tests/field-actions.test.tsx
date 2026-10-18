import { FormStore, type SchemaComponent } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FormProvider, useFormState } from '../src/components/form/form-context'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { registry, Wrapper } from './mocks'

const text = (name: string, extra: Record<string, unknown> = {}) =>
  ({
    type: 'TextInput',
    key: name,
    name,
    statePath: name,
    label: name,
    inputType: 'text',
    ...extra,
  }) as SchemaComponent

function LiveForm() {
  const state = useFormState()

  return <SchemaRenderer components={state.components} />
}

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore(
    { components, state, fingerprints: { '': 'root' } },
    { token: 't', component: 'form', refreshUrl: '/r' },
  )

  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <LiveForm />
      </FormProvider>
    </Wrapper>,
  )

  return { store, ...view }
}

function stubFetch(respond: (body: Record<string, unknown>, url: string) => unknown) {
  const bodies: Array<Record<string, unknown>> = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
      bodies.push(body)

      return new Response(JSON.stringify(respond(body, url)), { status: 200 })
    }),
  )

  return bodies
}

afterEach(() => vi.unstubAllGlobals())

describe('field actions', () => {
  it('renders prefix, suffix and hint actions around the control', () => {
    const { container } = renderForm(
      [
        text('slug', {
          prefixActions: [{ type: 'Action', name: 'generate', label: 'Generate', hasAction: true }],
          suffixActions: [{ type: 'Action', name: 'copy', label: 'Copy slug', hasAction: true }],
          hintActions: [{ type: 'Action', name: 'help', label: 'Help', url: '/help' }],
        }),
      ],
      { slug: '' },
    )

    const wrapper = container.querySelector('[data-slot="field-affix-actions"]')!
    const buttons = Array.from(wrapper.querySelectorAll('button')).map((b) => b.textContent)

    expect(buttons).toEqual(['Generate', 'Copy slug'])
    // The control sits between the prefix and suffix actions.
    expect(wrapper.children[1]?.querySelector('input')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Help' })).toBeInTheDocument()
  })

  it('runs a suffix action with the form state and applies the returned form', async () => {
    const bodies = stubFetch(() => ({
      status: 'success',
      form: {
        partial: true,
        patches: [],
        fingerprints: { '': 'root' },
        state: { slug: 'hello-world' },
        partialState: true,
      },
    }))

    const { store } = renderForm(
      [
        text('title'),
        text('slug', {
          suffixActions: [{ type: 'Action', name: 'generate', label: 'Generate', hasAction: true }],
        }),
      ],
      { title: 'Hello World', slug: '' },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))

    await waitFor(() => expect(store.getValue('slug')).toBe('hello-world'))
    expect(bodies[0]).toMatchObject({
      component: 'field:form::slug',
      action: 'generate',
      state: { title: 'Hello World', slug: '' },
      fingerprints: { '': 'root' },
    })
    expect((screen.getByLabelText('slug') as HTMLInputElement).value).toBe('hello-world')
  })

  it('renders hint actions of entries', () => {
    render(
      <Wrapper>
        <SchemaRenderer
          components={[
            {
              type: 'TextEntry',
              key: 'title',
              name: 'title',
              label: 'Title',
              state: 'Hello',
              hintActions: [{ type: 'Action', name: 'copy', label: 'Copy', hasAction: true }],
            } as SchemaComponent,
          ]}
        />
      </Wrapper>,
    )

    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })
})

describe('partial live refresh', () => {
  it('re-renders only the patched components', async () => {
    const renders: string[] = []
    registry.register('Probe', ({ component }: { component: SchemaComponent }) => {
      renders.push(component.key)

      return <span data-probe={component.key}>{String(component.label)}</span>
    })

    stubFetch(() => ({
      partial: true,
      patches: [{ path: '1', component: { type: 'Probe', key: 'b', label: 'B changed' } }],
      fingerprints: { '': 'root' },
      state: {},
      partialState: true,
    }))

    const { store, container } = renderForm(
      [
        { type: 'Probe', key: 'a', label: 'A' } as SchemaComponent,
        { type: 'Probe', key: 'b', label: 'B' } as SchemaComponent,
      ],
      {},
    )

    renders.length = 0

    await act(async () => {
      await store.refresh('x')
    })

    expect(renders).toEqual(['b'])
    expect(container.querySelector('[data-probe="b"]')?.textContent).toBe('B changed')
    expect(container.querySelector('[data-probe="a"]')?.textContent).toBe('A')
  })
})
