import { afterEach, describe, expect, it, vi } from 'vitest'
import { FormStore } from '../src/form'
import type { SchemaComponent } from '../src/schema/components'

const steps: SchemaComponent[] = [
  {
    type: 'Group',
    key: 'account',
    schema: [{ type: 'TextInput', key: 'name', name: 'name', statePath: 'name' }],
  } as SchemaComponent,
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('halted wizard step', () => {
  it('stays on the step, keeps errors and shows the notifications', async () => {
    const onNotifications = vi.fn()
    const onError = vi.fn()
    const store = new FormStore(
      { components: steps, state: { name: 'x' } },
      {
        token: 't',
        component: 'form',
        validateUrl: 'https://app.test/validate',
        onNotifications,
        onError,
      },
    )
    store.setErrors({ name: ['Kept'] })

    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              halted: true,
              notifications: [{ id: 'n1', title: 'Seats are full', status: 'warning' }],
            }),
            { status: 200 },
          ),
      ),
    )

    await expect(store.validateStep('account', ['name'])).resolves.toBe(false)
    expect(onNotifications).toHaveBeenCalledWith([
      { id: 'n1', title: 'Seats are full', status: 'warning' },
    ])
    expect(onError).not.toHaveBeenCalled()
    expect(store.state.errors).toEqual({ name: ['Kept'] })
  })

  it('does not call onNotifications for a halt without notifications', async () => {
    const onNotifications = vi.fn()
    const store = new FormStore(
      { components: steps, state: {} },
      { token: 't', component: 'form', validateUrl: 'https://app.test/validate', onNotifications },
    )

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ halted: true }), { status: 200 })),
    )

    await expect(store.validateStep('account', ['name'])).resolves.toBe(false)
    expect(onNotifications).not.toHaveBeenCalled()
  })
})
