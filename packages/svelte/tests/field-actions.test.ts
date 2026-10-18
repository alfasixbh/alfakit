import { FormStore, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FormHarness from './FormHarness.svelte'
import Wrapper from './Wrapper.svelte'

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

afterEach(() => vi.unstubAllGlobals())

describe('field actions', () => {
  it('renders affix and hint actions and runs them with the form state', async () => {
    const bodies: Array<Record<string, unknown>> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)

        return new Response(
          JSON.stringify({ status: 'success', form: { components: [], state: { slug: 'done' } } }),
          { status: 200 },
        )
      }),
    )

    const store = new FormStore(
      {
        components: [
          text('slug', {
            suffixActions: [
              { type: 'Action', name: 'generate', label: 'Generate', hasAction: true },
            ],
            hintActions: [{ type: 'Action', name: 'help', label: 'Help', hasAction: true }],
          }),
        ],
        state: { slug: 'old' },
      },
      { token: 't', component: 'form' },
    )
    const { container } = render(Wrapper, { props: { component: FormHarness, props: { store } } })

    const affix = container.querySelector('[data-slot="field-affix-actions"]')!
    expect(affix).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Generate' }))

    await waitFor(() => expect(store.getValue('slug')).toBe('done'))
    expect(bodies[0]).toMatchObject({
      component: 'field:form::slug',
      action: 'generate',
      state: { slug: 'old' },
    })
  })
})
