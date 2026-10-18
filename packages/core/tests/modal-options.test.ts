import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ActionRunner,
  isModalHiddenByChild,
  modalFooterAlignment,
  slideOverSide,
  type OpenModal,
} from '../src/actions'
import type { FormStore } from '../src/form'
import type * as Http from '../src/http'
import {
  NotificationCenter,
  OPEN_DATABASE_NOTIFICATIONS_EVENT,
  onOpenDatabaseNotifications,
  openDatabaseNotifications,
} from '../src/notifications'
import type { ActionModalSchema, ActionSchema } from '../src/schema/actions'

interface Call {
  url: string
  data: Record<string, unknown>
  success: (props: Record<string, unknown>) => void
  error: (errors: Record<string, string>) => void
}

const calls: Call[] = []
const requests: Array<{ url: string; options: Record<string, unknown> }> = []
let modalOverrides: Record<string, Partial<ActionModalSchema>> = {}

vi.mock('../src/http', async (importOriginal) => {
  const original = await importOriginal<typeof Http>()

  return {
    ...original,
    requestJson: async (url: string, options: Record<string, unknown> = {}) => {
      requests.push({ url, options })

      if (url.startsWith('/n')) {
        return { unreadCount: 4 }
      }

      const params = (options.query ?? options.body ?? {}) as { action?: string }

      return {
        name: params.action,
        width: 'md',
        autofocus: true,
        closeByClickingAway: true,
        closeByEscaping: true,
        closeButton: true,
        ...modalOverrides[params.action ?? ''],
      }
    },
    inertiaPost: (
      url: string,
      data: Record<string, unknown>,
      options: {
        onSuccess?: (page: { props: Record<string, unknown> }) => void
        onError?: (errors: Record<string, string>) => void
      },
    ) => {
      calls.push({
        url,
        data,
        success: (props) => options.onSuccess?.({ props }),
        error: (errors) => options.onError?.(errors),
      })
    },
  }
})

const edit: ActionSchema = { type: 'Action', name: 'edit', hasModal: true }
const pick: ActionSchema = { type: 'Action', name: 'pick', hasModal: true }

function fakeForm(values: Record<string, unknown>) {
  const set = vi.fn((path: string, value: unknown) => {
    values[path] = value
  })

  return { form: { state: { values }, setValue: set } as unknown as FormStore, set }
}

function runner() {
  return new ActionRunner({ endpoints: { action: '/actions', modal: '/modal' } })
}

describe('nested parent data', () => {
  beforeEach(() => {
    calls.length = 0
    requests.length = 0
    modalOverrides = {}
  })

  it('sends the parents form state with the nested action and posts the modal request', async () => {
    const actions = runner()
    await actions.openModal(edit, { token: 't' })
    actions.registerModalForm(edit, { token: 't' }, fakeForm({ title: 'Typed' }).form)

    await actions.openModal(pick, { token: 't', parents: ['edit'] })
    actions.execute(pick, { token: 't', parents: ['edit'] })

    expect(requests.at(-1)?.options).toMatchObject({
      method: 'POST',
      body: { action: 'edit>pick', mountedData: [{ title: 'Typed' }] },
    })
    expect(calls[0]?.data.mountedData).toEqual([{ title: 'Typed' }])
  })

  it('sends no parent data when no parent has a form', async () => {
    const actions = runner()
    await actions.openModal(edit, { token: 't' })
    await actions.openModal(pick, { token: 't', parents: ['edit'] })

    expect(requests.at(-1)?.options.query).toMatchObject({ action: 'edit>pick' })
  })

  it('writes fillData() values into the parent form', async () => {
    const actions = runner()
    const { form, set } = fakeForm({ title: 'Typed' })
    await actions.openModal(edit, { token: 't' })
    actions.registerModalForm(edit, { token: 't' }, form)

    actions.execute(pick, { token: 't', parents: ['edit'] })
    calls[0]?.success({
      flash: {
        alfakitAction: {
          name: 'pick',
          status: 'success',
          parentData: [{ name: 'edit', data: { author: 'Ada' } }],
        },
      },
    })

    expect(set).toHaveBeenCalledWith('author', 'Ada', { silent: true })
  })

  it('shows validation errors of a modal-less nested action on its parent', async () => {
    const actions = runner()
    await actions.openModal(edit, { token: 't' })

    actions.execute(pick, { token: 't', parents: ['edit'] })
    calls[0]?.error({ title: 'Required' })

    expect(actions.state.modals[0]?.errors).toEqual({ title: ['Required'] })
  })

  it('submits the parent modal with the arguments of a modal submit button', async () => {
    const actions = runner()
    await actions.openModal(edit, { token: 't' })
    actions.registerModalForm(edit, { token: 't' }, fakeForm({ title: 'Typed' }).form)

    await actions.trigger(
      { type: 'Action', name: 'publish', submitsModal: true, arguments: { publish: true } },
      { token: 't', parents: ['edit'] },
    )

    expect(calls[0]?.data).toMatchObject({
      action: 'edit',
      arguments: { publish: true },
      data: { title: 'Typed' },
    })
  })
})

