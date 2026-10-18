import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActionRunner } from '../src/actions'
import {
  actionFormParams,
  fieldActionComponent,
  fieldActionContext,
  isFieldActionContext,
} from '../src/field-actions'
import { FormStore } from '../src/form'
import type { ActionSchema } from '../src/schema/actions'
import type { SchemaComponent } from '../src/schema/components'

const slug = {
  type: 'TextInput',
  key: 'slug',
  name: 'slug',
  statePath: 'slug',
  inputType: 'text',
} as SchemaComponent

const generate: ActionSchema = { type: 'Action', name: 'generate', hasAction: true }
const create: ActionSchema = {
  type: 'Action',
  name: 'createOption',
  hasAction: true,
  hasModal: true,
}

interface Call {
  url: string
  method: string
  body: Record<string, unknown>
}

function stubFetch(respond: (call: Call) => unknown, status = 200): Call[] {
  const calls: Call[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const call = {
        url,
        method: init?.method ?? 'GET',
        body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {},
      }
      calls.push(call)

      const data = respond(call)

      return new Response(JSON.stringify(data), {
        status: (data as { __status?: number }).__status ?? status,
      })
    }),
  )

  return calls
}

const runner = () => new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })

afterEach(() => vi.unstubAllGlobals())

describe('field action context', () => {
  it('addresses the field in its form or infolist', () => {
    const form = new FormStore(
      { components: [slug], state: {} },
      { token: 'form-token', component: 'action:table.edit', record: 7 },
    )

    expect(fieldActionContext({ token: 'page', form, key: 'slug' })).toMatchObject({
      token: 'form-token',
      component: 'field:action:table.edit::slug',
      record: 7,
      form,
    })
    expect(fieldActionContext({ token: 'page', key: 'text-entry-0' }).component).toBe(
      'field:infolist::text-entry-0',
    )
    expect(isFieldActionContext({ component: fieldActionComponent('form', 'a') })).toBe(true)
    expect(isFieldActionContext({ component: 'table' })).toBe(false)
  })

  it('sends the owning form state with the modal form of a field action', () => {
    const form = new FormStore(
      { components: [slug], state: { slug: 'x' } },
      { token: 't', component: 'form' },
    )

    expect(actionFormParams({ component: 'field:form::slug', form })?.()).toEqual({
      ownerState: { slug: 'x' },
    })
    expect(actionFormParams({ component: 'table' })).toBeUndefined()
  })
})

describe('ActionRunner field actions', () => {
  it('posts the form state and merges the refreshed form', async () => {
    const calls = stubFetch(() => ({
      status: 'success',
      result: 'done',
      form: { components: [slug], state: { slug: 'hello-world' } },
    }))

    const form = new FormStore(
      { components: [slug], state: { slug: 'old' } },
      { token: 't', component: 'form' },
    )
    const result = await runner().runField(
      generate,
      fieldActionContext({ token: 't', form, key: 'slug' }),
    )

    expect(result).toBe('done')
    expect(calls[0]).toMatchObject({
      url: '/actions',
      method: 'POST',
      body: { component: 'field:form::slug', action: 'generate', state: { slug: 'old' } },
    })
    expect(form.getValue('slug')).toBe('hello-world')
  })

  it('opens the modal over POST and settles with the result after submit', async () => {
    const calls = stubFetch((call) =>
      call.url === '/modal'
        ? {
            name: 'createOption',
            width: 'md',
            autofocus: true,
            closeByClickingAway: true,
            closeByEscaping: true,
            closeButton: true,
          }
        : { status: 'success', result: 5, form: { components: [slug], state: { slug: '5' } } },
    )

    const form = new FormStore(
      { components: [slug], state: { slug: null } },
      { token: 't', component: 'form' },
    )
    const actions = runner()
    const context = fieldActionContext({ token: 't', form, key: 'slug' })
    const pending = actions.runField(create, context)

    await vi.waitFor(() => expect(actions.state.modals).toHaveLength(1))

    expect(calls[0]).toMatchObject({
      url: '/modal',
      method: 'POST',
      body: { state: { slug: null } },
    })

    // The modal's submit button goes through `execute`.
    actions.execute(create, context, { name: 'Zed' })

    await expect(pending).resolves.toBe(5)
    expect(calls[1]?.body).toMatchObject({ data: { name: 'Zed' }, state: { slug: null } })
    expect(actions.state.modals).toHaveLength(0)
    expect(form.getValue('slug')).toBe('5')
  })

  it('keeps the modal open with validation errors', async () => {
    stubFetch((call) =>
      call.url === '/modal'
        ? { name: 'createOption' }
        : { __status: 422, message: 'Invalid', errors: { name: ['Required'] } },
    )

    const actions = runner()
    const context = fieldActionContext({ token: 't', key: 'slug', schema: 'form' })
    void actions.runField(create, context)

    await vi.waitFor(() => expect(actions.state.modals).toHaveLength(1))
    await actions.executeField(create, context, {})

    expect(actions.state.modals[0]?.errors).toEqual({ name: ['Required'] })
  })

  it('settles with undefined when the modal is closed', async () => {
    stubFetch(() => ({ name: 'createOption' }))

    const actions = runner()
    const pending = actions.runField(
      create,
      fieldActionContext({ token: 't', key: 'slug', schema: 'form' }),
    )

    await vi.waitFor(() => expect(actions.state.modals).toHaveLength(1))
    actions.closeModal('createOption')

    await expect(pending).resolves.toBeUndefined()
  })
})
