import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionRunner, actionEndpoint } from '../src/actions'
import type * as Http from '../src/http'
import {
  actionFormComponent,
  actionPath,
  isModalSubmitVisible,
  nestedActionContext,
  reportWizardProgress,
  wizardProgressStore,
} from '../src/modal-actions'
import type { ActionSchema } from '../src/schema/actions'

interface Call {
  url: string
  data: Record<string, unknown>
  success: (props: Record<string, unknown>) => void
}

const calls: Call[] = []
const queries: Record<string, unknown>[] = []

vi.mock('../src/http', async (importOriginal) => {
  const original = await importOriginal<typeof Http>()

  return {
    ...original,
    requestJson: async (_url: string, options: { query?: Record<string, unknown> } = {}) => {
      queries.push(options.query ?? {})

      return {
        name: 'preview',
        width: 'md',
        autofocus: true,
        closeByClickingAway: true,
        closeByEscaping: true,
        closeButton: true,
      }
    },
    inertiaPost: (
      url: string,
      data: Record<string, unknown>,
      options: { onSuccess?: (page: { props: Record<string, unknown> }) => void },
    ) => {
      calls.push({ url, data, success: (props) => options.onSuccess?.({ props }) })
    },
  }
})

const edit: ActionSchema = { type: 'Action', name: 'edit', hasModal: true }
const preview: ActionSchema = { type: 'Action', name: 'preview', hasModal: true }

describe('nested modal actions', () => {
  beforeEach(() => {
    calls.length = 0
    queries.length = 0
  })

  it('addresses an action by its path from the root action', () => {
    const context = nestedActionContext({ token: 't', component: 'table', record: 3 }, edit)

    expect(context.parents).toEqual(['edit'])
    expect(context.record).toBe(3)
    expect(actionPath(preview, context)).toBe('edit>preview')
    expect(actionPath(preview, nestedActionContext(context, preview))).toBe('edit>preview>preview')
    expect(actionPath(edit, { token: 't' })).toBe('edit')
  })

  it('names the form component after the path', () => {
    expect(actionFormComponent(edit, { token: 't' })).toBe('action:edit')
    expect(actionFormComponent(edit, { token: 't', component: 'page' })).toBe('action:edit')
    expect(
      actionFormComponent(preview, { token: 't', component: 'table', parents: ['edit'] }),
    ).toBe('action:table.edit>preview')
  })

  it('opens and runs a nested action by its path', async () => {
    const runner = new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })
    const context = { token: 't', parents: ['edit'] }

    await runner.openModal(preview, context)
    runner.execute(preview, context, {}, { password: 'secret' })

    expect(queries[0]?.action).toBe('edit>preview')
    expect(calls[0]?.data.action).toBe('edit>preview')
    expect(calls[0]?.data.confirmPassword).toBe('secret')
  })

  it('closes the parent modals when the nested action cancels them', async () => {
    const runner = new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })

    await runner.openModal(edit, { token: 't' })
    await runner.openModal(preview, { token: 't', parents: ['edit'] })
    expect(runner.state.modals).toHaveLength(2)

    runner.execute(preview, { token: 't', parents: ['edit'] })
    calls[0]?.success({
      flash: { alfakitAction: { name: 'preview', status: 'success', cancelParentActions: true } },
    })

    expect(runner.state.modals).toHaveLength(0)
  })

  it('keeps the parent modal open by default', async () => {
    const runner = new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })

    await runner.openModal(edit, { token: 't' })
    await runner.openModal(preview, { token: 't', parents: ['edit'] })

    runner.execute(preview, { token: 't', parents: ['edit'] })
    calls[0]?.success({ flash: { alfakitAction: { name: 'preview', status: 'success' } } })

    expect(runner.state.modals.map((modal) => modal.action.name)).toEqual(['edit'])
  })

  it('omits an empty password', () => {
    const runner = new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })

    runner.execute(edit, { token: 't' })

    expect(calls[0]?.data.confirmPassword).toBeUndefined()
  })
})

describe('actionEndpoint', () => {
  it('sends the page query string with "all records" selections only', () => {
    expect(
      actionEndpoint('/actions', { allRecords: true }, '?activeTab=draft&filters[a][value]=1'),
    ).toBe('/actions?activeTab=draft&filters[a][value]=1')
    expect(actionEndpoint('/actions', { allRecords: false }, '?activeTab=draft')).toBe('/actions')
    expect(actionEndpoint('/actions', { allRecords: true }, '')).toBe('/actions')
    expect(actionEndpoint('/actions?x=1', { allRecords: true }, '?tab=a')).toBe(
      '/actions?x=1&tab=a',
    )
  })
})

describe('wizard progress', () => {
  it('shows the submit button on the last step of a wizard only', () => {
    const owner = {}

    expect(isModalSubmitVisible({ wizard: true }, wizardProgressStore(owner).get())).toBe(true)

    reportWizardProgress(owner, 0, 3)
    expect(isModalSubmitVisible({ wizard: true }, wizardProgressStore(owner).get())).toBe(false)

    reportWizardProgress(owner, 2, 3)
    expect(isModalSubmitVisible({ wizard: true }, wizardProgressStore(owner).get())).toBe(true)
    expect(isModalSubmitVisible({}, { step: 0, count: 3 })).toBe(true)
  })

  it('ignores reports without an owner', () => {
    expect(() => reportWizardProgress(null, 1, 2)).not.toThrow()
  })
})