describe('closing and replacing modals', () => {
  beforeEach(() => {
    calls.length = 0
    requests.length = 0
    modalOverrides = {}
  })

  it('closes the parents when a cancelParentActionsOnClose() modal is dismissed', async () => {
    modalOverrides = { 'edit>pick': { cancelParentActionsOnClose: true } }
    const actions = runner()
    await actions.openModal(edit, { token: 't' })
    await actions.openModal(pick, { token: 't', parents: ['edit'] })

    actions.cancelModal('pick')

    expect(actions.state.modals).toHaveLength(0)
  })

  it('closes parents up to the named one only', async () => {
    const outer: ActionSchema = { type: 'Action', name: 'outer', hasModal: true }
    const actions = runner()
    await actions.openModal(outer, { token: 't' })
    await actions.openModal(edit, { token: 't', parents: ['outer'] })
    await actions.openModal(pick, { token: 't', parents: ['outer', 'edit'] })

    actions.execute(pick, { token: 't', parents: ['outer', 'edit'] })
    calls[0]?.success({
      flash: { alfakitAction: { name: 'pick', status: 'success', cancelParentActions: 'edit' } },
    })

    expect(actions.state.modals.map((modal) => modal.action.name)).toEqual(['outer'])
  })

  it('opens the replacement action after replaceMountedAction()', async () => {
    const actions = runner()
    const open = vi.spyOn(actions, 'openModal')

    actions.execute(edit, { token: 't' })
    calls[0]?.success({
      flash: {
        alfakitAction: {
          name: 'edit',
          status: 'success',
          replaceMountedAction: { name: 'confirm', arguments: { step: 2 }, hasModal: true },
        },
      },
    })

    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'confirm', hasModal: true }),
      expect.objectContaining({ arguments: { step: 2 } }),
    )
  })

  it('hides parents of a modal that does not overlay them', () => {
    const modal = (
      name: string,
      parents: string[],
      overrides: Partial<ActionModalSchema> = {},
    ): OpenModal => ({
      action: { type: 'Action', name },
      context: { token: 't', parents },
      modal: {
        name,
        width: 'md',
        autofocus: true,
        closeByClickingAway: true,
        closeByEscaping: true,
        closeButton: true,
        ...overrides,
      },
      errors: {},
      processing: false,
    })
    // Filament's default: a nested modal hides its parent…
    const modals = [modal('edit', []), modal('pick', ['edit'])]

    expect(isModalHiddenByChild(modals, 0)).toBe(true)
    expect(isModalHiddenByChild(modals, 1)).toBe(false)
    expect(
      isModalHiddenByChild([modals[0]!, modal('pick', ['edit'], { overlayParent: false })], 0),
    ).toBe(true)
    // …unless it opts into `overlayParentActions()`.
    expect(
      isModalHiddenByChild([modals[0]!, modal('pick', ['edit'], { overlayParent: true })], 0),
    ).toBe(false)
    // An unrelated modal does not hide it.
    expect(isModalHiddenByChild([modals[0]!, modal('other', [])], 0)).toBe(false)
  })
})

describe('modal layout helpers', () => {
  it('picks the footer alignment', () => {
    expect(modalFooterAlignment({})).toBe('end')
    expect(modalFooterAlignment({ alignment: 'center' })).toBe('center')
    expect(modalFooterAlignment({ alignment: 'center', footerActionsAlignment: 'between' })).toBe(
      'between',
    )
  })

  it('maps logical slide-over positions to physical sides', () => {
    expect(slideOverSide(undefined, 'ltr')).toBe('right')
    expect(slideOverSide('start', 'ltr')).toBe('left')
    expect(slideOverSide(undefined, 'rtl')).toBe('left')
    expect(slideOverSide('start', 'rtl')).toBe('right')
  })
})

describe('database notifications', () => {
  it('opens the panel programmatically and from actions', async () => {
    const listener = vi.fn()
    const stop = onOpenDatabaseNotifications(listener)

    openDatabaseNotifications()
    await runner().trigger(
      { type: 'Action', name: 'inbox', opensDatabaseNotifications: true },
      { token: 't' },
    )
    stop()
    window.dispatchEvent(new CustomEvent(OPEN_DATABASE_NOTIFICATIONS_EVENT))

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('marks a notification as unread', async () => {
    const center = new NotificationCenter(
      { notifications: '/n', notificationsReadAll: '/nr', notificationsDestroyAll: '/nd' },
      3,
    )
    center.store.set({
      notifications: [{ id: 'a', format: 'alfakit', readAt: '2026-01-01' }],
      unreadCount: 3,
      loading: false,
      hasMore: false,
      page: 1,
    })

    await center.markAsUnread('a')

    expect(requests.at(-1)).toMatchObject({
      url: '/n/a/read',
      options: { method: 'POST', body: { unread: true } },
    })
    expect(center.store.get().notifications[0]?.readAt).toBeNull()
    expect(center.store.get().unreadCount).toBe(4)
  })
})
