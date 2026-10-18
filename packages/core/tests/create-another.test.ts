import { describe, expect, it, vi } from 'vitest'
import { ActionRunner, createAnotherState } from '../src/actions'
import type * as Http from '../src/http'
import type { ActionModalSchema, ActionSchema } from '../src/schema/actions'

type PostOptions = { onSuccess?: (page: unknown) => void; onFinish?: () => void }

const posts: { data: Record<string, unknown>; options: PostOptions }[] = []
let modalResponse: () => ActionModalSchema

vi.mock('../src/http', async (importOriginal) => {
  const original = await importOriginal<typeof Http>()

  return {
    ...original,
    requestJson: async () => modalResponse(),
    inertiaPost: (_url: string, data: Record<string, unknown>, options: PostOptions) => {
      posts.push({ data, options })
    },
  }
})

const create: ActionSchema = { type: 'Action', name: 'create', hasAction: true, hasModal: true }

function modalWith(state: Record<string, unknown>, extra: Partial<ActionModalSchema> = {}) {
  return {
    name: 'create',
    width: 'lg',
    autofocus: true,
    closeByClickingAway: true,
    closeByEscaping: true,
    closeButton: true,
    submitLabel: 'Create',
    createAnotherLabel: 'Create & create another',
    form: { components: [], state },
    ...extra,
  } as ActionModalSchema
}

const flashPage = (closeModal: boolean) => ({
  props: {},
  flash: { alfakitAction: { name: 'create', status: 'success', closeModal } },
})

describe('Create & create another', () => {
  it('sends the another argument and reloads a fresh form, keeping preserved fields', async () => {
    const runner = new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })
    modalResponse = () =>
      modalWith({ name: '', category: null }, { preserveFormData: ['category'] })
    await runner.openModal(create, { token: 't' })

    runner.execute(create, { token: 't' }, { name: 'First', category: 3 }, { createAnother: true })

    expect(posts.at(-1)?.data.arguments).toEqual({ another: true })

    posts.at(-1)?.options.onSuccess?.(flashPage(false))
    await vi.waitFor(() =>
      expect(runner.state.modals[0]?.modal.form?.state).toEqual({ name: '', category: 3 }),
    )
    expect(runner.state.modals).toHaveLength(1)
  })

  it('closes the modal after a plain create', async () => {
    const runner = new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })
    modalResponse = () => modalWith({ name: '' })
    await runner.openModal(create, { token: 't' })

    runner.execute(create, { token: 't' }, { name: 'First' })

    expect(posts.at(-1)?.data.arguments).toBeUndefined()
    posts.at(-1)?.options.onSuccess?.(flashPage(true))
    expect(runner.state.modals).toHaveLength(0)
  })
})

describe('createAnotherState', () => {
  it('keeps nothing, everything or the named fields', () => {
    const fresh = { name: '', category: null }
    const previous = { name: 'A', category: 2 }

    expect(createAnotherState(fresh, previous, undefined)).toEqual(fresh)
    expect(createAnotherState(fresh, previous, true)).toEqual(previous)
    expect(createAnotherState(fresh, previous, ['category'])).toEqual({ name: '', category: 2 })
  })
})
