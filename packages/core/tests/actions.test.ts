import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ActionRunner,
  bindsKeyBindings,
  flattenActionGroup,
  iconButtonSize,
  isActionLoading,
  isActionProcessing,
  parseDropdownPlacement,
  resolveActionSize,
} from '../src/actions'
import type * as Http from '../src/http'
import type { ActionSchema } from '../src/schema/actions'
import { isField, type SchemaComponent } from '../src/schema/components'

const calls: { url: string; finish: () => void }[] = []
const jsonCalls: { url: string; body: Record<string, unknown>; query?: Record<string, unknown> }[] =
  []

vi.mock('../src/http', async (importOriginal) => {
  const original = await importOriginal<typeof Http>()

  return {
    ...original,
    requestJson: async (
      url: string,
      options: { body?: Record<string, unknown>; query?: Record<string, unknown> } = {},
    ) => {
      jsonCalls.push({ url, body: options.body ?? {}, query: options.query })

      return { result: 'ok' }
    },
    inertiaPost: (url: string, _data: unknown, options: { onFinish?: () => void }) => {
      calls.push({ url, finish: () => options.onFinish?.() })
    },
  }
})

const save: ActionSchema = { type: 'Action', name: 'save', hasAction: true }

describe('ActionRunner', () => {
  beforeEach(() => {
    calls.length = 0
  })

  it('ignores a second submit while the first is in flight', () => {
    const runner = new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })
    const context = { token: 't' }

    runner.execute(save, context)
    runner.execute(save, context)

    expect(calls).toHaveLength(1)
    expect(runner.isRunning(save, context)).toBe(true)

    calls[0]?.finish()
    runner.execute(save, context)

    expect(calls).toHaveLength(2)
  })

  it('marks only the clicked row as loading or processing, not the same action in every row', () => {
    const row1 = { token: 't', component: 'table', record: 1 }
    const row2 = { token: 't', component: 'table', record: 2 }
    const runner = new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })

    void runner.openModal(save, row1)

    expect(runner.state.loading).toBe('save')
    expect(isActionLoading(runner.state, save, row1)).toBe(true)
    expect(isActionLoading(runner.state, save, row2)).toBe(false)

    const state = {
      loading: null,
      loadingKey: null,
      modals: [{ action: save, context: row1, modal: {}, errors: {}, processing: true }],
    } as unknown as typeof runner.state

    expect(isActionProcessing(state, save, row1)).toBe(true)
    expect(isActionProcessing(state, save, row2)).toBe(false)
  })

  it('runs the same action for different records in parallel', () => {
    const runner = new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })

    runner.execute(save, { token: 't', component: 'table', record: 1 })
    runner.execute(save, { token: 't', component: 'table', record: 2 })

    expect(calls).toHaveLength(2)
  })
})

it('recognises MoneyInput as a field', () => {
  const money = {
    type: 'MoneyInput',
    key: 'price',
    name: 'price',
    statePath: 'price',
  } as unknown as SchemaComponent

  expect(isField(money)).toBe(true)
})

it('sends the all-records selection with JSON actions', async () => {
  const runner = new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })
  jsonCalls.length = 0

  await runner.executeJson(save, { token: 't', component: 'table', records: [], allRecords: true })

  expect(jsonCalls[0]?.body).toMatchObject({ allRecords: 1, bulk: 1 })
})

it('sends the bulk selection when it opens a bulk action modal', async () => {
  const runner = new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })
  const activate: ActionSchema = { type: 'BulkAction', name: 'activate', hasAction: true }

  jsonCalls.length = 0
  await runner.openModal(activate, { token: 't', component: 'table', records: [3, 5] })
  expect(jsonCalls[0]?.url).toBe('/modal')
  expect(jsonCalls[0]?.query).toMatchObject({ action: 'activate', bulk: 1, records: [3, 5] })

  jsonCalls.length = 0
  await runner.openModal(activate, {
    token: 't',
    component: 'table',
    records: [],
    allRecords: true,
  })
  expect(jsonCalls[0]?.query).toMatchObject({ bulk: 1, allRecords: 1 })

  jsonCalls.length = 0
  await runner.openModal(save, { token: 't', component: 'table', record: 3 })
  expect(jsonCalls[0]?.query).not.toHaveProperty('bulk', 1)
})

it('binds key bindings only outside record rows', () => {
  const action = { keyBindings: ['mod+s'] }

  expect(bindsKeyBindings(action, {})).toBe(true)
  expect(bindsKeyBindings(action, { record: 5 })).toBe(false)
  expect(bindsKeyBindings({ ...action, disabled: true }, {})).toBe(false)
  expect(bindsKeyBindings({}, {})).toBe(false)
})

it('maps action sizes onto button sizes', () => {
  expect(resolveActionSize(undefined, 'sm')).toBe('sm')
  expect(resolveActionSize('md', 'sm')).toBe('default')
  expect(resolveActionSize('xl')).toBe('lg')
  expect(resolveActionSize('xs')).toBe('xs')
  expect(iconButtonSize('xs')).toBe('icon-xs')
  expect(iconButtonSize('lg')).toBe('icon')
})

it('parses dropdown placements', () => {
  expect(parseDropdownPlacement(undefined)).toEqual({ side: 'bottom', align: 'end' })
  expect(parseDropdownPlacement('top-start')).toEqual({ side: 'top', align: 'start' })
  expect(parseDropdownPlacement('left')).toEqual({ side: 'left', align: 'center' })
  expect(parseDropdownPlacement('nonsense')).toEqual({ side: 'bottom', align: 'end' })
})

it('flattens nested action groups', () => {
  const edit: ActionSchema = { type: 'Action', name: 'edit' }

  expect(
    flattenActionGroup([
      save,
      { type: 'ActionGroup', actions: [edit, { type: 'ActionGroup', actions: [] }] },
    ]).map((action) => action.name),
  ).toEqual(['save', 'edit'])
})
